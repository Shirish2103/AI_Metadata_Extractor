"""Sentiment & emotion analysis: VADER baseline + optional transformer models."""

import logging
import os
import warnings
from functools import lru_cache

os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _vader():
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

        return SentimentIntensityAnalyzer()
    except Exception:
        try:
            import nltk
            from nltk.sentiment.vader import SentimentIntensityAnalyzer

            try:
                return SentimentIntensityAnalyzer()
            except Exception:
                nltk.download("vader_lexicon", quiet=True)
                return SentimentIntensityAnalyzer()
        except Exception as exc:
            logger.warning("VADER analyzer initialization failed: %s", exc)
            return None


def vader_sentiment(text: str) -> dict:
    if not text or not isinstance(text, str):
        return {"compound": 0.0, "pos": 0.0, "neg": 0.0, "neu": 1.0, "label": "neutral"}
    try:
        analyzer = _vader()
        if analyzer is None:
            return {"compound": 0.0, "pos": 0.0, "neg": 0.0, "neu": 1.0, "label": "neutral"}
        scores = analyzer.polarity_scores(text)
        compound = float(scores.get("compound", 0.0))
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"
        return {
            "compound": round(compound, 4),
            "pos": round(float(scores.get("pos", 0.0)), 4),
            "neg": round(float(scores.get("neg", 0.0)), 4),
            "neu": round(float(scores.get("neu", 1.0)), 4),
            "label": label,
        }
    except Exception as exc:
        logger.warning("vader_sentiment failed: %s", exc)
        return {"compound": 0.0, "pos": 0.0, "neg": 0.0, "neu": 1.0, "label": "neutral"}


@lru_cache(maxsize=1)
def _emotion_pipeline():
    try:
        from transformers import logging as tf_logging, pipeline
        tf_logging.set_verbosity_error()

        return pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            device=-1,
        )
    except Exception as exc:
        logger.info("Transformer emotion model unavailable: %s", exc)
        return None


@lru_cache(maxsize=1)
def _sentiment_pipeline():
    try:
        from transformers import logging as tf_logging, pipeline
        tf_logging.set_verbosity_error()

        return pipeline(
            "text-classification",
            model="cardiffnlp/twitter-roberta-base-sentiment",
            top_k=None,
            device=-1,
        )
    except Exception as exc:
        logger.info("Transformer sentiment model unavailable: %s", exc)
        return None


def _normalize_label(label: str) -> str:
    return {"LABEL_0": "negative", "LABEL_1": "neutral", "LABEL_2": "positive"}.get(
        label, label.lower()
    )


def transformer_emotion(texts: list[str], batch_size: int = 16) -> list[dict | None]:
    pipe = _emotion_pipeline()
    if pipe is None:
        return [None] * len(texts)
    out = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            res = pipe(batch)
            if not isinstance(res, list):
                res = [res]
            for r in res:
                if isinstance(r, list):
                    r_sorted = sorted(r, key=lambda x: -x.get("score", 0))
                    out.append(
                        {
                            "label": r_sorted[0]["label"],
                            "scores": {x["label"]: round(x["score"], 4) for x in r_sorted},
                        }
                    )
                else:
                    out.append(None)
        except Exception as exc:
            logger.warning("emotion batch failed: %s", exc)
            out.extend([None] * len(batch))
    return out


def transformer_sentiment(texts: list[str], batch_size: int = 16) -> list[dict | None]:
    pipe = _sentiment_pipeline()
    if pipe is None:
        return [None] * len(texts)
    out = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            res = pipe(batch)
            if not isinstance(res, list):
                res = [res]
            for r in res:
                if isinstance(r, list):
                    r_sorted = sorted(r, key=lambda x: -x.get("score", 0))
                    out.append(
                        {
                            "label": _normalize_label(r_sorted[0]["label"]),
                            "scores": {
                                _normalize_label(x["label"]): round(x["score"], 4) for x in r_sorted
                            },
                        }
                    )
                else:
                    out.append(None)
        except Exception as exc:
            logger.warning("sentiment batch failed: %s", exc)
            out.extend([None] * len(batch))
    return out


def aggregate_sentiment(items: list[dict]) -> dict:
    """Roll up per-line VADER scores into one label + score for a scene/movie."""
    valid = [
        i for i in items
        if i and isinstance(i, dict) and i.get("compound") is not None
    ]
    if not valid:
        return {"compound": 0.0, "label": "neutral", "n": 0}

    compounds = []
    for i in valid:
        try:
            compounds.append(float(i["compound"]))
        except (ValueError, TypeError):
            pass

    if not compounds:
        return {"compound": 0.0, "label": "neutral", "n": 0}

    positive = sum(1 for c in compounds if c >= 0.05)
    negative = sum(1 for c in compounds if c <= -0.05)
    neutral = len(compounds) - positive - negative
    polar = positive + negative

    if polar:
        net_ratio = (positive - negative) / polar
        avg_polar_strength = sum(abs(c) for c in compounds if abs(c) >= 0.05) / polar
        score = net_ratio * avg_polar_strength
    else:
        score = sum(compounds) / len(compounds)

    label = "positive" if score >= 0.05 else "negative" if score <= -0.05 else "neutral"
    return {
        "compound": round(score, 4),
        "label": label,
        "n": len(compounds),
        "positive": positive,
        "negative": negative,
        "neutral": neutral,
    }


def aggregate_emotion(items: list[dict | None]) -> dict:
    present = [i for i in items if i and isinstance(i, dict) and i.get("label")]
    if not present:
        return {"label": None, "distribution": {}, "n": 0}
    counts: dict[str, int] = {}
    for i in present:
        lbl = str(i["label"])
        counts[lbl] = counts.get(lbl, 0) + 1
    if not counts:
        return {"label": None, "distribution": {}, "n": 0}
    label = max(counts, key=counts.get)
    return {
        "label": label,
        "distribution": counts,
        "n": len(present),
    }