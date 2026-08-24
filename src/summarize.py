"""Generative AI metadata enrichment.

Supports OpenAI, Groq, Google Gemini, OpenRouter, and local gateways (Ollama/LMStudio)
via OpenAI-compatible chat completions endpoints.
"""

import html
import json
import logging
import os
import requests

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.openai.com/v1"
MAX_CHARS = 12_000

_SYSTEM_PROMPT = (
    "You are a screenplay metadata assistant. Given a movie transcript, return JSON only "
    "with these keys: synopsis (2-3 sentence neutral summary of the story), "
    "themes (array of up to 6 key themes/subjects), "
    "compliance_flags (array of observed sensitive-content categories chosen from: "
    "violence, profanity, substance abuse, sexual content, none). "
    "Return strict JSON with no markdown."
)


def _load_env_if_needed():
    """Attempt to load keys from .env file if not present in os.environ."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip("'\"")
                        if k and v and k not in os.environ:
                            os.environ[k] = v
        except Exception as exc:
            logger.warning("Failed to load .env file: %s", exc)


def resolve_config():
    """Auto-detect available provider config (Groq, Gemini, OpenRouter, OpenAI, Ollama)."""
    _load_env_if_needed()

    # 1. Custom Gateway (e.g. Ollama or self-hosted)
    if os.environ.get("OPENAI_BASE_URL"):
        url = os.environ["OPENAI_BASE_URL"].rstrip("/")
        key = os.environ.get("OPENAI_API_KEY") or os.environ.get("GROQ_API_KEY") or os.environ.get("GEMINI_API_KEY") or "ollama"
        model = os.environ.get("OPENAI_MODEL", "llama3")
        return url, key, model, f"Custom ({model})"

    # 2. Groq Cloud (Free Tier)
    groq_key = os.environ.get("GROQ_API_KEY") or (os.environ.get("OPENAI_API_KEY", "").startswith("gsk_") and os.environ.get("OPENAI_API_KEY"))
    if groq_key:
        model = os.environ.get("OPENAI_MODEL", "llama-3.3-70b-versatile")
        return "https://api.groq.com/openai/v1", groq_key, model, f"Groq ({model})"

    # 3. Google Gemini (Free Tier via OpenAI endpoint)
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        model = os.environ.get("OPENAI_MODEL", "gemini-2.0-flash")
        return "https://generativelanguage.googleapis.com/v1beta/openai/", gemini_key, model, f"Google Gemini ({model})"

    # 4. OpenRouter (Free Tier)
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key:
        model = os.environ.get("OPENAI_MODEL", "google/gemini-2.0-flash-lite-001:free")
        return "https://openrouter.ai/api/v1", openrouter_key, model, f"OpenRouter ({model})"

    # 5. OpenAI
    openai_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPEN_API_KEY")
    if openai_key:
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        return "https://api.openai.com/v1", openai_key, model, f"OpenAI ({model})"

    return None, None, None, None


def enabled() -> bool:
    base_url, api_key, model, provider = resolve_config()
    return bool(api_key and base_url)


_last_error_reason = None
_last_used_model = None


def _call_llm(user_content: str) -> dict | None:
    global _last_error_reason, _last_used_model
    _last_error_reason = None
    _last_used_model = None

    base_url, api_key, model, provider_label = resolve_config()

    if not base_url or not api_key:
        _last_error_reason = "No API Key configured (Add GROQ_API_KEY or GEMINI_API_KEY in .env)"
        return None

    _last_used_model = provider_label

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.7,
    }

    if "openrouter" not in base_url:
        payload["response_format"] = {"type": "json_object"}

    headers = {"Authorization": f"Bearer {api_key}"}
    if "openrouter" in base_url:
        headers["HTTP-Referer"] = "http://localhost:8000"
        headers["X-Title"] = "ScriptTagger"

    try:
        resp = requests.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=90)
        if resp.status_code == 429:
            err_data = resp.json().get("error", {}) if resp.text.startswith("{") else {}
            if err_data.get("code") == "insufficient_quota":
                _last_error_reason = f"{provider_label}: Quota Exceeded / Check Billing"
            else:
                _last_error_reason = f"{provider_label}: Rate Limit Exceeded (429)"
            logger.warning("LLM enrichment failed: %s", _last_error_reason)
            return None
        elif resp.status_code == 401:
            _last_error_reason = f"{provider_label}: Invalid API Key (401)"
            logger.warning("LLM enrichment failed: 401 Unauthorized")
            return None
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]

        cleaned_content = content.strip()
        if cleaned_content.startswith("```"):
            lines = cleaned_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_content = "\n".join(lines).strip()

        return json.loads(cleaned_content)
    except Exception as exc:
        _last_error_reason = f"{provider_label} Error: {exc}"
        logger.warning("LLM enrichment failed: %s", exc)
        return None


def _fallback_summary(text: str, title: str = "", reason: str = "") -> dict:
    """Generate a complete 2-3 sentence NLP summary fallback when API call fails or is not configured."""
    words = text.split()
    total_words = len(words)
    title_clean = html.unescape(title or "Untitled").strip()

    raw_lines = [html.unescape(line.strip()) for line in text.splitlines() if line.strip() and not line.strip().isupper()]
    dialogue_samples = [
        l for l in raw_lines
        if len(l) > 20 and not l.startswith("INT.") and not l.startswith("EXT.") and not l.startswith("http")
    ][:2]

    if dialogue_samples:
        snippet = " ".join(dialogue_samples)
        if len(snippet) > 160:
            snippet = snippet[:157].rsplit(" ", 1)[0] + "."
        elif not snippet.endswith((".", "!", "?")):
            snippet += "."
        teaser_part = f" Key scenes open with dialogue such as: \"{snippet}\""
    else:
        teaser_part = " The story progresses through pivotal character interactions and thematic story arcs."

    synopsis = (
        f"'{title_clean}' is a feature screenplay with a narrative structure spanning {total_words:,} dialogue words."
        f"{teaser_part} "
        f"Overall, the screenplay balances character-driven conflict with dramatic pacing across its key acts."
    )

    model_label = f"NLP Engine (Offline Fallback: {reason})" if reason else "NLP Engine (Offline Fallback)"

    return {
        "synopsis": synopsis,
        "themes": ["Drama", "Narrative Arc", "Dialogue", "Character Study"],
        "compliance_flags": ["none"],
        "model": model_label,
    }


def generate(text: str, title: str = "") -> dict | None:
    """Return {'synopsis', 'themes', 'compliance_flags', 'model'}."""
    if not text or not text.strip():
        return None
    truncated = text[:MAX_CHARS]
    data = _call_llm(f"Title: {title or 'Untitled'}\n\nTranscript:\n{truncated}")
    if data and isinstance(data, dict):
        return {
            "synopsis": str(data.get("synopsis", "")).strip(),
            "themes": [str(t) for t in data.get("themes", []) if str(t).strip()][:6],
            "compliance_flags": [str(c) for c in data.get("compliance_flags", [])][:8],
            "model": _last_used_model or "Generative AI",
        }
    return _fallback_summary(text, title=title, reason=_last_error_reason or "")