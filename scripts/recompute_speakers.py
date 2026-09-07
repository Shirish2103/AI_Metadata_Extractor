import gzip
import json
import glob
import re
from pathlib import Path
from src import corpus, parser, speakers, ner

def update_output(path_str: str):
    p = Path(path_str)
    print(f"\nProcessing {p.name} ...")
    with gzip.open(p, "rt", encoding="utf-8") as f:
        meta = json.load(f)

    imdb_id = meta.get("imdb_id", "")
    title = meta.get("title", "")
    
    # Read raw script
    try:
        raw_text = corpus.read_script(imdb_id)
    except Exception as e:
        print(f"  Could not read raw script for {imdb_id}: {e}")
        return

    parsed = parser.parse_script(raw_text, title=title, imdb_id=imdb_id)
    new_speaker_stats = speakers.speaker_stats(parsed)
    canonical_map = speakers.build_canonical_speaker_mapping(parsed)

    meta["speakers"] = new_speaker_stats

    # Update segments
    for seg in meta.get("segments", []):
        old_spks = seg.get("speakers", [])
        new_spks = []
        for sp in old_spks:
            norm = parser.normalize_speaker(sp)
            if not norm:
                continue
            sub_spks = [norm]
            if " AND " in norm.upper() or " & " in norm:
                parts = re.split(r"\s+(?:AND|&)\s+", norm, flags=re.IGNORECASE)
                sub_spks = [parser.normalize_speaker(x) for x in parts if parser.normalize_speaker(x)]
            for s_name in sub_spks:
                cname = canonical_map.get(s_name, s_name)
                if cname and cname not in new_spks:
                    s_dict = {"name": cname, "lines": 1}
                    if speakers._is_plausible_speaker(s_dict, min_lines=0):
                        new_spks.append(cname)
        seg["speakers"] = new_spks

        # Update dialogue lines
        for d in seg.get("dialogue", []):
            raw_spk = d.get("speaker")
            if raw_spk:
                norm = parser.normalize_speaker(raw_spk)
                clean = canonical_map.get(norm, norm) if norm else raw_spk
                d["speaker"] = clean

    # Update overall entities person_matches_speakers
    if "overall" in meta and "entities" in meta["overall"]:
        meta["overall"]["entities"] = ner.person_matches_speakers(meta["overall"]["entities"], parsed)

    # Save back
    with gzip.open(p, "wt", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False)
    print(f"  Successfully updated {p.name}! Top 5 characters: {[s['name'] for s in new_speaker_stats[:5]]}")

if __name__ == "__main__":
    for p in sorted(glob.glob("outputs/*.json.gz")):
        update_output(p)
