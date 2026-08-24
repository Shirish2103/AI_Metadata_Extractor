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
    yes no maybe one two three new old great good bad big small""".split()
)


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
        key = " ".join(dict.fromkeys(phrase.split()))
        if key in seen:
            continue
        seen.add(key)
        out.append({"keyword": phrase, "score": round(score, 3)})
        if len(out) >= top_n:
            break
    return out


def _tfidf_model():
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer

        return TfidfVectorizer(
            stop_words="english", ngram_range=(1, 2), max_features=20000, min_df=1
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
            idx = row.argsort()[::-1][:top_n]
            out.append(
                [
                    {"keyword": names[i], "score": round(float(row[i]), 4)}
                    for i in idx
                    if row[i] > 0
                ]
            )
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


def keybert_keywords(text: str, top_n: int = 10, max_chars: int = 5000) -> list[dict]:
    kb = _keybert()
    if kb is None:
        return []
    if len(text) > max_chars:
        text = text[:max_chars]
    try:
        res = kb.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 2),
            stop_words="english",
            top_n=top_n,
        )
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
            merged = {k["keyword"]: k for k in (rake + tf)}
            out.append(sorted(merged.values(), key=lambda k: -k["score"])[:top_n])
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


def overall_topics(script, top_n: int = 25) -> list[dict]:
    try:
        dialogue_texts = [_extract_text_item(d) for d in getattr(script, "all_dialogue", [])]
        action_texts = [_extract_text_item(a) for a in getattr(script, "all_action", [])]
        text = " ".join(t for t in dialogue_texts if t) + " " + " ".join(t for t in action_texts if t)
        if not text.strip():
            return []
        rake = _normalize_scores(rake_keywords(text, top_n=top_n))
        kb = keybert_keywords(text, top_n=top_n)
        merged = {k["keyword"]: k for k in (rake + kb)}
        return sorted(merged.values(), key=lambda k: -k["score"])[:top_n]
    except Exception as exc:
        logger.warning("overall_topics extraction failed: %s", exc)
        return []