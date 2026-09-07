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

            current_model = str(data.get("summary", {}).get("model", "") if isinstance(data.get("summary"), dict) else "")
            has_logline = bool(isinstance(data.get("summary"), dict) and data["summary"].get("logline"))
            needs_update = "summary" not in data or not data["summary"] or "Offline Fallback" in current_model or not has_logline

            if needs_update:
                sample_text = ""
                imdb_id = str(data.get("imdb_id") or "").strip()
                if imdb_id and imdb_id != "0000000":
                    try:
                        from src import corpus
                        sample_text = corpus.read_script(imdb_id)
                    except Exception:
                        pass

                if not sample_text:
                    lines = []
                    for seg in data.get("segments", []):
                        h = seg.get("heading")
                        if h:
                            lines.append(f"[{h}]")
                        for d in seg.get("dialogue", []):
                            spk = d.get("speaker")
                            txt = d.get("text")
                            if txt:
                                lines.append(f"{spk}: {txt}" if spk else txt)
                    sample_text = "\n".join(lines) if lines else data.get("title", "")

                top_speakers = [s.get("name") for s in data.get("speakers", []) if isinstance(s, dict) and s.get("name")][:6]
                data["summary"] = summarize.generate(sample_text, title=data.get("title", ""), characters=top_speakers)

                with gzip.open(filepath, "wt", encoding="utf-8") as gz:
                    json.dump(data, gz, ensure_ascii=False)
                updated += 1
        except Exception as err:
            print(f"Error processing {filepath}: {err}")

        if idx % 200 == 0 or idx == len(files):
            print(f"Processed {idx}/{len(files)} files (Updated {updated})...")

    print(f"Done! Successfully updated {updated} files with summaries.")


if __name__ == "__main__":
    main()
