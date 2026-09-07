import re
from dataclasses import dataclass, field

SCENE_HEADING_RE = re.compile(
    r"^(?P<interior>INT\.?|EXT\.?|INT\./EXT\.?|EXT\./INT\.?|I\.?/E\.?|EST\.?)(?=\s|$)",
    re.IGNORECASE,
)
TRANSITION_RE = re.compile(
    r"^(FADE\s+(?:IN|OUT|TO)|CUT\s+TO|DISSOLVE(?:\s+(?:TO|INTO))?|SMASH\s+CUT|MATCH\s+CUT|JUMP\s+CUT|"
    r"HARD\s+CUT|LAP\s+DISSOLVE|CROSS\s*FADE|TIME\s+(?:CUT|PASSAGE)|WIPE(?:\s+TO)?|IRIS\s+(?:IN|OUT)|THE\s+END)\b.*$",
    re.IGNORECASE,
)
SPEAKER_LINE_RE = re.compile(r"^[A-Z][A-Z0-9 .'’/\-()]*$")
INLINE_SPEAKER_RE = re.compile(
    r"^(?P<speaker>[A-Z][A-Z0-9 .'’/\-()]{0,40}):\s?(?P<dialog>.+)$"
)

# Camera / shot directions that look like ALL CAPS speaker names but are NOT characters.
# These must be excluded from speaker detection.
_CAMERA_DIRECTION_RE = re.compile(
    r"^(?:"
    r"ANGLE\s+ON|CLOSE\s+(?:ON|UP)|CUT\s+TO|DISSOLVE(?:\s+(?:TO|INTO))?|ESTABLISHING|"
    r"FADE\s+(?:IN|OUT|TO)|FROM\s+(?:UP\s+HIGH|ABOVE|BELOW)|"
    r"INSERT(?:\s*[-—:])?|MASTER\s+SHOT|MEDIUM\s+SHOT|"
    r"PAN\s+TO|P\.?O\.?V\.?|REVEAL|SMASH\s+CUT|SNAP\s+ZOOM|TILT|TRACKING|WIDE\s+SHOT|"
    r"ZOOM\s+(?:IN|OUT)?|DOLLY|CRANE|OVERHEAD|AERIAL|MONTAGE|SERIES\s+OF\s+SHOTS|"
    r"INTERCUT|SPLIT\s+SCREEN|SUPER(?:IMPOSE)?|CONTINUED|CONT'D|BLACK\s+SCREEN|"
    r"WHITE\s+SCREEN|ANGLE\s+ON|CLOSE\s+ON|ON\s+[A-Z]|WE\s+SEE|WE\s+HEAR|"
    r"WE\s+FOLLOW|WE\s+DRIFT|HIGH\s+ANGLE|LOW\s+ANGLE|BIRD'?S\s+EYE|"
    r"PULL\s+BACK|PUSH\s+IN|RACK\s+FOCUS|TIME\s+(?:CUT|PASSAGE)|MATCH\s+CUT|JUMP\s+CUT|"
    r"CROSS\s*FADE|WIPE(?:\s+TO)?|NEW\s+ANGLE|REVERSE\s+ANGLE|CLOSER|FLASH\s+TO|BACK\s+TO|VARIOUS\s+SHOTS|"
    r"CUE|BLACK|SCREENS?"
    r")\b",
    re.IGNORECASE,
)

# Screenplay title-page / front-matter patterns (writer credits, revision history).
_FRONT_MATTER_RE = re.compile(
    r"\b(revisions?\s+by|written\s+by|screenplay\s+by|story\s+by|based\s+on|"
    r"current\s+revisions?|final\s+draft|shooting\s+draft|earlier\s+draft|"
    r"revisions?:)\b",
    re.IGNORECASE,
)
NAME_MODIFIERS_RE = re.compile(
    r"\s*\([^)]*\)?\s*$",
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


_HONORIFICS_MAP = {
    "MR,": "MR.", "MRS,": "MRS.", "MS,": "MS.", "DR,": "DR.",
    "LT,": "LT.", "SGT,": "SGT.", "CAPT,": "CAPT.", "COL,": "COL.",
    "GEN,": "GEN.", "PROF,": "PROF."
}

_LOCATION_WORDS = {
    "ROOM", "CORRIDOR", "BRIDGE", "DECK", "HOLD", "COCKPIT", "VENT",
    "BULKHEAD", "MAINFRAME", "HATCH", "TUNNEL", "CHAMBER", "DOORS",
    "DESK", "WALL", "FLOOR", "CEILING", "ROOFTOP", "STAIRWELL", "ELEVATOR",
    "ENTRANCE", "EXIT", "STATION", "TERMINAL", "RUNWAY", "STREET",
    "AVENUE", "ROAD", "ALLEY", "BUILDING", "WAREHOUSE", "OFFICE",
    "APARTMENT", "HOUSE", "CABIN", "BALCONY", "TERRACE", "BASEMENT",
    "ATTIC", "KITCHEN", "BATHROOM", "BEDROOM", "LIVING ROOM", "JUNCTION"
}

_PERSON_ROLE_WORDS = {
    "MAN", "MEN", "WOMAN", "WOMEN", "BOY", "BOYS", "GIRL", "GIRLS",
    "GUY", "GUYS", "LADY", "LADIES", "KID", "KIDS", "CHILD", "CHILDREN",
    "COP", "COPS", "POLICE", "OFFICER", "OFFICERS", "GUARD", "GUARDS",
    "SOLDIER", "SOLDIERS", "DOCTOR", "DOCTORS", "NURSE", "NURSES",
    "PRIEST", "PRIESTS", "WAITER", "WAITRESS", "BARTENDER", "CLERK",
    "DRIVER", "PILOT", "PILOTS", "PASSENGER", "PASSENGERS", "STRANGER",
    "STRANGERS", "HITCHHIKER", "DETECTIVE", "AGENT", "AGENTS", "THUG",
    "THUGS", "PRESIDENT", "GENERAL", "CAPTAIN", "COMMANDER", "SERGEANT",
    "LIEUTENANT", "MAYOR", "JUDGE", "KING", "QUEEN", "PRINCE", "PRINCESS",
    "KILLER", "ASSASSIN", "HOST", "ANNOUNCER", "REPORTER", "PROFESSOR",
    "TEACHER", "STUDENT", "SCIENTIST", "ENGINEER", "TECHNICIAN", "MECHANIC",
    "MAID", "BUTLER", "CHEF", "COOK", "BARKER", "DWARF", "HOODLUM",
    "PROPRIETOR", "NARRATOR", "PATROLMAN", "WARRIOR", "FIGHTER", "ONE",
    "TWO", "THREE", "ATTENDANT", "SUPERVISOR"
}

_ACTION_VERBS = {
    "WATCHES", "SEES", "LOOKS", "TURNS", "MOVES", "SMILES", "LAUGHS",
    "NODS", "STANDS", "WALKS", "RUNS", "FALLS", "HEARS", "TALKS",
    "STOPS", "GRINS", "STARES", "SCREAMS", "SHOUTS", "POINTS",
    "GLANCES", "ENTERS", "EXITS", "LEAVES", "ARRIVES", "PAUSES",
    "SIGHS", "WAIT", "WAITS", "SURVEYS", "TOUCHES", "LEAPS", "GESTURES"
}

_BODY_PARTS_AND_PROPS = {
    "FACE", "EYES", "HEAD", "HAND", "HANDS", "ARM", "ARMS", "BODY",
    "DESK", "GUN", "CAR", "SHIP", "HOLE", "DOOR", "DOORS", "WINDOW",
    "TABLE", "CHAIR", "BED", "DRAWER", "BAG", "BOX", "HAT", "COAT",
    "SHOES", "FEET", "SHADOW", "VIEW", "CORRIDOR", "BRUSH", "MACHINE",
    "DRONE", "IRON", "COWS", "HYMN", "FORMATION", "EYELIDS"
}

_AUDIO_MODIFIERS_RE = re.compile(
    r"(?:['’]S|['’]’S|\b)\s*(?:"
    r"VOICE(?:\s*OVER)?|V\.?O\.?|O\.?S\.?|O\.?C\.?|HUD|HOLO|BOLO|"
    r"ON\s+(?:TAPE|PHONE|RADIO|TV|MONITOR|SCREEN|INTERCOM|SPEAKER|WIRE)|"
    r"OVER\s+(?:RADIO|PHONE|INTERCOM|P\.?A\.?)|"
    r"INTO\s+(?:PHONE|RADIO|MIC)|"
    r"THROUGH\s+(?:PHONE|RADIO|INTERCOM)|"
    r"FLEETING\s+MEMORIES|VIEW"
    r")\b.*$",
    re.IGNORECASE,
)

_PREFIX_CLEAN_RE = re.compile(
    r"^(?:FLASH[- ]?CUT\s*[-—:]?\s*|HIS\s+VIEW\s*[-—:]?\s*|[A-Z0-9'’]+\s+VIEW\s*[-—:]?\s*|"
    r"OVER\s+|ON\s+|ANGLE\s+ON\s+|CUT\s+TO\s+|POV\s*[-—:]?\s*|"
    r"[A-Za-z0-9]{1,4}\)\s*[~-]*\s*(?=[A-Za-z])|"
    r"[^A-Za-z0-9]+)",
    re.IGNORECASE,
)


def normalize_speaker(name: str | None) -> str | None:
    if not name:
        return None
    s = name.strip()
    words = s.split()
    if words and words[0].upper() in _HONORIFICS_MAP:
        words[0] = _HONORIFICS_MAP[words[0].upper()]
        s = " ".join(words)

    # Strip prefix noise (OCR prefixes like 'CO) ~' or 'C1 -', camera/view prefixes)
    prev = None
    while prev != s:
        prev = s
        s = _PREFIX_CLEAN_RE.sub("", s).strip()

    # Strip parentheticals and brackets
    s = re.sub(r"[\(\[\{][^\)\]\}]*[\)\]\}]?", "", s)
    s = re.sub(r"[\(\)\[\]\{\}]", "", s)

    # Strip prefix noise again in case brackets exposed any
    prev = None
    while prev != s:
        prev = s
        s = _PREFIX_CLEAN_RE.sub("", s).strip()

    # Strip voice / audio / device modifiers
    if s.upper() not in ("VOICE", "A VOICE", "THE VOICE"):
        s = _AUDIO_MODIFIERS_RE.sub("", s).strip()

    # Strip trailing action / scene continuation after hyphens
    if any(sep in s for sep in [" - ", " -- ", " – ", " — "]):
        parts = re.split(r"\s+[-—–]+\s+", s, maxsplit=1)
        if len(parts) == 2:
            left, right = parts[0].strip(), parts[1].strip()
            right_up = right.upper()
            if any(k in right_up for k in ["LATER", "SEATED", "CONT", "DAY", "NIGHT", "OFF", "ON", "STILL", "VIEW", "SCENE"]):
                s = left
            elif not any(c.isalpha() for c in right):
                s = left
            elif any(w in _LOCATION_WORDS for w in right_up.split()):
                s = left

    s = s.strip(" \t\n\r:;,.!?-_—–/\\|@~#*^+=[]{}()<>'\"`’‘“”«»")
    s = re.sub(r"\s+", " ", s)

    if not s or len(s) <= 1:
        return None
    if not re.search(r"[A-Za-z]", s):
        return None
    return s


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
        # If line starts with a lowercase letter, it is an action sentence continuation, not dialogue
        first_char = next((c for c in t if c.isalpha()), None)
        if first_char and first_char.islower():
            return False
        return True
    return False


def _is_camera_direction(t: str) -> bool:
    """Return True if line is a camera/shot direction, not a character."""
    text = t.strip()
    if not text:
        return False
    upper = text.upper()
    # Substring indicators that always mean camera/action, not character
    if " POV" in upper or upper.startswith("POV") or upper == "POV":
        return True
    if upper.startswith("ECU") or " ECU " in upper or " ECU:" in upper:
        return True
    if "CREDITS" in upper:
        return True
    if "OMITTED" in upper:
        return True
    if "CONTINUED" in upper:
        return True
    # Strip trailing colon (e.g. "FROM UP HIGH:")
    stripped = text.rstrip(":").strip()
    if _CAMERA_DIRECTION_RE.match(stripped):
        return True
    # Also catch "<CAMERA> - description" already handled via dash check,
    # but explicit check for prefix before dash
    # e.g. "SNAP ZOOM TO - an RPG"
    if re.match(r"^[A-Z][A-Z\s']+\s*[-—]\s*.+", text):
        prefix = text.split("-")[0].strip().rstrip(":")
        if _CAMERA_DIRECTION_RE.match(prefix):
            return True
        # Also check if prefix contains POV etc.
        if "POV" in prefix.upper():
            return True
    # Inline speaker case: "TONY’S POV - OF JIMMY: ..."
    # If speaker part contains POV, treat as camera
    if ":" in text:
        speaker_part = text.split(":")[0]
        if "POV" in speaker_part.upper():
            return True
    return False


def _is_front_matter_line(t: str) -> bool:
    """Detect title-page / credit lines before first scene heading."""
    if not t or not t.strip():
        return False
    low = t.strip().lower()
    if _FRONT_MATTER_RE.search(t):
        return True
    # Short ALL CAPS credit lines like "MATT HOLLOWAY & ART MARCUM"
    # or "REVISIONS:", "BY", "AND" that appear before any scene
    # Heuristic: short, no sentence punctuation, inside front-matter scan
    # Caller should only call this before first heading.
    if len(t.strip().split()) <= 6 and t.strip().isupper() and re.search(r"\b(BY|AND|REVISIONS?|DRAFT|BASED)\b", t):
        return True
    return False


def is_speaker_candidate(t: str) -> bool:
    if not t or len(t) > 45:
        return False
    if _is_camera_direction(t):
        return False
    if re.search(r"[.!?]+\s*$", t):
        return False
    if re.search(r"-+\s*$", t):  # "OPEN ON -", "REVEAL -", "CUT TO -"
        return False
    if re.search(r'["””]', t):
        return False

    up = t.upper().strip()
    words = up.split()
    if len(words) > 4 and not t.strip().endswith(")"):
        return False

    # Prepositions at start: AT, IN, ON, OVER, UNDER, etc.
    if words and words[0] in ("AT", "IN", "ON", "OVER", "UNDER", "INTO", "THROUGH", "FROM", "WITH", "WITHOUT", "BEHIND", "AROUND", "BESIDE"):
        return False

    # Timing / transitions / camera directions at end
    if words and words[-1] in ("LATER", "CUT", "CUTS", "FLASHBACK", "SHOT", "SHOTS", "POV", "CAMERA", "THE END"):
        return False

    # Sound effects
    if "!" in up or any(w in ("KABLAM", "BOOM", "BANG", "CRASH", "SLAM", "POW", "WHAM") for w in words):
        return False

    # Action verbs at end: e.g. "ALFIE WATCHES"
    if words and words[-1] in _ACTION_VERBS:
        return False

    # Possessive + body part / prop: e.g. "JARRETT'S FACE", "TERL'S DESK"
    if len(words) >= 2 and any(re.search(r"['’]S$", w) for w in words[:-1]) and words[-1] in _BODY_PARTS_AND_PROPS:
        return False

    # Ends with body part / prop unless person role is present
    if words and words[-1] in _BODY_PARTS_AND_PROPS and not any(w in _PERSON_ROLE_WORDS for w in words):
        return False

    # Location slugs: ROOM, CORRIDOR, DECK, BRIDGE, etc.
    if any(w in _LOCATION_WORDS for w in words):
        if not any(w in _PERSON_ROLE_WORDS for w in words):
            return False

    # Article + non-person: A PAINT BRUSH, A LEARNING MACHINE
    if words and words[0] in ("A", "AN", "THE", "SOME", "SEVERAL", "TWO", "THREE", "FOUR"):
        if not any(w in _PERSON_ROLE_WORDS for w in words):
            return False

    # Sentence fragment ending in conjunctions/prepositions
    if words and words[-1] in ("THAT", "AND", "OR", "THE", "A", "AN", "OF", "TO", "IN"):
        return False

    # Check for obvious action verbs in all-caps lines
    t_padded = f" {up} "
    if len(words) >= 3 and any(v in t_padded for v in [" SURVEYS ", " TOUCHES ", " LEAPS ", " GESTURES ", " CUE ", " GROWS ", " FROM ", " CAMERA ", " EXTREME ", " WIDER ", " ANGLE ", " CONTINUED ", " POV ", " HUD ", " VOICE "]):
        return False
    if up.startswith("FROM "):
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

    # Tag front-matter lines that appear before the first scene heading.
    # In a properly formatted screenplay, all content before the first INT./EXT.
    # heading is title-page material (credits, revision history) and should be
    # excluded from dialogue/action/topic/NER extraction.
    first_heading = next((idx for idx, tg in enumerate(tags) if tg == "heading"), None)
    if first_heading is not None and first_heading > 0:
        for i in range(first_heading):
            if tags[i] in ("heading", "transition", "pagenum", "blank", "parenthetical"):
                continue
            # Any remaining non-blank lines before first heading are front-matter
            if lines[i].strip():
                tags[i] = "frontmatter"

    i = 0
    pending_speaker: str | None = None
    while i < n:
        if tags[i] in ("heading", "transition", "pagenum", "frontmatter"):
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
        # Camera directions are never speakers — force to action
        if _is_camera_direction(t):
            tags[i] = "action"
            pending_speaker = None
            i += 1
            continue
        m = INLINE_SPEAKER_RE.match(t)
        if m:
            speaker_part = m.group("speaker").strip()
            if _is_camera_direction(speaker_part) or not is_speaker_candidate(speaker_part):
                tags[i] = "action"
                pending_speaker = None
                i += 1
                continue
            tags[i] = "speaker"
            pending_speaker = speaker_part
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
        if tag in ("blank", "frontmatter"):
            continue
        t = lines[i].strip()
        if tag == "heading":
            start_scene(i)
            continue
        if current is None:
            # Don't create an empty scene for leading transitions/front-matter
            if tag == "transition":
                continue
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
                raw_spk = m.group("speaker").strip()
                pending_speaker = normalize_speaker(raw_spk) or raw_spk
                pending_parenthetical = None
                if m.group("dialog").strip():
                    current.dialogue.append(DialogueLine(speaker=pending_speaker,
                                                         text=m.group("dialog").strip()))
                continue
            pending_speaker = normalize_speaker(t) or t
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
        # action — skip pure camera directions (they are not story content)
        if not _is_camera_direction(t):
            current.action.append(t)
        pending_speaker = None
        pending_parenthetical = None

    # Remove empty front-matter scene (heading == "" with no content) that
    # can be created from leading transitions — keep it for plain-text fallback
    # where the single scene holds dialogue.
    if len(scenes) > 1:
        scenes = [s for s in scenes if not (s.heading == "" and not s.dialogue and not s.action)]
        # Re-index remaining scenes
        for idx, s in enumerate(scenes):
            s.index = idx
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