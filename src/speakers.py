"""Speaker identification: resolve speaker headings to canonical characters
and enrich with gender information from the movie_characters dataset."""

import pickle
import re
from functools import lru_cache

from src.config import GENDERS_PICKLE
from src.parser import ParsedScript, normalize_speaker

_ALIAS_SANITIZE_RE = re.compile(r"[^a-z0-9]+")


def _key(name: str) -> str:
    n = normalize_speaker(name)
    return _ALIAS_SANITIZE_RE.sub("", n.lower()) if n else ""


@lru_cache(maxsize=1)
def _genders_map() -> dict:
    try:
        with open(GENDERS_PICKLE, "rb") as f:
            return pickle.load(f)
    except Exception:
        return {}


def gender_for(imdb_id: str, speaker: str) -> str | None:
    """Return 'actor'/'actress'/None for a speaker in a movie."""
    gmap = _genders_map()
    lst = gmap.get(imdb_id.zfill(7))
    if not lst:
        return None
    key = _key(speaker)
    if not key:
        return None
    for name, gtype in lst:
        if _key(name) == key:
            return gtype
    return None


def speaker_stats(script: ParsedScript) -> list[dict]:
    """Return sorted list of {name, lines, words, gender} for each speaker."""
    stats: dict[str, dict] = {}
    for d in script.all_dialogue:
        n = normalize_speaker(d.speaker)
        if not n:
            continue
        s = stats.setdefault(n, {"name": n, "lines": 0, "words": 0, "gender": None})
        s["lines"] += 1
        s["words"] += len(d.text.split())
    for s in stats.values():
        s["gender"] = gender_for(script.imdb_id, s["name"]) if script.imdb_id else None
    # drop obvious non-speaker noise and one-off artifacts
    filtered = [s for s in stats.values() if _is_plausible_speaker(s)]
    return sorted(filtered, key=lambda x: -x["words"])


_NOISE_NAMES = {
    "CUT", "REVEAL", "SMASH", "OPEN ON", "END ON", "CLOSE ON", "START ON", "INSERT",
    "TITLE", "TITLES", "LOGO", "SCREEN", "MONITOR", "CCTV", "PHONE", "TV", "RADIO",
    "SONG", "MUSIC", "VOICE", "NARRATION", "TEXT", "READ", "SHOT", "POV", "PROTOCOLS",
    "EX MACHINA", "EMAIL", "SIGN", "SIGNS", "RECORDING", "AUTO", "P.A.", "PAGE",
    "TRAILER", "PREVIEW", "FOOTAGE", "ARCHIVE", "INTERVIEW",
}


def _is_plausible_speaker(s: dict, min_lines: int = 2) -> bool:
    name = s["name"]
    if s["lines"] < min_lines and not s.get("gender"):
        return False
    if name.upper() in _NOISE_NAMES:
        return False 
    return True


def speaker_line_counts(script: ParsedScript) -> dict[str, int]:
    """Map speaker -> number of dialogue lines (raw counts, no normalization)."""
    out: dict[str, int] = {}
    for d in script.all_dialogue:
        n = normalize_speaker(d.speaker)
        if n:
            out[n] = out.get(n, 0) + 1
    return out