"""Time-based segmentation: map scenes to pseudo-timestamps.

Movie scripts carry no real timestamps, so we derive a plausible runtime
by assuming a target total duration (default ~2h) and giving each scene a
slice proportional to its dialogue word count (i.e. how much is spoken).
"""

DEFAULT_TOTAL_SECONDS = 7200


def _script_total_words(script) -> int:
    total = 0
    for scene in script.scenes:
        total += sum(len(d.text.split()) for d in scene.dialogue)
        total += sum(len(a.split()) for a in scene.action)
    return total


def assign_timestamps(script, total_seconds: int | None = None) -> list[dict]:
    if total_seconds is None:
        total_words = _script_total_words(script)
        # full-length movies run ~2h; short transcripts scale down (~0.75s per word)
        total_seconds = min(DEFAULT_TOTAL_SECONDS, max(60, int(total_words * 0.75)))
    weights = []
    for scene in script.scenes:
        dw = sum(len(d.text.split()) for d in scene.dialogue)
        aw = sum(len(a.split()) for a in scene.action)
        weights.append(max(dw, 1) + 0.25 * aw)
    total = sum(weights)
    segments = []
    cursor = 0.0
    for i, scene in enumerate(script.scenes):
        start = cursor
        if total > 0:
            duration = weights[i] / total * total_seconds
        else:
            duration = total_seconds / max(len(script.scenes), 1)
        end = start + duration
        cursor = end
        segments.append(
            {
                "segment_id": i + 1,
                "start_sec": round(start, 1),
                "end_sec": round(end, 1),
                "start": _fmt_ts(start),
                "end": _fmt_ts(end),
                "scene_index": scene.index,
            }
        )
    return segments


def _fmt_ts(seconds: float) -> str:
    s = int(round(seconds))
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h:d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"