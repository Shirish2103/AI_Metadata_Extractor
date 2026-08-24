import re
from dataclasses import dataclass, field

SCENE_HEADING_RE = re.compile(
    r"^(?P<interior>INT\.?|EXT\.?|INT\./EXT\.?|EXT\./INT\.?|I\.?/E\.?|EST\.?)(?=\s|$)",
    re.IGNORECASE,
)
TRANSITION_RE = re.compile(
    r"^(FADE\s+(IN|OUT|TO)|CUT\s+TO|DISSOLVE\s+TO|SMASH\s+CUT|MATCH\s+CUT|JUMP\s+CUT|"
    r"HARD\s+CUT|LAP\s+DISSOLVE|WIPE\s+TO|IRIS\s+(IN|OUT)|THE\s+END)\b.*$",
    re.IGNORECASE,
)
SPEAKER_LINE_RE = re.compile(r"^[A-Z][A-Z0-9 .'’/\-()]*$")
INLINE_SPEAKER_RE = re.compile(
    r"^(?P<speaker>[A-Z][A-Z0-9 .'’/\-()]{0,40}):\s?(?P<dialog>.+)$"
)
NAME_MODIFIERS_RE = re.compile(
    r"\s*\((cont'?d|v\.?o\.?|o\.?s\.?|off|on|singing|beat|whisper|to\s+\w+|through\s+\w+|"
    r"into\s+phone|in\s+phone|on\s+phone|over\s+phone)\)\s*$",
    re.IGNORECASE,
)
TIME_OF_DAY = (
    r"DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|LATER|CONTINUOUS|SAME\s+TIME|"
    r"MOMENTS?\s+LATER|DAYS?\s+LATER|NIGHTS?\s+LATER|WEEKS?\s+LATER|"
    r"MONTHS?\s+LATER|YEARS?\s+LATER|FLASHBACK|F\.?B\.?|"
    r"PRESENT\s+DAY|BEFORE\s+DAWN|AURORA|AFTERNOON|NOON|"
    r"TWILIGHT|SUNSET|SUNRISE|NEXT\s+(DAY|MORNING|NIGHT)"
)
TIME_RE = re.compile(rf"^(?P<tod>{TIME_OF_DAY})", re.IGNORECASE)
HEADING_SPLIT_RE = re.compile(r"\s+-\s+|\s+–\s+|\s-\s|\s–\s")


@dataclass
class DialogueLine:
    speaker: str | None
    text: str
    parenthetical: str | None = None


@dataclass
class Scene:
    index: int
    heading: str
    interior: str | None
    location: str | None
    time_of_day: str | None
    dialogue: list[DialogueLine] = field(default_factory=list)
    action: list[str] = field(default_factory=list)
    transitions: list[str] = field(default_factory=list)
    raw_lines: list[str] = field(default_factory=list)


@dataclass
class ParsedScript:
    title: str
    imdb_id: str = ""
    scenes: list[Scene] = field(default_factory=list)

    @property
    def all_dialogue(self) -> list[DialogueLine]:
        return [d for s in self.scenes for d in s.dialogue]

    @property
    def all_action(self) -> list[str]:
        return [a for s in self.scenes for a in s.action]

    @property
    def speakers(self) -> list[str]:
        out, seen = [], set()
        for d in self.all_dialogue:
            n = normalize_speaker(d.speaker) if d.speaker else None
            if n and n not in seen:
                seen.add(n)
                out.append(n)
        return out


def normalize_speaker(name: str | None) -> str | None:
    if not name:
        return None
    name = name.strip().strip(":").strip()
    prev = None
    while prev != name:
        prev = name
        name = NAME_MODIFIERS_RE.sub("", name).strip()
    name = name.strip("()[]")
    return name or None


def _looks_like_dialogue(lines: list[str], i: int, tags: list[str]) -> bool:
    j = i + 1
    while j < len(lines):
        t = lines[j].strip()
        if not t:
            j += 1
            continue
        if t.startswith("(") and t.endswith(")"):
            j += 1
            continue
        tag = tags[j]
        if tag in ("heading", "transition", "pagenum"):
            return False
        if is_speaker_candidate(t):
            return False
        return True
    return False


def is_speaker_candidate(t: str) -> bool:
    if not t or len(t) > 45:
        return False
    if re.search(r"[.!?]+\s*$", t):
        return False
    if re.search(r"-+\s*$", t):  # "OPEN ON -", "REVEAL -", "CUT TO -"
        return False
    if not re.search(r"[A-Za-z]", t):
        return False
    # all letters must be uppercase (allow digits and punctuation)
    letters = [c for c in t if c.isalpha()]
    if not letters:
        return False
    return all(c.isupper() for c in letters)


def parse_heading(heading: str) -> tuple[str | None, str | None, str | None]:
    m = SCENE_HEADING_RE.match(heading)
    if not m:
        return None, None, None
    interior = m.group("interior").upper().rstrip(".") or None
    rest = heading[m.end():].strip()
    parts = HEADING_SPLIT_RE.split(rest, maxsplit=1)
    location = parts[0].strip() if parts and parts[0].strip() else None
    time_of_day = None
    if len(parts) > 1:
        tod = parts[1].strip().rstrip(".")
        tm = TIME_RE.match(tod)
        time_of_day = tm.group("tod") if tm else tod
    return interior, location, time_of_day


def preprocess_lines(text: str) -> list[str]:
    text = text.replace("\ufeff", "")
    raw = text.splitlines()
    lines = []
    for line in raw:
        stripped = line.rstrip()
        lines.append(stripped)
    return lines


def classify_lines(lines: list[str]) -> list[str]:
    """Return per-line tags: heading/transition/pagenum/parenthetical/speaker/dialog/action."""
    n = len(lines)
    tags = [""] * n

    for i, line in enumerate(lines):
        t = line.strip()
        if not t:
            tags[i] = "blank"
        elif SCENE_HEADING_RE.match(t):
            tags[i] = "heading"
        elif TRANSITION_RE.match(t):
            tags[i] = "transition"
        elif re.fullmatch(r"\d+(?:\s+\d+)?\.?", t):
            tags[i] = "pagenum"
        elif t.startswith("(") and t.endswith(")"):
            tags[i] = "parenthetical"

    i = 0
    pending_speaker: str | None = None
    while i < n:
        if tags[i] in ("heading", "transition", "pagenum"):
            pending_speaker = None
            i += 1
            continue
        if tags[i] == "blank":
            i += 1
            continue
        t = lines[i].strip()
        if tags[i] == "parenthetical":
            i += 1
            continue
        m = INLINE_SPEAKER_RE.match(t)
        if m:
            tags[i] = "speaker"
            pending_speaker = m.group("speaker").strip()
            i += 1
            continue
        if pending_speaker and not is_speaker_candidate(t):
            tags[i] = "dialog"
            i += 1
            continue
        if is_speaker_candidate(t) and _looks_like_dialogue(lines, i, tags):
            tags[i] = "speaker"
            pending_speaker = t
            i += 1
            continue
        tags[i] = "action"
        pending_speaker = None
        i += 1
    return tags


def parse_script(text: str, title: str = "", imdb_id: str = "") -> ParsedScript:
    lines = preprocess_lines(text)
    tags = classify_lines(lines)
    scenes: list[Scene] = []
    current: Scene | None = None
    pending_speaker: str | None = None
    pending_parenthetical: str | None = None

    def start_scene(i: int):
        nonlocal current, pending_speaker, pending_parenthetical
        heading = lines[i].strip()
        interior, location, tod = parse_heading(heading)
        current = Scene(index=len(scenes), heading=heading, interior=interior,
                        location=location, time_of_day=tod)
        scenes.append(current)
        pending_speaker = None
        pending_parenthetical = None

    for i, tag in enumerate(tags):
        if tag == "blank":
            continue
        t = lines[i].strip()
        if tag == "heading":
            start_scene(i)
            continue
        if current is None:
            start_scene(i) if SCENE_HEADING_RE.match(t) else None
            if current is None:
                current = Scene(index=0, heading="", interior=None, location=None, time_of_day=None)
                scenes.append(current)
        if tag == "pagenum":
            continue
        if tag == "transition":
            current.transitions.append(t)
            continue
        if tag == "speaker":
            m = INLINE_SPEAKER_RE.match(t)
            if m:
                pending_speaker = m.group("speaker").strip()
                pending_parenthetical = None
                if m.group("dialog").strip():
                    current.dialogue.append(DialogueLine(speaker=pending_speaker,
                                                         text=m.group("dialog").strip()))
                continue
            pending_speaker = t
            pending_parenthetical = None
            continue
        if tag == "parenthetical":
            pending_parenthetical = t
            continue
        if tag == "dialog":
            current.dialogue.append(DialogueLine(speaker=pending_speaker, text=t,
                                                 parenthetical=pending_parenthetical))
            pending_parenthetical = None
            continue
        # action
        current.action.append(t)
        pending_speaker = None
        pending_parenthetical = None

    return ParsedScript(title=title or _title_from_text(text), imdb_id=imdb_id, scenes=scenes)


def _title_from_text(text: str) -> str:
    for line in text.splitlines()[:30]:
        t = line.strip()
        if t and not t.isspace() and len(t) < 80 and all(
            c.isupper() or c.isspace() or c in ":-'’&.,!?" for c in t
        ):
            return t
    return ""


def parse_character_file(text: str) -> list[tuple[str, str, str]]:
    """Parse `N) K) label: data` format -> list of (label, data, segment)."""
    out = []
    for line in text.splitlines():
        m = re.match(r"^\s*\d+\)\s*\d+\)\s*(dialog|text):\s?(.*)$", line)
        if m:
            out.append((m.group(1), m.group(2), ""))
        else:
            out.append(("raw", line, ""))
    return out


def dialogue_word_count(script: ParsedScript) -> int:
    return sum(len(d.text.split()) for d in script.all_dialogue)