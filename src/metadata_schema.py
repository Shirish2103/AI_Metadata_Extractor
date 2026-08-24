"""Pydantic schemas for the structured metadata output."""

from typing import Optional

from pydantic import BaseModel


class Sentiment(BaseModel):
    compound: float
    label: str
    n: int
    positive: int = 0
    negative: int = 0
    neutral: int = 0


class Emotion(BaseModel):
    label: Optional[str] = None  # None when the transformer emotion model wasn't run
    distribution: dict = {}
    n: int = 0


class Entity(BaseModel):
    label: str
    text: str
    count: int
    scenes: list[int] = []
    is_speaker: bool = False


class Topic(BaseModel):
    keyword: str
    score: float


class Speaker(BaseModel):
    name: str
    lines: int
    words: int
    gender: Optional[str] = None


class DialogueLine(BaseModel):
    speaker: Optional[str]
    text: str
    parenthetical: Optional[str] = None
    sentiment: Optional[Sentiment] = None
    emotion: Optional[Emotion] = None


class Segment(BaseModel):
    segment_id: int
    scene_index: int
    start: str
    end: str
    start_sec: float
    end_sec: float
    heading: str
    interior: Optional[str] = None
    location: Optional[str] = None
    time_of_day: Optional[str] = None
    speakers: list[str]
    topics: list[Topic]
    entities: list[Entity]
    sentiment: Sentiment
    emotion: Emotion
    dialogue: list[DialogueLine] = []


class Genre(BaseModel):
    genre: str
    score: float


class MovieMetadata(BaseModel):
    imdb_id: str = ""
    title: str
    source: str = "script"
    genres: list[Genre] = []
    known_genres: list[str] = []
    overall: dict = {}
    segments: list[Segment] = []
    speakers: list[Speaker] = []