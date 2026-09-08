"""Semantic refinement for script topics and keywords."""

import logging
import re

from src import summarize

logger = logging.getLogger(__name__)
_BAD = re.compile(r"\b(?:org|organization|person|location|speaker|scene|screenplay|camera|int|ext|day|night|continued|cut|fade|draft|revision|unknown|n/?a)\b", re.IGNORECASE)


def _sample(text: str, limit: int = 12000) -> str:
    text = str(text or "")
    if len(text) <= limit:
        return text
    part = limit // 3
    middle = len(text) // 2
    return "\n...\n".join((text[:part], text[middle - part // 2:middle + part // 2], text[-part:]))


def _clean_items(value, limit: int) -> list[dict]:
    if not isinstance(value, list):
        return []
    out, seen = [], set()
    for item in value:
        if isinstance(item, str):
            phrase, confidence = item, 0.7
        elif isinstance(item, dict):
            phrase = item.get("keyword") or item.get("topic") or item.get("name") or item.get("text")
            confidence = item.get("confidence", item.get("score", 0.7))
        else:
            continue
        phrase = re.sub(r"\s+", " ", str(phrase or "")).strip(" .,:;\"'")
        if not phrase or len(phrase) < 3 or len(phrase) > 80 or _BAD.search(phrase):
            continue
        key = phrase.casefold()
        if key in seen:
            continue
        seen.add(key)
        try:
            confidence = max(0.0, min(1.0, float(confidence)))
        except (TypeError, ValueError):
            confidence = 0.7
        out.append({"keyword": phrase, "score": round(confidence, 3)})
        if len(out) >= limit:
            break
    return out


def resolve(script_text: str, candidates: list[dict], title: str = "", summary: dict | None = None, top_n: int = 25) -> tuple[list[dict], list[dict], dict]:
    """Return semantic topics, semantic keywords, and resolution metadata."""
    meta = {"enabled": False, "applied": False, "reason": "LLM unavailable"}
    if not summarize.enabled():
        meta["reason"] = "No LLM API key configured"
        return candidates, list(candidates), meta
    candidate_text = ", ".join(str(x.get("keyword", "")) for x in (candidates or [])[:50])
    synopsis = (summary or {}).get("synopsis", "") if isinstance(summary, dict) else ""
    prompt = f"""You are refining metadata for a movie screenplay.
Return JSON only with exactly two arrays: topics and keywords.
Each array item must be an object with keyword (2-5 words) and confidence (0 to 1).
topics are 5-12 broad narrative themes. keywords are 8-25 concrete concepts, events,
objects, or settings useful for search. Use whole-script context, not capitalization.
Exclude character names, organizations, proper-name-only locations, speaker labels,
OCR garbage, camera directions, generic dialogue words, and duplicate phrases.
Title: {title or 'Untitled'}
Synopsis: {_sample(synopsis, 2500)}
Extractive candidates: {candidate_text}
Script sample:
{_sample(script_text)}"""
    try:
        data = summarize._call_llm(prompt)
        topics = _clean_items(data.get("topics") if isinstance(data, dict) else None, min(12, top_n))
        keywords = _clean_items(data.get("keywords") if isinstance(data, dict) else None, top_n)
        if topics or keywords:
            if not topics:
                topics = keywords[:min(12, top_n)]
            if not keywords:
                keywords = topics[:]
            meta.update({"enabled": True, "applied": True, "provider": getattr(summarize, "_last_used_model", None), "topic_count": len(topics), "keyword_count": len(keywords)})
            return topics, keywords, meta
        meta["reason"] = "LLM returned no valid topics or keywords"
    except Exception as exc:
        logger.warning("Semantic topic refinement failed: %s", exc)
        meta["reason"] = str(exc)[:160]
    return candidates, list(candidates), meta
