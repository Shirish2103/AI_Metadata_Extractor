"""Speaker identification: resolve speaker headings to canonical characters
and enrich with gender information from the movie_characters dataset."""

import pickle
import re
from functools import lru_cache

from src.config import GENDERS_PICKLE
from src.parser import (
    ParsedScript,
    normalize_speaker,
    _HONORIFICS_MAP,
    _LOCATION_WORDS,
    _PERSON_ROLE_WORDS,
    _ACTION_VERBS,
    _BODY_PARTS_AND_PROPS,
)

_ALIAS_SANITIZE_RE = re.compile(r"[^a-z0-9]+")


def _key(name: str) -> str:
    n = normalize_speaker(name) if name else ""
    return _ALIAS_SANITIZE_RE.sub("", n.lower()) if n else ""


@lru_cache(maxsize=1)
def _genders_map() -> dict:
    try:
        with open(GENDERS_PICKLE, "rb") as f:
            return pickle.load(f)
    except Exception:
        return {}


def get_canonical_name(imdb_id: str, speaker_name: str) -> tuple[str, str | None, bool]:
    """Match speaker against IMDb/genders dataset to return (canonical_name, gender, is_canon)."""
    mid = imdb_id.zfill(7) if imdb_id else ""
    lst = _genders_map().get(mid, [])
    if not lst:
        return speaker_name, None, False

    spk_key = _key(speaker_name)
    if not spk_key:
        return speaker_name, None, False

    # 1. Exact match
    for cname, gtype in lst:
        if _key(cname) == spk_key:
            return cname, gtype, True

    # 2. Whole word in canonical name (e.g. "Tony" in "Tony Stark", "Jonnie" in "Jonnie Goodboy Tyler")
    if len(spk_key) >= 3:
        for cname, gtype in lst:
            c_words = [_key(w) for w in cname.split()]
            if spk_key in c_words:
                return cname, gtype, True

    return speaker_name, None, False


def gender_for(imdb_id: str, speaker: str) -> str | None:
    """Return 'actor'/'actress'/None for a speaker in a movie."""
    _, gtype, _ = get_canonical_name(imdb_id, speaker)
    return gtype


def _is_substring_speaker(shorter: str, longer: str) -> bool:
    """Check if shorter speaker name is whole-word substring of longer."""
    s = shorter.strip().lower()
    lng = longer.strip().lower()
    if not s or not lng or s == lng:
        return False
    # Do not merge across composite speakers or commas
    if " and " in lng or " & " in lng or "," in lng:
        return False
    if " and " in s or " & " in s or "," in s:
        return False
    return bool(re.search(r"\b" + re.escape(s) + r"\b", lng))


_NOISE_NAMES = {
    "CUT", "REVEAL", "SMASH", "OPEN ON", "END ON", "CLOSE ON", "START ON", "INSERT",
    "TITLE", "TITLES", "LOGO", "SCREEN", "MONITOR", "CCTV", "PHONE", "TV", "RADIO",
    "SONG", "MUSIC", "VOICE", "NARRATION", "TEXT", "READ", "SHOT", "POV", "PROTOCOLS",
    "EX MACHINA", "EMAIL", "SIGN", "SIGNS", "RECORDING", "AUTO", "P.A.", "PAGE",
    "TRAILER", "PREVIEW", "FOOTAGE", "ARCHIVE", "INTERVIEW",
    "FROM UP HIGH", "FROM ABOVE", "FROM BELOW", "SNAP ZOOM TO", "SNAP ZOOM",
    "ANGLE ON", "CLOSE UP", "WIDE SHOT", "MEDIUM SHOT", "MASTER SHOT",
    "PAN TO", "TILT", "ZOOM", "DOLLY", "CRANE", "OVERHEAD", "AERIAL",
    "MONTAGE", "SERIES OF SHOTS", "INTERCUT", "SPLIT SCREEN", "SUPER",
    "CONTINUED", "CONT'D", "BLACK SCREEN", "WHITE SCREEN", "ESTABLISHING",
    "WE SEE", "WE HEAR", "WE FOLLOW", "ON TONY", "ON SARA", "ON REBECCA",
    "FLASHBACK", "FLASHBACK TO", "LATER", "MOMENTS LATER", "CONTINUOUS",
    "SAME TIME", "RANDOM-UNRELATED CUTS", "CAMERA", "THE END", "AT THE WHEEL",
    "BATTLE HYMN", "FANTASTIC UNIVERSAL SENSE THAT", "GRAZING COWS",
    "SEARING-HOT IRON", "A PAINT BRUSH", "A LEARNING MACHINE", "A PSYCHLO RECON DRONE",
    "THE BARTENDER'S SEVERED HEAD", "THE CHURCH DOORS", "A NEW CORRIDOR",
    "A BIG MIXED CROWD", "THE UNARMED TEN-MEMBER CREW", "OVER DORIE",
    "OVER BLACK", "OVER WHITE", "FADE IN", "FADE OUT", "FADE", "DANGER", "MOTHER",
    "DISSOLVE", "DISSOLVE INTO", "DISSOLVE TO", "TIME PASSAGE", "TIME CUT",
    "CROSS FADE", "CROSSFADE", "WIPE", "WIPE TO", "LAP DISSOLVE",
}


def _is_plausible_speaker(s: dict, min_lines: int = 2) -> bool:
    name = s["name"]
    if s["lines"] < min_lines and not s.get("gender"):
        return False
    up = name.upper().strip()
    if up in _NOISE_NAMES:
        return False
    if len(up) <= 1:
        return False

    # Disallow invalid symbols / punctuation / digits
    if re.search(r"[\d!@#$%^&*()_+={}\[\]|\\:;\"<>,?/~`]", up):
        clean_up = re.sub(r"\b(?:DR|MR|MRS|MS|LT|SGT|CAPT|COL|GEN|PROF|[A-Z])\.", "", up)
        if re.search(r"[\d!@#$%^&*()_+={}\[\]|\\:;\"<>,?/~`.]", clean_up):
            return False

    words = up.split()
    # Check sound effects
    if "!" in up or any(w in ("KABLAM", "BOOM", "BANG", "CRASH", "SLAM", "POW", "WHAM") for w in words):
        return False

    # Check action verb at end: "ALFIE WATCHES"
    if words and words[-1] in _ACTION_VERBS:
        return False

    # Check possessive + body part / prop: "JARRETT'S FACE"
    if len(words) >= 2 and any(re.search(r"['’]S$", w) for w in words[:-1]) and words[-1] in _BODY_PARTS_AND_PROPS:
        return False

    # Check if ends with body part / prop / noise noun
    if words and words[-1] in _BODY_PARTS_AND_PROPS and not any(w in _PERSON_ROLE_WORDS for w in words):
        return False

    # Check preposition start
    if words and words[0] in ("AT", "IN", "ON", "OVER", "UNDER", "INTO", "THROUGH", "FROM", "WITH", "WITHOUT", "BEHIND", "AROUND", "BESIDE"):
        return False

    # Check timing/camera end
    if words and words[-1] in ("LATER", "CUT", "CUTS", "FLASHBACK", "SHOT", "SHOTS", "POV", "CAMERA"):
        return False

    # Check location words
    if any(w in _LOCATION_WORDS for w in words):
        if not any(w in _PERSON_ROLE_WORDS for w in words):
            return False

    # Check article + inanimate object
    if words and words[0] in ("A", "AN", "THE", "SOME", "SEVERAL", "TWO", "THREE", "FOUR"):
        if not any(w in _PERSON_ROLE_WORDS for w in words):
            return False

    # Sentence fragments ending in conjunctions/prepositions
    if words and words[-1] in ("THAT", "AND", "OR", "THE", "A", "AN", "OF", "TO", "IN"):
        return False

    # Filter obvious camera/POV artifacts
    if " POV" in up or up.startswith("POV") or "CREDITS" in up or up.startswith("ECU") or " ECU" in up:
        return False
    for prefix in (
        "ANGLE ON", "CLOSE ON", "CLOSE UP", "WIDE SHOT", "MEDIUM SHOT", "MASTER SHOT",
        "PAN TO", "TILT", "ZOOM", "DOLLY", "CRANE", "FROM UP", "SNAP ZOOM",
        "REVEAL", "INSERT", "ESTABLISHING", "MONTAGE", "INTERCUT", "SPLIT SCREEN",
        "WE SEE", "WE HEAR", "ON ",
    ):
        if up.startswith(prefix):
            return False
    return True


def _merge_speaker_stats(stats: list[dict], imdb_id: str = "") -> list[dict]:
    """Merge speaker entries using canonical names and dominant frequency."""
    if not stats:
        return []

    # First resolve against IMDb/genders dataset
    for s in stats:
        can_name, gtype, is_canon = get_canonical_name(imdb_id, s["name"])
        s["name"] = can_name
        s["is_canon"] = is_canon
        if gtype:
            s["gender"] = gtype

    # Merge entries with exact same key
    exact_merged: dict[str, dict] = {}
    for s in stats:
        k = _key(s["name"])
        if not k:
            continue
        if k in exact_merged:
            exact_merged[k]["lines"] += s["lines"]
            exact_merged[k]["words"] += s["words"]
            if not exact_merged[k].get("gender") and s.get("gender"):
                exact_merged[k]["gender"] = s.get("gender")
            if s.get("is_canon"):
                exact_merged[k]["is_canon"] = True
                exact_merged[k]["name"] = s["name"]
        else:
            exact_merged[k] = dict(s)

    # Now merge substring variants
    # Sort by lines descending so dominant canonical character is evaluated first
    sorted_stats = sorted(exact_merged.values(), key=lambda x: (-x["lines"], -x["words"]))
    merged: list[dict] = []
    for s in sorted_stats:
        found = None
        for m in merged:
            if _is_substring_speaker(s["name"], m["name"]) or _is_substring_speaker(m["name"], s["name"]):
                found = m
                break
        if found:
            found["lines"] += s["lines"]
            found["words"] += s["words"]
            if not found.get("gender") and s.get("gender"):
                found["gender"] = s.get("gender")

            # Canonical name replacement rules:
            # 1. If s is canonical from cast list and found is not, prefer s
            if s.get("is_canon") and not found.get("is_canon"):
                found["name"] = s["name"]
                found["is_canon"] = True
            # 2. If neither is canonical, only prefer s if s has 2+ words, clean letters,
            # and significant dialogue volume (>= 5 lines and >= 15% of found lines)
            elif not found.get("is_canon") and not s.get("is_canon"):
                if (
                    len(s["name"].split()) > len(found["name"].split())
                    and s["lines"] >= 5
                    and s["lines"] >= found["lines"] * 0.15
                    and _is_plausible_speaker(s, min_lines=0)
                ):
                    found["name"] = s["name"]
        else:
            merged.append(dict(s))

    return sorted(merged, key=lambda x: -x["words"])


def build_canonical_speaker_mapping(script: ParsedScript) -> dict[str, str]:
    """Map any raw or normalized speaker string to its final canonical character name."""
    mapping: dict[str, str] = {}
    stats_list = speaker_stats(script)
    canonical_names = {s["name"] for s in stats_list}

    for s in stats_list:
        cname = s["name"]
        mapping[cname] = cname
        mapping[cname.upper()] = cname
        ck = _key(cname)
        if ck:
            mapping[ck] = cname

    for d in script.all_dialogue:
        raw = d.speaker
        if not raw:
            continue
        norm = normalize_speaker(raw)
        if not norm:
            continue
        if norm in mapping:
            continue

        # Check exact key
        nk = _key(norm)
        if nk in mapping:
            mapping[norm] = mapping[nk]
            mapping[raw] = mapping[nk]
            continue

        # Check substring against canonical names
        matched = None
        for cname in canonical_names:
            if _is_substring_speaker(norm, cname) or _is_substring_speaker(cname, norm):
                matched = cname
                break
        if matched:
            mapping[norm] = matched
            mapping[raw] = matched
        else:
            mapping[norm] = norm
            mapping[raw] = norm

    return mapping


def speaker_stats(script: ParsedScript) -> list[dict]:
    """Return sorted list of {name, lines, words, gender} for each speaker."""
    raw_stats: dict[str, dict] = {}
    for d in script.all_dialogue:
        n = normalize_speaker(d.speaker)
        if not n:
            continue

        # Split composite speakers e.g. "ALFIE AND NIKKI" -> credit both
        sub_speakers = [n]
        if " AND " in n.upper() or " & " in n:
            parts = re.split(r"\s+(?:AND|&)\s+", n, flags=re.IGNORECASE)
            valid_parts = [normalize_speaker(p) for p in parts if normalize_speaker(p)]
            if len(valid_parts) >= 2 and all(_is_plausible_speaker({"name": p, "lines": 1}, min_lines=0) for p in valid_parts):
                sub_speakers = valid_parts

        for spk in sub_speakers:
            s = raw_stats.setdefault(spk, {"name": spk, "lines": 0, "words": 0, "gender": None})
            s["lines"] += 1
            s["words"] += len(d.text.split())

    all_stats = list(raw_stats.values())
    merged = _merge_speaker_stats(all_stats, imdb_id=script.imdb_id)
    filtered = [s for s in merged if _is_plausible_speaker(s, min_lines=2)]
    return sorted(filtered, key=lambda x: -x["words"])


def speaker_line_counts(script: ParsedScript) -> dict[str, int]:
    """Map speaker -> number of dialogue lines (raw counts, normalized)."""
    out: dict[str, int] = {}
    for d in script.all_dialogue:
        n = normalize_speaker(d.speaker)
        if n:
            out[n] = out.get(n, 0) + 1
    return out