"""Named Entity Recognition with spaCy, aggregated per scene and globally."""

import logging
import os
import re
from functools import lru_cache

from src.parser import ParsedScript, normalize_speaker

logger = logging.getLogger(__name__)

DEFAULT_SPACY_MODEL = os.environ.get("SPACY_MODEL", "en_core_web_lg")

KEEP_LABELS = {"PERSON", "ORG", "GPE", "LOC", "FAC", "PRODUCT", "WORK_OF_ART", "EVENT", "LAW"}
LABEL_ALIASES = {
    "GPE": "LOCATION",
    "LOC": "LOCATION",
    "FAC": "LOCATION",
    "ORG": "ORGANIZATION",
    "LAW": "ORGANIZATION",
    "WORK_OF_ART": "PRODUCT",
}

ORG_SUFFIXES = {
    "industries", "industry", "studios", "studio", "inc", "incorporated",
    "corp", "corporation", "ltd", "limited", "llc", "co", "company",
}

# Verbs commonly found in uppercase screenplay action lines that the parser
# must never use as evidence for a dialogue-speaker identity.
ACTION_HEADING_WORDS = {
    "touches", "surveys", "tightens", "watches", "ducks", "taps", "swings",
    "kicks", "seizes", "exits", "enters", "walks", "runs", "looks", "turns",
    "grabs", "holds", "stands", "sits", "takes", "moves", "falls", "stares",
}

# Single-word descriptors / generic nouns that are NOT character names.
# Filtered from PERSON entities to reduce false positives like "Brunette".
DESCRIPTOR_WORDS = {
    "brunette", "blonde", "blond", "redhead", "young", "old", "man", "woman",
    "boy", "girl", "guy", "lady", "kid", "child", "teen", "teenager", "adult",
    "stranger", "friend", "enemy", "victim", "suspect", "driver", "nurse",
    "doctor", "cop", "guard", "waiter", "waitress", "bartender", "clerk",
    "officer", "detective", "agent", "soldier", "pilot", "teacher", "student",
    "mom", "dad", "mother", "father", "brother", "sister", "son", "daughter",
    "husband", "wife", "boyfriend", "girlfriend", "audience", "crowd",
    "voice", "man", "woman",
}


@lru_cache(maxsize=1)
def load_spacy(model: str = DEFAULT_SPACY_MODEL):
    try:
        import spacy

        try:
            return spacy.load(model)
        except OSError:
            try:
                return spacy.load("en_core_web_sm")
            except OSError:
                logger.info("Downloading spaCy model %s ...", model)
                spacy.cli.download(model)
                return spacy.load(model)
    except Exception as exc:  # pragma: no cover
        logger.warning("spaCy unavailable: %s", exc)
        return None


def _canonical_label(label: str) -> str:
    return LABEL_ALIASES.get(label, label)


def _speaker_names(script: ParsedScript) -> set[str]:
    """Return normalized character names parsed from screenplay dialogue headings."""
    return {
        name.lower()
        for line in script.all_dialogue
        if (name := normalize_speaker(line.speaker))
    }


def _matching_speaker(text: str, speakers: set[str]) -> str | None:
    """Return the matched speaker name, without treating action text as a name."""
    low = re.sub(r"(?:'s|’s|âs)$", "", text.strip().lower()).strip()
    if not low or not speakers or "," in low or " and " in low:
        return None
    words = low.split()
    if len(words) > 2 or any(word.rstrip("'s") in ORG_SUFFIXES for word in words):
        return None

    # Endgame-style time-travel scene labels use A1 (often OCR'd as Al/AI),
    # as in "A1 TONY'S". It is a scene marker, not part of a character name.
    variants = [low]
    if len(words) == 2 and words[0] in {"a1", "al", "ai"}:
        variants.append(words[1])

    trusted_speakers = {
        speaker for speaker in speakers
        if len(speaker.split()) <= 3 and not any(word in ACTION_HEADING_WORDS for word in speaker.split()[1:])
    }
    for candidate in variants:
        # Exact identity wins. This prevents A1 STEVE from being matched to
        # OLD STEVE merely because both contain the word "steve".
        if candidate in trusted_speakers:
            return candidate
    for candidate in variants:
        # A one-word entity can be a short form of a multi-word speaker
        # (Scott -> Scott Lang). Never apply this to multi-word action text
        # such as "Steve tightens".
        if len(candidate.split()) == 1:
            matches = [speaker for speaker in trusted_speakers if candidate in speaker.split()]
            if matches:
                return min(matches, key=lambda speaker: (len(speaker.split()), len(speaker)))
    return None


def _matches_speaker(text: str, speakers: set[str]) -> bool:
    return _matching_speaker(text, speakers) is not None


def promote_speaker_entities(entities: list[dict], speaker_names: list[str] | set[str]) -> list[dict]:
    """Promote entity matches for screenplay speakers to PERSON.

    Speaker headings are structured screenplay evidence and are more reliable
    than a general-purpose NER model for uppercase fictional character names.
    """
    speakers = {
        normalized.lower()
        for name in speaker_names
        if (normalized := normalize_speaker(name))
    }
    for entity in entities:
        text = str(entity.get("text") or entity.get("name") or "")
        matched_speaker = _matching_speaker(text, speakers)
        is_speaker = matched_speaker is not None
        entity["is_speaker"] = is_speaker
        if is_speaker:
            entity["label"] = "PERSON"
            entity["type"] = "PERSON"
            # Canonicalize short forms, possessives and A1 scene-marker forms
            # to the actual screenplay speaker heading.
            entity["text"] = entity["name"] = matched_speaker
    return entities


def _is_valid_person(text: str) -> bool:
    """Filter generic descriptors that spaCy may label as PERSON."""
    if not text or not text.strip():
        return False
    low = text.strip().lower()
    if len(low) <= 1:
        return False
    if low in DESCRIPTOR_WORDS:
        return False
    words = low.split()
    # Multi-word descriptors like "Young Man", "Blonde Girl" -> all words are descriptors
    if len(words) >= 1 and all(w in DESCRIPTOR_WORDS for w in words):
        return False
    # Filter entities that look like composite names with commas or 'and' (e.g. "Pepper, Coulson", "Rhodey and Pepper")
    if "," in text or " and " in low:
        return False
    # Require proper name capitalization: each word should be Titlecase or UPPER
    # Filter phrases like "Yinsen seals Tony" where middle word is lowercase verb
    for w in text.split():
        # Strip possessive ’s
        core = w.strip(" ,.:;!?\"'“”‘’")
        if core.lower().endswith("'s") or core.lower().endswith("’s"):
            core = core[:-2]
        if not core:
            continue
        # Allow all-caps (e.g. "RAZA") or Titlecase (e.g. "Tony")
        if core.isupper() or core.istitle():
            continue
        # Allow mixed like "McDonald"? For now require first char uppercase
        if core[0].isupper():
            continue
        return False
    # Filter very short or non-alpha
    import re as _re
    if not _re.search(r"[a-z]", low):
        return False
    # Filter organization-like suffixes that should not be PERSON
    org_suffixes = {"industries", "industry", "studios", "studio", "inc", "incorporated", "corp", "corporation", "ltd", "limited", "llc", "co", "company"}
    if any(w in org_suffixes for w in words):
        return False
    return True


def _is_substring_name(shorter: str, longer: str) -> bool:
    """Case-insensitive whole-word substring check (e.g. 'Tony' in 'Tony Stark')."""
    import re as _re
    s = shorter.strip().lower()
    l = longer.strip().lower()
    if not s or not l or s == l:
        return False
    # Don't merge composite names like "Pepper, Coulson" or "Rhodey and Pepper"
    if "," in longer or " and " in l:
        return False
    if "," in shorter or " and " in s:
        return False
    # Use word boundaries to avoid 'Ann' in 'Joanna'
    return bool(_re.search(r"\b" + _re.escape(s) + r"\b", l))


def _merge_entities(entities: list[dict]) -> list[dict]:
    """Merge entities where one name is substring of another (e.g. Tony + Tony Stark)."""
    if not entities:
        return []
    # Sort by count desc, then length desc so longer/canonical names are preferred
    sorted_ents = sorted(entities, key=lambda e: (-e.get("count", 0), -len(e.get("text", ""))))
    merged: list[dict] = []
    for ent in sorted_ents:
        found = None
        for m in merged:
            # Exact normalized key match (case/punct insensitive)
            if _key(ent["text"]) == _key(m["text"]):
                found = m
                break
            if _is_substring_name(ent["text"], m["text"]) or _is_substring_name(m["text"], ent["text"]):
                found = m
                break
        if found:
            found["count"] = found.get("count", 0) + ent.get("count", 0)
            # Merge scenes
            if "scenes" in found and "scenes" in ent:
                try:
                    found["scenes"] = sorted(set(found["scenes"] + ent["scenes"]))
                except Exception:
                    pass
            # Prefer longer text as canonical name only if it has a count >= 2 to avoid promoting rare noise
            if len(ent["text"]) > len(found["text"]):
                if ent.get("count", 0) >= 2:
                    found["text"] = ent["text"]
                    found["name"] = ent["text"]
                    # If the longer form is PERSON, upgrade label
                    if ent.get("label") == "PERSON":
                        found["label"] = "PERSON"
                        found["type"] = "PERSON"
            else:
                # Upgrade label to PERSON if incoming is PERSON
                if found.get("label") != "PERSON" and ent.get("label") == "PERSON":
                    found["label"] = "PERSON"
                    found["type"] = "PERSON"
        else:
            merged.append(dict(ent))
    merged.sort(key=lambda e: -e.get("count", 0))
    return merged


class NERExtractor:
    def __init__(self, model: str = DEFAULT_SPACY_MODEL):
        self.nlp = load_spacy(model)

    def _doc_for(self, texts: list[str]):
        chunks = [t for t in texts if t and len(t.strip()) > 1]
        if not chunks or self.nlp is None:
            return []
        # spaCy batch to reduce overhead
        return [doc for doc in self.nlp.pipe(chunks, batch_size=64)]

    def extract(self, script: ParsedScript) -> dict:
        """Return {global_entities: [...], scene_entities: {scene_index: [...]}}."""
        speaker_names = _speaker_names(script)
        docs_by_scene = {}
        for scene in script.scenes:
            texts = [d.text for d in scene.dialogue] + scene.action
            docs_by_scene[scene.index] = self._doc_for(texts)

        global_agg: dict[str, dict] = {}
        scene_out: dict[int, list] = {}

        for scene in script.scenes:
            ents = {}
            for doc in docs_by_scene[scene.index]:
                for ent in doc.ents:
                    if ent.label_ not in KEEP_LABELS:
                        continue
                    label_val = _canonical_label(ent.label_)
                    text_val = _clean(ent.text)
                    # A parsed dialogue heading is stronger evidence than the
                    # generic NER model for an all-caps fictional character.
                    if _matches_speaker(text_val, speaker_names):
                        label_val = "PERSON"
                    # Filter descriptors mis-labelled as PERSON (e.g. "Brunette")
                    if label_val == "PERSON" and not _is_valid_person(text_val):
                        continue
                    key = (label_val, _key(text_val))
                    prev = ents.get(key)
                    if prev:
                        prev["count"] += 1
                    else:
                        ents[key] = {
                            "label": label_val,
                            "type": label_val,
                            "text": text_val,
                            "name": text_val,
                            "count": 1,
                        }
            # Keep top per scene, merge duplicates (e.g. Tony + Tony Stark) within scene
            scene_entities_raw = sorted(ents.values(), key=lambda e: -e["count"])[:20]
            # Merge substring duplicates within the scene
            try:
                scene_entities = _merge_entities(scene_entities_raw)
                scene_entities = sorted(scene_entities, key=lambda e: -e["count"])[:20]
            except Exception:
                scene_entities = scene_entities_raw
            scene_out[scene.index] = scene_entities
            for e in scene_entities:
                gkey = (e["label"], _key(e["text"]))
                g = global_agg.get(gkey)
                if g:
                    g["count"] += e["count"]
                    g["scenes"].append(scene.index)
                else:
                    global_agg[gkey] = {**e, "scenes": [scene.index]}

        global_entities = []
        for g in global_agg.values():
            g["scenes"] = sorted(set(g["scenes"]))
            global_entities.append(g)
        # Merge duplicate entities (Tony / Tony Stark, Sara / SARA MATTHEWS, cross-label duplicates)
        # First boost with speakers to ensure PERSON labels are correct before merging
        # (e.g. Pepper -> ORG to PERSON, Stane -> ORG to PERSON)
        # Be conservative: don't boost multi-word orgs like "Stark Industries" or composite "Pepper, Coulson"
        try:
            speakers_lower = set()
            for d in script.all_dialogue:
                n = normalize_speaker(d.speaker)
                if n:
                    speakers_lower.add(n.lower())
            org_suffixes = {"industries", "industry", "studios", "studio", "inc", "incorporated", "corp", "corporation", "ltd", "limited", "llc", "co", "company"}
            for g in global_entities:
                # Skip boosting for clear orgs or composite names
                low_g = g["text"].lower()
                if "," in g["text"] or " and " in low_g:
                    continue
                words_g = low_g.split()
                if any(w.strip(" ,.:;!?\"'“”‘’").rstrip("'s").rstrip("’s") in org_suffixes for w in words_g):
                    continue
                # Only boost single-word or 2-word person-like entities
                if len(words_g) > 2:
                    continue
                low = g["text"].lower()
                for s in speakers_lower:
                    import re as _re
                    if low == s or _re.search(r"\b" + _re.escape(low) + r"\b", s) or _re.search(r"\b" + _re.escape(s) + r"\b", low):
                        g["label"] = "PERSON"
                        g["type"] = "PERSON"
                        break
        except Exception:
            pass

        global_entities = _merge_entities(global_entities)
        # After merging, ensure scenes are still sorted and deduped
        for g in global_entities:
            if "scenes" in g:
                try:
                    g["scenes"] = sorted(set(g["scenes"]))
                except Exception:
                    pass
        global_entities.sort(key=lambda e: -e["count"])
        return {"global_entities": global_entities, "scene_entities": scene_out}


def _key(s: str) -> str:
    import re

    return re.sub(r"[^a-z0-9]", "", s.lower())


def _clean(s: str) -> str:
    s = " ".join(s.split())
    # Strip leading greetings that spaCy sometimes includes in PERSON entities
    # e.g. "Hello Pepper Potts" -> "Pepper Potts", "Hi Tony Stark" -> "Tony Stark"
    low = s.lower()
    for greet in ("hello ", "hi ", "hey ", "dear ", "hello, ", "hi, ", "hey, "):
        if low.startswith(greet):
            s = s[len(greet):].lstrip(" ,:")
            break
    # Also strip trailing/leading punctuation leftover
    s = s.strip(" ,.:;!?\"'“”‘’")
    s = " ".join(s.split())
    # Normalize possessive: "Tony Stark’s" -> "Tony Stark"
    low2 = s.lower()
    if low2.endswith("’s") or low2.endswith("'s"):
        s = s[:-2].strip()
    # Remove trailing possessive punctuation again
    s = s.strip(" ,.:;!?\"'“”‘’")
    return s


def person_matches_speakers(global_entities: list[dict], script: ParsedScript) -> list[dict]:
    """Annotate PERSON entities that correspond to dialogue speakers and boost labels."""
    speakers = set()
    for d in script.all_dialogue:
        n = normalize_speaker(d.speaker)
        if n:
            speakers.add(n.lower())
    import re as _re
    org_suffixes = {"industries", "industry", "studios", "studio", "inc", "incorporated", "corp", "corporation", "ltd", "limited", "llc", "co", "company"}
    for e in global_entities:
        low = e["text"].lower()
        # Don't consider composite or org-like entities for is_speaker boost
        if "," in e["text"] or " and " in low:
            e["is_speaker"] = False
            continue
        words = low.split()
        if any(w.strip(" ,.:;!?\"'“”‘’").rstrip("'s").rstrip("’s") in org_suffixes for w in words):
            e["is_speaker"] = False
            continue
        if len(words) > 2:
            # Only boost 1-2 word entities
            e["is_speaker"] = False
            continue
        is_spk = False
        for s in speakers:
            if low == s or _re.search(r"\b" + _re.escape(low) + r"\b", s) or _re.search(r"\b" + _re.escape(s) + r"\b", low):
                is_spk = True
                break
        e["is_speaker"] = is_spk
        # Boost to PERSON if it matches a known speaker (fixes Pepper -> ORG, Stane -> ORG)
        # Only for 1-2 word entities without org suffix
        if is_spk and e.get("label") != "PERSON":
            e["label"] = "PERSON"
            e["type"] = "PERSON"
    return global_entities
