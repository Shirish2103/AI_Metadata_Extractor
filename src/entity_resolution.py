"""Script-context semantic resolution for NER candidates.

This is intentionally a second pass: deterministic screenplay parsing and NER
produce candidates first, then an optional LLM resolves ambiguous types, aliases
and obvious screenplay noise using nearby script context.
"""

import re
from typing import Any

from src import ner, summarize


ALLOWED_TYPES = {"PERSON", "LOCATION", "ORGANIZATION", "OBJECT", "OTHER"}
MAX_CANDIDATES = 90
RESOLUTION_VERSION = 2
_NOISE = re.compile(r"^(?:[A-Z]+[- ]?){2,}$")


def _context_for(name: str, script_text: str, limit: int = 260) -> str:
    """Return up to two compact excerpts containing an entity mention."""
    if not name or not script_text:
        return ""
    pattern = re.compile(r".{0,100}\b" + re.escape(name) + r"\b.{0,130}", re.IGNORECASE)
    excerpts: list[str] = []
    for match in pattern.finditer(script_text):
        excerpt = " ".join(match.group(0).split())
        if excerpt and excerpt not in excerpts:
            excerpts.append(excerpt[:limit])
        if len(excerpts) == 2:
            break
    return " / ".join(excerpts)


def _candidate_payload(entities: list[dict], script_text: str) -> list[dict[str, Any]]:
    ranked = sorted(enumerate(entities), key=lambda item: -int(item[1].get("count", 0)))[:MAX_CANDIDATES]
    return [
        {
            "id": index,
            "name": str(entity.get("text") or entity.get("name") or ""),
            "current_type": str(entity.get("type") or entity.get("label") or "OTHER"),
            "speaker": bool(entity.get("is_speaker")),
            "mentions": int(entity.get("count", 0)),
            "context": _context_for(str(entity.get("text") or entity.get("name") or ""), script_text),
        }
        for index, entity in ranked
    ]


def _prompt(title: str, candidates: list[dict[str, Any]]) -> str:
    return (
        "You are resolving named entities in a screenplay. Return JSON only: "
        '{"entities":[{"id":0,"keep":true,"type":"PERSON","canonical_name":"Name"}]}.\n'
        "For each supplied candidate: choose type strictly from PERSON, LOCATION, ORGANIZATION, OBJECT, OTHER; "
        "set keep=false only for sound effects, action directions, grammar fragments, or other non-entities; "
        "use canonical_name only to merge case/alias variants of the same entity. "
        "A candidate marked speaker is always a PERSON and must be kept. Do not invent entities.\n"
        f"Screenplay: {title or 'Untitled'}\nCandidates:\n{candidates}"
    )


def resolve(entities: list[dict], script_text: str, title: str = "") -> tuple[list[dict], dict]:
    """Return semantically resolved entities and transparent processing metadata.

    No key means no remote call and the original NER result is retained.
    """
    if not entities:
        return entities, {"enabled": False, "applied": False, "reason": "no entities", "version": RESOLUTION_VERSION}
    if not summarize.enabled():
        return entities, {"enabled": False, "applied": False, "reason": "no LLM API key configured", "version": RESOLUTION_VERSION}

    candidates = _candidate_payload(entities, script_text)
    updates: dict[int, dict] = {}
    # Smaller batches keep script context useful and avoid one huge prompt.
    for start in range(0, len(candidates), 30):
        data = summarize._call_llm(_prompt(title, candidates[start : start + 30]))
        if not isinstance(data, dict):
            continue
        for item in data.get("entities", []):
            if isinstance(item, dict) and isinstance(item.get("id"), int):
                updates[item["id"]] = item

    if not updates:
        return entities, {"enabled": True, "applied": False, "reason": "semantic provider returned no valid decisions", "version": RESOLUTION_VERSION}

    resolved: list[dict] = []
    for index, entity in enumerate(entities):
        update = updates.get(index)
        item = dict(entity)
        if not update:
            resolved.append(item)
            continue
        if item.get("is_speaker"):
            item["label"] = item["type"] = "PERSON"
        else:
            entity_type = str(update.get("type", "")).upper()
            if entity_type in ALLOWED_TYPES:
                item["label"] = item["type"] = entity_type
            if update.get("keep") is False:
                # Only accept removals for clear non-entities; retain named or
                # multiword candidates if the response is ambiguous.
                text = str(item.get("text", ""))
                if _NOISE.match(text) or len(text) <= 5:
                    continue
        canonical = str(update.get("canonical_name", "")).strip()
        if canonical and len(canonical) <= 80 and not item.get("is_speaker"):
            item["text"] = item["name"] = canonical
        resolved.append(item)

    # Merge case variants such as THANOS / Thanos after canonicalization.
    resolved = ner._merge_entities(resolved)
    return resolved, {"enabled": True, "applied": True, "reviewed": len(updates), "model": summarize._last_used_model or "LLM", "version": RESOLUTION_VERSION}
