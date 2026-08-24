"""Content classification: multi-label genre classifier.

Trained on actual screenplay text (plus IMDb plot summaries as a fallback
source), so prediction on script text is in-domain.
"""

import logging
import re
from pathlib import Path

import pandas as pd

from src.config import META_CSV, MODELS_DIR
from src.corpus import load_index

logger = logging.getLogger(__name__)

MIN_GENRE_SAMPLES = 30
MODEL_PATH = MODELS_DIR / "genre_classifier.joblib"
MAX_CHARS_PER_SCRIPT = 40_000


def _genres_list(raw) -> list[str]:
    if not isinstance(raw, str) or not raw.strip():
        return []
    return [g.strip() for g in re.split(r"[,\|]", raw) if g.strip()]


def _script_sample(path: str | None) -> str:
    if not path or not Path(path).exists():
        return ""
    try:
        text = Path(path).read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""
    return text[:MAX_CHARS_PER_SCRIPT]


def _training_frame():
    """Rows of (text, genre_list) mixing scripts with metadata plot text."""
    import pandas as pd

    meta = pd.read_csv(META_CSV, dtype={"imdbid": str})
    meta["imdbid"] = meta["imdbid"].str.zfill(7)
    idx = load_index()

    rows = []
    seen = set()
    for _, r in idx.iterrows():
        imdbid = str(r["imdbid"]).zfill(7)
        m = meta[meta["imdbid"] == imdbid]
        if m.empty:
            continue
        genres = _genres_list(m.iloc[0].get("genres"))
        if not genres:
            continue
        script_text = _script_sample(r.get("script_path"))
        meta_parts = [str(m.iloc[0].get(c)) for c in ("plot", "keywords", "synopsis", "plot outline", "title")]
        meta_text = " ".join(p for p in meta_parts if isinstance(p, str))
        text = script_text + (" " + meta_text if script_text else "")
        if not text:
            text=meta_text
        if len(text) < 200:
            continue
        rows.append((text, genres, "script" if script_text else "meta"))
        seen.add(imdbid)

    # add metadata-only rows for movies without scripts (more coverage)
    for _, m in meta.iterrows():
        imdbid = str(m["imdbid"]).zfill(7)
        if imdbid in seen:
            continue
        genres = _genres_list(m.get("genres"))
        if not genres:
            continue
        parts = [str(m.get(c)) for c in ("plot", "keywords", "synopsis", "plot outline", "title")]
        text = " ".join(p for p in parts if isinstance(p, str))
        if len(text) < 100:
            continue
        rows.append((text, genres, "meta"))
    return pd.DataFrame(rows, columns=["text", "genre_list", "source"])


def train_model(force: bool = False) -> dict:
    """Train an OneVsRest TF-IDF + LogisticRegression genre classifier."""
    if MODEL_PATH.exists() and not force:
        return {"from_cache": True}

    from joblib import dump
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.multioutput import MultiOutputClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import f1_score

    df = _training_frame()
    all_genres = sorted({g for gl in df["genre_list"] for g in gl if len(g) > 1})
    counts = {g: df["genre_list"].apply(lambda gl: g in gl).sum() for g in all_genres}
    keep = [g for g in all_genres if counts[g] >= MIN_GENRE_SAMPLES]
    logger.info("Training genre classifier over %s genres (%s samples)",
                len(keep), len(df))

    y_mat = pd.DataFrame(
        df["genre_list"].apply(lambda gl: [g in gl for g in keep]).tolist(),
        columns=keep,
    ).astype(int)
    keep_rows = y_mat.sum(axis=1) > 0
    X = df.loc[keep_rows, "text"]
    Y = y_mat.loc[keep_rows]

    clf = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english",
                                      max_features=60000, min_df=5)),
            ("clf", MultiOutputClassifier(
                LogisticRegression(C=1.0, max_iter=2000)
            )),
        ]
    )
    clf.fit(X, Y)

    try:
        Xtr, Xte, Ytr, Yte = train_test_split(X, Y, test_size=0.2, random_state=42)
        clf2 = Pipeline(clf.steps)
        clf2.fit(Xtr, Ytr)
        pred = clf2.predict(Xte)
        micro = f1_score(Yte, pred, average="micro", zero_division=0)
        macro = f1_score(Yte, pred, average="macro", zero_division=0)
        logger.info("Hold-out genre F1 -> micro=%.3f macro=%.3f", micro, macro)
    except Exception as exc:
        logger.warning("Hold-out eval skipped: %s", exc)

    dump({"clf": clf, "genres": keep}, MODEL_PATH)
    logger.info("Saved classifier to %s (%s samples)", MODEL_PATH, len(X))
    return {"model": clf, "genres": keep, "from_cache": False}


def _load_model():
    from joblib import load

    return load(MODEL_PATH)


def load_classifier():
    """Load the trained classifier, or return (None, []) if not trained yet.

    Training is intentionally NOT triggered on demand here — that happens
    explicitly via setup.py / train_model() to avoid long stalls inside a request.
    """
    if not MODEL_PATH.exists():
        logger.warning("Genre classifier model missing (%s); call setup.py / train_model() first.", MODEL_PATH)
        return None, []
    data = _load_model()
    if isinstance(data, dict):
        return data.get("clf"), data.get("genres", [])
    return data, []


def predict_genres(text: str, top_n: int = 5) -> list[dict]:
    clf, genres = load_classifier()
    if clf is None or not genres:
        return []
    try:
        probs = clf.predict_proba([text])
    except Exception as exc:
        logger.warning("Genre prediction failed: %s", exc)
        return [] 
    scored = []
    for i, g in enumerate(genres[: len(probs)]):
        p = probs[i]
        # A target that only ever saw one class exposes shape (n_samples, 1)
        pos = float(p[0][1]) if p.shape[1] > 1 else 0.0
        scored.append({"genre": g, "score": round(pos, 4)})
    scored.sort(key=lambda x: -x["score"])
    top = [s for s in scored if s["score"] >= 0.25][:top_n]
    if not top:
        top = scored[:1]
    return top