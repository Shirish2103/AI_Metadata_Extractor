"""Recompute cached sentiment/emotion aggregates in outputs/*.json.gz in place.

`src/sentiment.aggregate_sentiment` / `aggregate_emotion` changed (fixing the
"every movie reads as neutral" bug -- see src/sentiment.py), but that's an
aggregation-only change: per-line VADER scores are untouched. Every file
tagged with `include_dialogue=True` (which `scripts/tag_corpus.py` always
uses) still has those original per-line scores cached in
`segments[].dialogue[].sentiment` / `.emotion`, so scene-level and overall
sentiment/emotion can be recomputed offline from the cache alone -- no raw
script text or the Kaggle dataset required.

Files with no cached dialogue (i.e. tagged with `include_dialogue=False`,
via `/tag` or `/tag/upload` without the flag) are skipped and reported,
since there's nothing to recompute from.
"""

import argparse
import gzip
import json
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tqdm import tqdm

from src import sentiment
from src.config import OUTPUTS_DIR

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("recompute_sentiment")


def recompute_file(path: Path) -> str:
    """Return 'updated', 'unchanged', or 'skipped' (no cached dialogue)."""
    with gzip.open(path, "rt", encoding="utf-8") as f:
        meta = json.load(f)

    segments = meta.get("segments", [])
    if not any(s.get("dialogue") for s in segments):
        return "skipped"

    all_sents, all_emos = [], []
    changed = False
    for seg in segments:
        dialogue = seg.get("dialogue", [])
        seg_sents = [d["sentiment"] for d in dialogue if d.get("sentiment")]
        seg_emos = [d.get("emotion") for d in dialogue]
        all_sents.extend(seg_sents)
        all_emos.extend(seg_emos)

        new_sent = sentiment.aggregate_sentiment(seg_sents)
        new_emo = sentiment.aggregate_emotion(seg_emos)
        if seg.get("sentiment") != new_sent or seg.get("emotion") != new_emo:
            changed = True
        seg["sentiment"] = new_sent
        seg["emotion"] = new_emo

    overall = meta.setdefault("overall", {})
    new_overall_sent = sentiment.aggregate_sentiment(all_sents)
    new_overall_emo = sentiment.aggregate_emotion(all_emos)
    if overall.get("sentiment") != new_overall_sent or overall.get("emotion") != new_overall_emo:
        changed = True
    overall["sentiment"] = new_overall_sent
    overall["emotion"] = new_overall_emo

    if not changed:
        return "unchanged"

    with gzip.open(path, "wt", encoding="utf-8") as f:
        json.dump(meta, f, separators=(",", ":"))
    return "updated"


def main(outputs_dir: Path = OUTPUTS_DIR):
    files = sorted(outputs_dir.glob("*.json.gz"))
    print(f"[INFO] Recomputing sentiment/emotion aggregates for {len(files)} cached files...")

    counts = {"updated": 0, "unchanged": 0, "skipped": 0, "error": 0}
    skipped_titles = []
    for path in tqdm(files, desc="Recomputing", unit="file"):
        try:
            result = recompute_file(path)
            counts[result] += 1
            if result == "skipped":
                skipped_titles.append(path.name)
        except Exception as exc:
            counts["error"] += 1
            logger.warning("Failed on %s: %s", path.name, exc)

    print("\n[SUCCESS] Recompute complete!")
    print(f"   - Updated (sentiment/emotion changed): {counts['updated']}")
    print(f"   - Unchanged (already matched new math): {counts['unchanged']}")
    print(f"   - Skipped (no cached per-line dialogue): {counts['skipped']}")
    print(f"   - Errors: {counts['error']}")
    if skipped_titles:
        print("   Skipped files (re-tag these via the UI/API to fix):")
        for name in skipped_titles:
            print(f"     - {name}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(
        description="Recompute cached sentiment/emotion aggregates in outputs/ in place, "
        "from already-cached per-line VADER scores (no raw dataset needed)."
    )
    ap.parse_args()
    main()
