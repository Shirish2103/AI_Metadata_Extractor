"""Generative AI metadata enrichment.

Supports Google Gemini (via native generateContent endpoint with automatic model fallback)
and OpenAI chat completions.
"""

import html
import json
import logging
import os
import requests

logger = logging.getLogger(__name__)


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
    """Auto-detect available provider config for Google Gemini or OpenAI."""
    _load_env_if_needed()

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        return "gemini", gemini_key, "Google Gemini"

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        return "openai", openai_key, "OpenAI"

    return None, None, None


def enabled() -> bool:
    provider, api_key, _ = resolve_config()
    return bool(provider and api_key)


_last_error_reason = None
_last_used_model = None


def _call_gemini(api_key: str, prompt: str) -> tuple[dict | None, str | None, str | None]:
    """Call Google Gemini REST API with model fallback sequence."""
    # List of active, verified Gemini models to try in order
    models = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3-flash-preview"]
    last_err = None

    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json",
            },
        }
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                data_json = resp.json()
                text = data_json["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text), f"Google Gemini ({m})", None
            elif resp.status_code in (429, 503):
                err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                logger.warning("Gemini model %s unavailable (%s), trying fallback model...", m, err_msg[:80])
                last_err = f"{m}: {err_msg[:80]}"
                continue
            else:
                err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
                logger.warning("Gemini model %s failed: %s", m, err_msg[:80])
                last_err = f"{m}: {err_msg[:80]}"
        except Exception as exc:
            logger.warning("Gemini model %s exception: %s", m, exc)
            last_err = str(exc)

    return None, None, last_err


def _call_openai(api_key: str, prompt: str) -> tuple[dict | None, str | None, str | None]:
    """Call OpenAI chat completions API."""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        if resp.status_code == 200:
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(content), "OpenAI (gpt-4o-mini)", None
        err_msg = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code}")
        return None, None, f"OpenAI: {err_msg[:80]}"
    except Exception as exc:
        return None, None, str(exc)


def _call_llm(prompt: str) -> dict | None:
    global _last_error_reason, _last_used_model
    _last_error_reason = None
    _last_used_model = None

    provider, api_key, label = resolve_config()
    if not provider or not api_key:
        _last_error_reason = "No API Key configured (Add GEMINI_API_KEY in .env)"
        return None

    if provider == "gemini":
        data, model_name, err = _call_gemini(api_key, prompt)
    elif provider == "openai":
        data, model_name, err = _call_openai(api_key, prompt)
    else:
        data, model_name, err = None, None, f"Unknown provider {provider}"

    if data:
        _last_used_model = model_name
        return data

    _last_error_reason = err
    return None


def _fallback_summary(text: str, title: str = "", characters: list[str] | None = None, reason: str = "") -> dict:
    """Generate a structured summary fallback when API call fails or is not configured."""
    words = text.split()
    total_words = len(words)
    title_clean = html.unescape(title or "Untitled").strip()

    raw_lines = [html.unescape(line.strip()) for line in text.splitlines() if line.strip() and not line.strip().isupper()]
    dialogue_samples = [
        l for l in raw_lines
        if len(l) > 20 and not l.startswith("INT.") and not l.startswith("EXT.") and not l.startswith("[") and not l.startswith("http")
    ][:2]

    if dialogue_samples:
        snippet = " ".join(dialogue_samples)
        if len(snippet) > 160:
            snippet = snippet[:157].rsplit(" ", 1)[0] + "."
        elif not snippet.endswith((".", "!", "?")):
            snippet += "."
        teaser_part = f" Key scenes open with dialogue such as: \"{snippet}\""
    else:
        teaser_part = " The story progresses through pivotal character interactions and dramatic scenes."

    synopsis = (
        f"'{title_clean}' is a feature screenplay with a narrative structure spanning {total_words:,} dialogue words."
        f"{teaser_part} "
        f"Overall, the screenplay balances character-driven conflict with dramatic pacing across its key acts."
    )

    top_chars = [c for c in (characters or []) if c][:4]
    char_summary = f"The narrative centers around {' and '.join(top_chars) if top_chars else 'the primary protagonists'} as they navigate evolving conflicts."

    model_label = f"NLP Engine (Offline Fallback: {reason})" if reason else "NLP Engine (Offline Fallback)"

    return {
        "logline": f"A dramatic screenplay following characters navigating personal and external crises in '{title_clean}'.",
        "synopsis": synopsis,
        "themes": ["Drama", "Narrative Arc", "Conflict", "Character Study"],
        "compliance_flags": ["none"],
        "characters": char_summary,
        "model": model_label,
    }


def generate(text: str, title: str = "", characters: list[str] | None = None) -> dict | None:
    """Return {'logline', 'synopsis', 'themes', 'compliance_flags', 'characters', 'model'}."""
    if not text or not text.strip():
        return None

    # Sample across Act 1, Act 2, and Act 3 so the LLM understands the whole narrative arc
    if len(text) > 40000:
        part_len = 13000
        mid = len(text) // 2
        sampled_text = (
            text[:part_len]
            + "\n\n... [ACT 2: RISING ACTION & CONFLICT] ...\n\n"
            + text[mid - part_len // 2 : mid + part_len // 2]
            + "\n\n... [ACT 3: CLIMAX & RESOLUTION] ...\n\n"
            + text[-part_len:]
        )
    else:
        sampled_text = text

    char_context = ""
    if characters:
        clean_chars = [str(c).strip() for c in characters if str(c).strip()][:8]
        if clean_chars:
            char_context = f"Key Screenplay Characters: {', '.join(clean_chars)}\n"

    prompt = (
        "You are an expert film analyst, narrative dramaturg, and screenplay metadata assistant.\n"
        "Analyze the provided screenplay text (spanning setup, rising conflict, and resolution) and return "
        "a valid JSON object with these exact keys:\n"
        "- logline: A punchy, compelling 1-sentence cinematic logline highlighting the protagonist, the central conflict, and the stakes.\n"
        "- synopsis: A comprehensive, engaging 3-5 sentence neutral summary of the entire film narrative arc from opening setup, to climax, to resolution. Accurately reflect what actually happens in the story.\n"
        "- themes: An array of 4 to 6 core cinematic, psychological, or emotional themes (e.g. [\"Identity and Deception\", \"Sacrifice\"]).\n"
        "- compliance_flags: An array of sensitive content categories observed in the text, chosen strictly from: "
        "\"violence\", \"profanity\", \"substance abuse\", \"sexual content\", \"none\".\n"
        "- characters: A 1-2 sentence overview of the central character arcs and key interpersonal dynamics.\n\n"
        f"Movie Title: {title or 'Untitled'}\n"
        f"{char_context}"
        f"Screenplay Content:\n{sampled_text}"
    )

    data = _call_llm(prompt)
    if data and isinstance(data, dict):
        raw_flags = [str(c).lower().strip() for c in data.get("compliance_flags", []) if str(c).strip()]
        # If real compliance flags exist, remove "none"
        if any(f != "none" for f in raw_flags):
            flags = [f for f in raw_flags if f != "none"][:6]
        else:
            flags = ["none"]

        char_notes = data.get("characters", "")
        if isinstance(char_notes, (list, dict)):
            char_notes = json.dumps(char_notes)

        return {
            "logline": str(data.get("logline", "")).strip(),
            "synopsis": str(data.get("synopsis", "")).strip(),
            "themes": [str(t).strip() for t in data.get("themes", []) if str(t).strip()][:6],
            "compliance_flags": flags,
            "characters": str(char_notes).strip(),
            "model": _last_used_model or "Generative AI",
        }
    return _fallback_summary(text, title=title, characters=characters, reason=_last_error_reason or "")