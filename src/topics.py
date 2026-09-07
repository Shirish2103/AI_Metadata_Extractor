"""Topics & keywords: RAKE keyphrases, TF-IDF scene keywords, optional KeyBERT."""

import logging
import re
from functools import lru_cache

logger = logging.getLogger(__name__)

SPLIT_RE = re.compile(r"[\s.,;:!?()\[\]\"'\-]+")


def _stopwords() -> set[str]:
    base = set(_EMBEDDED_STOPWORDS)
    try:
        import nltk

        nltk.data.find("corpora/stopwords")
        from nltk.corpus import stopwords

        base |= set(stopwords.words("english"))
    except Exception:
        pass
    return base


_EMBEDDED_STOPWORDS = set(
    """i me my myself we our ours ourselves you your yours yourself yourselves he him his himself
    she her hers herself it its itself they them their theirs what which who whom this that these
    those am is are was were be been being have has had having do does did doing a an the and but
    if or because as until while of at by for with about against between into through during
    before after above below to from up down in out on off over under again further then once
    here there when where why how all any both each few more most other some such no nor not only
    own same so than too very can will just don should now d ll m o re ve y ain aren't couldn't
    didn't doesn't hasn't haven't isn't mightn't mustn't needn't shan't shouldn't wasn't weren't
    won't wouldn't would could must ought shall may might upon across among without within per
    via also even still always never often sometimes usually mostly rather quite almost already
    yet really much many few little lot bits thing things something anything nothing everything
    someone anyone everyone nobody everybody maybe perhaps probably definitely certainly seems
    seem seemed seeing make makes made making get gets got getting give gives gave given going
    gone go goes went come comes came coming look looks looked looking say says said saying know
    knows knew knowing want wants wanted wanting take takes took taking see sees saw seeing think
    thinks thought thinking tell tells told telling feel feels felt feeling ask asks asked asking
    yes no maybe one two three new old great good bad big small
    cut fade dissolve smash match jump hard lap wipe iris pov insert establishing master shot
    angle close wide medium pan tilt zoom dolly crane overhead aerial montage series shots
    intercut split super continued contd black white screen see hear follow drift reveal snap
    tracking crane pull push rack focus time present cut revision revisions current draft screenplay
    written based story marvel comic studios studio inc int ext day night continuous later moments
    flashback present morning evening dusk dawn twilight sunset sunrise afternoon noon
    hello hi hey dear oh yeah okay ok well""".split()
)

# Screenplay-noise patterns for post-filtering low-quality keyphrases
_SCREENPLAY_NOISE_RE = re.compile(
    r"\b(revision|revisions|current|draft|screenplay|written|based|marvel|comic|studio|studios|inc|"
    r"pov|insert|establishing|master|shot|angle|close|wide|medium|pan|tilt|zoom|dolly|crane|"
    r"overhead|aerial|montage|intercut|split|super|continued|contd|fade|cut|dissolve|smash|jump|hard|wipe|iris|"
    r"int|ext|day|night|continuous|moments?|later|flashback|present|morning|evening|dusk|dawn|"
    r"hello|hi|hey|dear|oh|yeah|okay|ok|well)\b",
    re.IGNORECASE,
)

_CAMERA_KW_RE = re.compile(
    r"^(?:angle\s+on|close\s+(?:on|up)|cut\s+to|dissolve\s+to|establishing|fade\s+(?:in|out|to)|"
    r"from\s+(?:up\s+high|above|below)|insert|master\s+shot|medium\s+shot|pan\s+to|pov|reveal|"
    r"smash\s+cut|snap\s+zoom|tilt|tracking|wide\s+shot|zoom|dolly|crane|overhead|aerial|montage|"
    r"series\s+of\s+shots|intercut|split\s+screen|super|continued|black\s+screen|white\s+screen|"
    r"we\s+see|we\s+hear|we\s+follow|high\s+angle|low\s+angle|pull\s+back|push\s+in)\b",
    re.IGNORECASE,
)


def _is_low_quality_keyword(kw: str) -> bool:
    """Return True if keyword is screenplay boilerplate / camera direction noise."""
    if not kw or not kw.strip():
        return True
    low = kw.strip().lower()
    # Single-word generic noise already in stopwords, but catch phrases containing them
    if _SCREENPLAY_NOISE_RE.search(low):
        return True
    if _CAMERA_KW_RE.match(low):
        return True
    # Filter keywords that are mostly stopwords / very short words
    words = low.split()
    if len(words) == 1 and len(words[0]) <= 2:
        return True
    return False


_STOP = None


def _sw() -> set[str]:
    global _STOP
    if _STOP is None:
        _STOP = _stopwords()
    return _STOP


def rake_keywords(text: str, top_n: int = 20) -> list[dict]:
    """Rapid Automatic Keyword Extraction scoring candidate keyphrases."""
    sw = _sw()
    candidates: list[list[str]] = []
    for sent in re.split(r"[.!?;:()\n]+", text.lower()):
        phrase: list[str] = []
        for w in re.split(r"[^a-z']+", sent):
            if not w or w in sw:
                if phrase:
                    candidates.append(phrase)
                    phrase = []
                continue
            phrase.append(w)
        if phrase:
            candidates.append(phrase)

    freq: dict[str, int] = {}
    deg: dict[str, int] = {}
    for phrase in candidates:
        for w in phrase:
            freq[w] = freq.get(w, 0) + 1
            deg[w] = deg.get(w, 0) + len(phrase)
    for w in freq:
        deg[w] = deg.get(w, 0) + freq[w]

    word_scores = {w: deg[w] / freq[w] for w in freq}
    scored = []
    for phrase in candidates:
        if len(phrase) < 2:
            continue
        if len(phrase) <= 3:
            score = sum(word_scores[w] for w in phrase)
            scored.append((score, " ".join(phrase)))
            continue
        # split over-long phrases into best-scoring 3-word windows
        for k in range(len(phrase) - 2):
            window = phrase[k : k + 3]
            score = sum(word_scores[w] for w in window)
            scored.append((score, " ".join(window)))

    scored.sort(key=lambda x: -x[0])
    seen = set()
    out = []
    for score, phrase in scored:
        if _is_low_quality_keyword(phrase):
            continue
        key = " ".join(dict.fromkeys(phrase.split()))
        if key in seen:
            continue
        seen.add(key)
        out.append({"keyword": phrase, "score": round(score, 3)})
        if len(out) >= top_n:
            break
    return out


def _tfidf_stopwords():
    """TF-IDF stop words: English + screenplay boilerplate."""
    base = set(_sw())
    # Add extra screenplay-specific terms that TF-IDF should ignore
    base.update({
        "cut", "fade", "dissolve", "smash", "jump", "hard", "wipe", "iris",
        "pov", "insert", "establishing", "master", "shot", "angle", "close",
        "wide", "medium", "pan", "tilt", "zoom", "dolly", "crane", "overhead",
        "aerial", "montage", "intercut", "split", "super", "continued", "contd",
        "revision", "revisions", "current", "draft", "screenplay", "written",
        "based", "marvel", "comic", "studios", "studio", "inc", "int", "ext",
        "day", "night", "continuous", "moments", "later", "flashback", "present",
        "morning", "evening", "dusk", "dawn", "twilight", "sunset", "sunrise",
        "hello", "hi", "hey", "dear", "oh", "yeah", "okay", "ok", "well",
    })
    return list(base)


def _tfidf_model():
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer

        return TfidfVectorizer(
            stop_words=_tfidf_stopwords(), ngram_range=(1, 2), max_features=20000, min_df=1
        )
    except Exception:
        return None


def tfidf_keywords(scene_texts: list[str], top_n: int = 15) -> list[list[dict]]:
    """Top-N TF-IDF keywords per scene, scored against the whole script."""
    vec = _tfidf_model()
    if vec is None or not scene_texts:
        return [[] for _ in scene_texts]
    try:
        matrix = vec.fit_transform(scene_texts).toarray()
        names = vec.get_feature_names_out()
        out = []
        for row in matrix:
            idx = row.argsort()[::-1][:top_n * 2]  # fetch extra to allow filtering
            filtered = []
            for i in idx:
                if row[i] <= 0:
                    continue
                kw = names[i]
                if _is_low_quality_keyword(kw):
                    continue
                filtered.append({"keyword": kw, "score": round(float(row[i]), 4)})
                if len(filtered) >= top_n:
                    break
            out.append(filtered)
        return out
    except Exception as exc:
        logger.warning("TF-IDF keyword extraction skipped (empty/short text): %s", exc)
        return [[] for _ in scene_texts]


@lru_cache(maxsize=1)
def _keybert():
    try:
        from keybert import KeyBERT

        return KeyBERT(model="all-MiniLM-L6-v2")
    except Exception as exc:
        logger.info("KeyBERT unavailable (no sentence-transformers?): %s", exc)
        return None


def keybert_keywords(text: str, top_n: int = 10, max_chars: int = 5000, candidates: list[str] = None) -> list[dict]:
    kb = _keybert()
    if kb is None:
        return []
    if len(text) > max_chars:
        text = text[:max_chars]
    try:
        kwargs = {
            "keyphrase_ngram_range": (1, 2),
            "stop_words": "english",
            "top_n": top_n,
        }
        if candidates:
            kwargs["candidates"] = candidates
        res = kb.extract_keywords(text, **kwargs)
        return [{"keyword": k, "score": round(float(s), 3)} for k, s in res]
    except Exception as exc:
        logger.warning("KeyBERT extraction failed: %s", exc)
        return []


def _extract_text_item(item) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        return str(item.get("text", ""))
    return str(getattr(item, "text", item or ""))


def scene_topics(script, scene_texts: list[str], top_n: int = 8) -> list[list[dict]]:
    """Combine TF-IDF + RAKE per scene into a merged keyword list."""
    try:
        tfidf = tfidf_keywords(scene_texts, top_n=top_n)
        out = []
        for i in range(len(scene_texts)):
            scene_text = scene_texts[i] if i < len(scene_texts) else ""
            tf = tfidf[i] if i < len(tfidf) else []
            rake = rake_keywords(scene_text, top_n=top_n)
            # Filter low-quality before merging
            rake = [k for k in rake if not _is_low_quality_keyword(k["keyword"])]
            tf = [k for k in tf if not _is_low_quality_keyword(k["keyword"])]
            merged = {k["keyword"]: k for k in (rake + tf)}
            filtered = [v for v in merged.values() if not _is_low_quality_keyword(v["keyword"])]
            out.append(sorted(filtered, key=lambda k: -k["score"])[:top_n])
        return out
    except Exception as exc:
        logger.warning("scene_topics extraction failed: %s", exc)
        return [[] for _ in scene_texts]


def _normalize_scores(items: list[dict]) -> list[dict]:
    """Min-max scale scores to [0, 1] so different sources are comparable."""
    if not items:
        return items
    try:
        lo = min(i["score"] for i in items)
        hi = max(i["score"] for i in items)
        span = hi - lo
        if span <= 0:
            return [{**i, "score": 1.0} for i in items]
        return [{**i, "score": round((i["score"] - lo) / span, 3)} for i in items]
    except Exception:
        return items


def _word_freq(text: str) -> dict[str, int]:
    """Simple word frequency for filtering one-off phrases."""
    import re as _re
    freq: dict[str, int] = {}
    for w in _re.split(r"[^a-z']+", text.lower()):
        if w:
            freq[w] = freq.get(w, 0) + 1
    return freq


def _sample_text(text: str, max_chars: int = 5000) -> str:
    import re
    sentences = re.split(r'(?<=[.!?]) +', text)
    if not sentences:
         return text[:max_chars]
    step = max(1, len(sentences) // max(1, (max_chars // 100)))
    sampled = " ".join(sentences[::step])
    return sampled[:max_chars]


def overall_topics(script, top_n: int = 25, summary: dict = None) -> list[dict]:
    try:
        dialogue_texts = [_extract_text_item(d) for d in getattr(script, "all_dialogue", [])]
        action_texts = [_extract_text_item(a) for a in getattr(script, "all_action", [])]
        text = " ".join(t for t in dialogue_texts if t) + " " + " ".join(t for t in action_texts if t)
        if not text.strip():
            return []
        # Compute word frequencies for filtering rare descriptive phrases
        wf = _word_freq(text)
        # Collect speaker names to protect character names from frequency filtering
        try:
            speaker_names = set(s.lower() for s in getattr(script, "speakers", []) or [])
        except Exception:
            speaker_names = set()
        rake_all = rake_keywords(text, top_n=top_n * 3)
        # Filter RAKE: drop phrases where every word appears only once (likely one-off
        # descriptive noise like "snug v neck") unless it's a character name.
        filtered_rake = []
        low_text = text.lower()
        for k in rake_all:
            kw = k["keyword"]
            if _is_low_quality_keyword(kw):
                continue
            low_kw = kw.lower()
            # Protect character names
            is_character = any(low_kw == sn or low_kw in sn or sn in low_kw for sn in speaker_names)
            if is_character:
                filtered_rake.append(k)
                continue
            words = low_kw.split()
            max_freq = max((wf.get(w, 0) for w in words), default=0)
            phrase_count = low_text.count(low_kw)
            # Filter one-off descriptive noise:
            # - All words appear only once (singleton phrase) OR
            # - Phrase appears only once and max word freq <=2 (not repeated enough to be a theme)
            if max_freq <= 2 and len(words) <= 3:
                continue
            if phrase_count <= 2 and max_freq <= 3 and len(words) <= 3:
                continue
            filtered_rake.append(k)
        rake = _normalize_scores(filtered_rake[: top_n * 2])
        
        if summary and summary.get("themes"):
            kb = [{"keyword": t, "score": 0.9} for t in summary["themes"]]
        elif summary and summary.get("synopsis"):
            kb = keybert_keywords(summary["synopsis"], top_n=top_n)
        else:
            kb_text = _sample_text(text, 5000)
            rake_cands = [k["keyword"] for k in rake]
            kb = keybert_keywords(kb_text, top_n=top_n, candidates=rake_cands) if rake_cands else []
            
        # Filter low-quality keywords before merging
        rake = [k for k in rake if not _is_low_quality_keyword(k["keyword"])]
        kb = [k for k in kb if not _is_low_quality_keyword(k["keyword"])]
        # Prioritize KeyBERT (semantic) slightly: boost its scores for sorting
        # RAKE normalized is 0-1, KeyBERT ~0.3-0.5, so RAKE still dominates.
        # Give KeyBERT a boost to surface semantic topics over one-off RAKE phrases.
        kb_boosted = [{**k, "score": round(k["score"] + 0.6, 3)} for k in kb]
        merged = {k["keyword"]: k for k in (rake + kb_boosted)}
        filtered = [v for v in merged.values() if not _is_low_quality_keyword(v["keyword"])]
        return sorted(filtered, key=lambda k: -k["score"])[:top_n]
    except Exception as exc:
        logger.warning("overall_topics extraction failed: %s", exc)
        return []