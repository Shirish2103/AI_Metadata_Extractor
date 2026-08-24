"""Evaluation of the metadata-tagging pipeline against ground-truth annotations.

- Structural parsing vs rule_based_annotations (scene count, speaker recovery)
- Line-type classification vs BERT/manual annotations
- Keyword quality vs movie_meta_data keywords column
"""

import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

from src import corpus, parser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("evaluate")

LABEL_MAP = {
    "heading": "scene_heading",
    "speaker": "speaker_heading",
    "dialog": "dialog",
    "action": "text",
    "transition": "text",
    "pagenum": "text",
    "parenthetical": "dialog",
    "blank": "text",
}


def eval_scene_segmentation(sample: int = 40, seed: int = 7) -> dict:
    idx = corpus.load_index()
    pool = idx[idx["has_rule_based"]]
    pool = pool.sample(min(sample, len(pool)), random_state=seed)
    exact = close = total = 0
    diffs = []
    for _, row in pool.iterrows():
        imdb = str(row["imdbid"]).zfill(7)
        try:
            text = corpus.read_script(imdb)
            rb = corpus.rule_based_annotation(imdb)
        except Exception:
            continue
        if not rb:
            continue
        parsed = parser.parse_script(text, imdb_id=imdb)
        gt_scenes = len(rb)
        pred_scenes = len(parsed.scenes)
        total += 1
        if pred_scenes == gt_scenes:
            exact += 1
        if abs(pred_scenes - gt_scenes) <= max(2, 0.05 * gt_scenes):
            close += 1
        diffs.append(pred_scenes - gt_scenes)
    return {
        "n": total,
        "exact_match": round(exact / total, 3) if total else 0,
        "within_5pct": round(close / total, 3) if total else 0,
        "mean_abs_diff": round(sum(abs(d) for d in diffs) / total, 2) if total else 0,
    }


def eval_line_types(sample: int = 40, seed: int = 7) -> dict:
    idx = corpus.load_index()
    pool = idx[idx["has_bert_anno"] | idx["has_manual_anno"]]
    pool = pool.sample(min(sample, len(pool)), random_state=seed)
    tp = fp = tn = fn = 0
    correct = total = 0
    for _, row in pool.iterrows():
        imdb = str(row["imdbid"]).zfill(7)
        try:
            text = corpus.read_script(imdb)
            anno = corpus.line_label_annotations(imdb)
        except Exception:
            continue
        if not anno:
            continue
        lines = parser.preprocess_lines(text)
        tags = parser.classify_lines(lines)
        # align annotation lines to script lines heuristically by stripping
        anno_clean = [(lab, a.strip()) for lab, a in anno]
        for i, raw in enumerate(lines):
            t = raw.strip()
            if not t:
                continue
            # find matching annotation for this line text
            match = next((lab for lab, a in anno_clean if a == t), None)
            if match is None:
                continue
            pred = LABEL_MAP.get(tags[i], "text")
            # collapse dialog vs text classes for a lenient macro comparison
            total += 1
            if pred == match:
                correct += 1
            # speaker detection metrics (binary)
            if match == "speaker_heading":
                if pred == "speaker_heading":
                    tp += 1
                else:
                    fn += 1
            elif pred == "speaker_heading":
                fp += 1
    prec = tp / (tp + fp) if tp + fp else 0
    rec = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    return {
        "n_lines": total,
        "line_accuracy": round(correct / total, 3) if total else 0,
        "speaker_precision": round(prec, 3),
        "speaker_recall": round(rec, 3),
        "speaker_f1": round(f1, 3),
    }


def eval_speakers(sample: int = 40, seed: int = 7) -> dict:
    """Speaker recovery vs rule_based_annotations speaker/title entries."""
    from src.parser import normalize_speaker

    idx = corpus.load_index()
    pool = idx[idx["has_rule_based"]].sample(min(sample, len(idx[idx["has_rule_based"]])),
                                             random_state=seed)
    tp = fp = fn = 0
    for _, row in pool.iterrows():
        imdb = str(row["imdbid"]).zfill(7)
        try:
            text = corpus.read_script(imdb)
            rb = corpus.rule_based_annotation(imdb)
        except Exception:
            continue
        if not rb:
            continue
        gt = set()
        for scene in rb:
            for block in scene:
                if block.get("head_type") == "speaker/title":
                    n = normalize_speaker(block.get("head_text", {}).get("speaker/title"))
                    if n:
                        gt.add(n)
        parsed = parser.parse_script(text, imdb_id=imdb)
        pred = set(parsed.speakers)
        tp += len(pred & gt)
        fp += len(pred - gt)
        fn += len(gt - pred)
    prec = tp / (tp + fp) if tp + fp else 0
    rec = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0
    return {
        "n": len(pool),
        "speaker_precision": round(prec, 3),
        "speaker_recall": round(rec, 3),
        "speaker_f1": round(f1, 3),
    }


def eval_keywords(sample: int = 40, seed: int = 7, top_n: int = 15) -> dict:
    from src import topics

    idx = corpus.load_index()
    pool = idx[idx["keywords"].notna()]
    pool = pool.sample(min(sample, len(pool)), random_state=seed)
    hits = total = 0
    for _, row in pool.iterrows():
        imdb = str(row["imdbid"]).zfill(7)
        kw = [k.strip().lower() for k in str(row["keywords"]).split(",") if k.strip()]
        if not kw:
            continue
        try:
            text = corpus.read_script(imdb)
            p = parser.parse_script(text, imdb_id=imdb)
            top = [t["keyword"].lower() for t in topics.overall_topics(p, top_n=top_n)]
        except Exception:
            continue
        joined = " ".join(top)
        overlap = sum(1 for k in kw if k in joined)
        total += 1
        hits += overlap > 0
    return {
        "n": total,
        "movies_with_keyword_overlap": round(hits / total, 3) if total else 0,
    }


def run_all(sample: int = 30):
    print("== Scene segmentation (vs rule_based) ==")
    print(eval_scene_segmentation(sample))
    print("== Line-type classification (vs BERT/manual) ==")
    print(eval_line_types(sample))
    print("== Speaker recovery (vs rule_based) ==")
    print(eval_speakers(sample))
    print("== Keyword overlap (vs metadata keywords) ==")
    print(eval_keywords(sample))


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=30)
    args = ap.parse_args()
    run_all(args.sample)