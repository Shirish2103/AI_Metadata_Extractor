"""One-time setup: download models/data, build corpus index, train genre classifier."""

import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src import classify, corpus, ner

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("setup")


def main():
    logger.info("Building corpus index...")
    idx = corpus.build_index()
    logger.info("Indexed %s scripts (%.0f have rule-based annotations, %.0f have character files)",
                len(idx), idx["has_rule_based"].sum(), idx["has_characters"].sum())

    logger.info("Downloading NLTK stopwords...")
    import nltk

    nltk.download("stopwords", quiet=True)

    logger.info("Loading spaCy model (en_core_web_lg)...")
    nlp = ner.load_spacy("en_core_web_lg")
    if nlp is None:
        logger.warning("spaCy unavailable; NER will be skipped.")
    else:
        logger.info("spaCy ready: %s", nlp.meta["name"])

    logger.info("Training genre classifier...")
    res = classify.train_model(force=True)
    logger.info("Genre classifier ready (genres=%s)", len(res.get("genres", [])))

    logger.info("Setup complete.")


if __name__ == "__main__":
    main()