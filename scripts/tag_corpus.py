"""Offline metadata generation for the whole corpus (cached to outputs/)."""

import argparse
import logging
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tqdm import tqdm

from src import corpus, pipeline

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("tag_corpus")


def process_single_script(row, use_transformers: bool = False) -> tuple[str, bool]:
    imdb = str(row["imdbid"]).zfill(7)
    title = row.get("title") or ""

    # Check if already cached
    if pipeline.load_cached_metadata(imdb) is not None:
        return imdb, True

    try:
        text = corpus.read_script(imdb)
        meta = pipeline.tag_script(
            text,
            imdb_id=imdb,
            title=title,
            use_transformers=use_transformers,
            include_dialogue=True,
        )
        pipeline.save_metadata(imdb, meta)
        return imdb, True
    except Exception as exc:
        logger.warning("Failed processing IMDb %s (%s): %s", imdb, title, exc)
        return imdb, False


def main(limit: int = 0, use_transformers: bool = False, workers: int = 8):
    idx = corpus.load_index()
    if limit:
        idx = idx.head(limit)

    total_scripts = len(idx)
    print(
        f"[INFO] Starting batch metadata generation for {total_scripts} movies using {workers} parallel workers..."
    )

    done = 0
    errors = 0

    rows = [row for _, row in idx.iterrows()]

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(process_single_script, row, use_transformers): row for row in rows
        }

        with tqdm(total=total_scripts, desc="Processing Movies", unit="script") as pbar:
            for future in as_completed(futures):
                try:
                    _, success = future.result()
                    if success:
                        done += 1
                    else:
                        errors += 1
                except Exception:
                    errors += 1
                pbar.update(1)

    print(f"\n[SUCCESS] Batch Processing Complete!")
    print(f"   - Successfully Tagged & Cached: {done}")
    print(f"   - Errors / Failed: {errors}")
    print(f"   - Compressed Output Directory: outputs/")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(
        description="Pre-generate metadata for corpus movies into outputs/"
    )
    ap.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Process only first N scripts (0 for all 2800+)",
    )
    ap.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Number of parallel worker threads (default: 8)",
    )
    ap.add_argument(
        "--transformers",
        action="store_true",
        help="Use transformer emotion models (slower)",
    )
    args = ap.parse_args()

    main(limit=args.limit, use_transformers=args.transformers, workers=args.workers)