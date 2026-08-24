"""Precompute and attach summary to all cached outputs/*.json.gz files."""

import glob
import gzip
import json
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src import summarize


def main():
    files = glob.glob(os.path.join(PROJECT_ROOT, "outputs", "*.json.gz"))
    print(f"Found {len(files)} output files to process...")

    updated = 0
    for idx, filepath in enumerate(files, 1):
        try:
            with gzip.open(filepath, "rt", encoding="utf-8") as gz:
                data = json.load(gz)

            if "summary" not in data or not data["summary"]:
                lines = []
                for seg in data.get("segments", []):
                    for d in seg.get("dialogue", []):
                        if d.get("text"):
                            lines.append(d["text"])
                sample_text = "\n".join(lines) if lines else data.get("title", "")
                data["summary"] = summarize.generate(sample_text, title=data.get("title", ""))

                with gzip.open(filepath, "wt", encoding="utf-8") as gz:
                    json.dump(data, gz)
                updated += 1
        except Exception as err:
            print(f"Error processing {filepath}: {err}")

        if idx % 200 == 0 or idx == len(files):
            print(f"Processed {idx}/{len(files)} files (Updated {updated})...")

    print(f"Done! Successfully updated {updated} files with summaries.")


if __name__ == "__main__":
    main()
