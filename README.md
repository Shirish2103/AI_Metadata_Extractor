# ScriptTagger — AI-Powered Screenplay & Media Metadata Extraction Pipeline

**ScriptTagger** is an end-to-end NLP & Machine Learning pipeline designed to ingest movie screenplays and media subtitle transcripts (`.txt`, `.srt`) and automatically extract rich, structured metadata for content indexing, archiving, recommendations, compliance, and deep media analytics.

---

## Key Features

- **Scene & Timestamp Segmentation**: Automatically parses scene headings (`INT.`, `EXT.`, `DAY`, `NIGHT`) and converts script flow into timestamped segments (`00:00 - 02:15`).
- **Speaker & Character Extraction**: Identifies canonical character names, attributes speech lines, calculates word shares, and enriches speaker profiles with gender inference.
- **Full Dialogue Extraction**: Captures per-scene dialogue breakdowns, speaker attributions, and parentheticals. Supports both full screenplay format and subtitle transcripts (`.srt` with cue & tag stripping).
- **Topics & Keyphrase Mining**: Extracts key topics per scene and overall using RAKE, TF-IDF, and KeyBERT phrase scoring algorithms.
- **Named Entity Recognition (NER)**: Identifies people, organizations, locations, and products using spaCy (`en_core_web_sm` / `en_core_web_lg`) and cross-links entities with script speakers.
- **Sentiment & Emotion Analysis**: Performs VADER sentiment scoring per line/scene alongside an optional Hugging Face Transformer emotion classification model (RoBERTa).
- **Multi-Label Genre Classification**: Scikit-Learn OneVsRest TF-IDF + Logistic Regression model pre-trained on movie screenplays to predict top movie genres (Drama, Action, Sci-Fi, Comedy, etc.).
- **Gzip Compressed Storage**: Compresses heavy script JSON metadata output down to `.json.gz` files, reducing storage footprint by ~90% (~900MB reduced to ~100MB).
- **Modern React 19 Dashboard**: Includes a sleek dark-mode React 19 dashboard built with Vite, Tailwind CSS, and Recharts.

---

## System Architecture

```
                       ┌──────────────────────────────┐
                       │  Input Media / Transcripts   │
                       │   (.txt Screenplay / .srt)   │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │    src/srt.py & parser.py    │
                       │ (Subtitle & Screenplay Parse)│
                       └──────────────┬───────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│segmentation  │              │  speakers    │              │   topics     │
│Assign mm:ss  │              │Canonical Name│              │ RAKE / TFIDF │
│ Timestamps   │              │& Gender Tag  │              │   KeyBERT    │
└──────┬───────┘              └──────┬───────┘              └──────┬───────┘
       │                              │                              │
       └──────────────────────────────┼──────────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       │                              │                              │
       ▼                              ▼                              ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│     ner      │              │  sentiment   │              │   classify   │
│  spaCy NER   │              │ VADER & TF   │              │  OneVsRest   │
│ Entity Link  │              │   Emotion    │              │    Genre     │
└──────┬───────┘              └──────┬───────┘              └──────┬───────┘
       │                              │                              │
       └──────────────────────────────┼──────────────────────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │       src/pipeline.py        │
                       │   (Metadata Serialization)   │
                       └──────────────┬───────────────┘
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
       ┌──────────────────────────────┐┌──────────────────────────────┐
       │    FastAPI + React 19 UI     ││    Compressed Output Storage │
       │     (http://localhost:8000)  ││       (outputs/*.json.gz)    │
       └──────────────────────────────┘└──────────────────────────────┘
```

---

## Repository Structure

```
AI_Metadata_Extractor/
├── api/
│   └── main.py                 # FastAPI backend application & static React host
├── frontend/                   # React 19 + Vite + Tailwind CSS Web Dashboard
│   ├── src/
│   │   ├── components/         # SceneExplorer, SpeakersGrid, AnalyticsCharts, etc.
│   │   ├── App.jsx             # Main dashboard page component
│   │   └── main.jsx            # React entry point
│   ├── package.json
│   └── vite.config.js
├── src/                        # Core NLP Engine & Algorithms
│   ├── config.py               # Path & environment configuration
│   ├── corpus.py               # Corpus indexer & cached catalog lookup
│   ├── parser.py               # Screenplay structural parser (scenes, speakers, dialogue)
│   ├── srt.py                  # Subtitle (.srt) detector & cleaner
│   ├── segmentation.py         # Timestamp assignment per scene
│   ├── speakers.py             # Speaker extraction & gender enrichment
│   ├── ner.py                  # spaCy NER & speaker entity linking
│   ├── topics.py               # Keyphrase extraction (RAKE / TF-IDF / KeyBERT)
│   ├── sentiment.py            # VADER & Transformer emotion classifier
│   ├── classify.py             # Multi-label genre classification
│   ├── pipeline.py             # End-to-end pipeline orchestrator & JSON saver
│   ├── metadata_schema.py      # Pydantic models for metadata validation
│   └── summarize.py            # LLM/fallback summarization engine
├── scripts/
│   ├── tag_corpus.py           # Multi-threaded parallel batch tagger
│   ├── recompute_sentiment.py  # Batch sentiment update utility
│   └── precompute_summaries.py # Batch summary precomputation utility
├── evaluate/
│   └── evaluate.py             # Accuracy evaluation script against ScreenPy annotations
├── outputs/                    # Pre-tagged .json.gz output metadata files
├── data/
│   └── models/                 # Pre-trained genre_classifier.joblib
├── Dockerfile                  # Production multi-stage Docker build file
├── docker-compose.yml          # Docker Compose stack with volume mounts & watch sync
├── requirements.txt            # Python dependencies
└── setup.py                    # Environment initializer & model downloader
```

---

## Quick Start Guide

### Option 1: Running with Docker (Recommended)

#### A. Standalone Docker Container

Build and run the container with pre-baked models and outputs:

```bash
# Build the image
docker build -t scripttagger .

# Run the container
docker run -p 8000:8000 scripttagger
```

- **React Dashboard**: [http://localhost:8000](http://localhost:8000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

#### B. Local Development with Docker Compose

Run full local development environment with live hot-reloading:

```bash
`docker compose up --build
````

- **React + FastAPI Web Application**: [http://localhost:8000](http://localhost:8000)

---

### Option 2: Local Environment Setup

#### Step 1: Create and Activate Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

#### Step 2: Install Python Dependencies

```bash
pip install -r requirements.txt
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

#### Step 3: Run Pipeline Setup (Optional)

If you have the full raw Kaggle dataset, initialize models and build indices:

```bash
python setup.py
```

> ⚡ **Note**: All models run efficiently on **CPU** — GPU is optional.

---

## 💻 Running the Applications

### 1. Main React 19 + FastAPI Web App

Launch FastAPI server (which automatically serves the compiled React app):

```bash
python -m uvicorn api.main:app --port 8000
```
- Open **[http://localhost:8000](http://localhost:8000)** in your browser.
- Swagger API Docs available at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

To run the React Frontend in Vite development mode with hot reload:
```bash
cd frontend
npm install
npm run dev
```
- Open **[http://localhost:5173](http://localhost:5173)** (proxies API calls to port 8000).

### 2. Multi-Threaded Batch Tagging

Process full script catalog in parallel using worker threads:

```bash
python scripts/tag_corpus.py --workers 8
```

### 3. Run Model Evaluation Benchmark

```bash
python evaluate/evaluate.py --sample 30
```

---

## API 

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/health` | `GET` | Health check endpoint returning `{ "status": "ok" }` |
| `GET /api/scripts` | `GET` | Search script catalog using fuzzy word matching (`query`, `limit`, `offset`) |
| `GET /api/scripts/{imdb_id}` | `GET` | Fetch raw screenplay text for a given IMDb ID |
| `GET /api/outputs` | `GET` | List all pre-tagged `.json.gz` output metadata files in the catalog |
| `GET /api/outputs/{filename}` | `GET` | Fetch pre-tagged JSON metadata for a specific output file |
| `POST /api/tag` | `POST` | Tag screenplay text or IMDb ID (`imdb_id`, `text`, `use_transformers`, `include_dialogue`) |
| `POST /api/tag/upload` | `POST` | Upload `.txt` or `.srt` file for live NLP tagging (`file`, `use_transformers`, `include_dialogue`) |
| `GET /api/metadata/{imdb_id}` | `GET` | Fetch or tag metadata for a specific IMDb ID |

---

## Sample Output Metadata Schema

Below is an example JSON output generated by the pipeline (`outputs/*.json.gz`):

```json
{
  "imdb_id": "0147800",
  "title": "10 Things I Hate About You",
  "genres": [
    { "genre": "Comedy", "score": 0.8421 },
    { "genre": "Romance", "score": 0.7915 },
    { "genre": "Drama", "score": 0.4120 }
  ],
  "known_genres": ["Comedy", "Drama", "Romance"],
  "overall": {
    "topics": [
      { "keyword": "high school", "score": 0.45 },
      { "keyword": "prom date", "score": 0.38 }
    ],
    "entities": [
      { "text": "KAT", "label": "PERSON", "count": 210, "is_speaker": true },
      { "text": "PATRICK", "label": "PERSON", "count": 185, "is_speaker": true }
    ],
    "sentiment": { "compound": 0.12, "label": "positive" },
    "emotion": { "label": "joy", "distribution": { "joy": 0.42, "anger": 0.10 } },
    "num_scenes": 94,
    "num_dialogue_lines": 1420,
    "num_words": 12850
  },
  "segments": [
    {
      "segment_id": 1,
      "start": "00:00",
      "end": "01:30",
      "heading": "EXT. PADDOCK HIGH SCHOOL - DAY",
      "interior": "EXT",
      "location": "PADDOCK HIGH SCHOOL",
      "time_of_day": "DAY",
      "speakers": ["KAT", "BIANCA"],
      "topics": [{ "keyword": "school", "score": 0.30 }],
      "entities": [],
      "sentiment": { "compound": 0.05, "label": "neutral" },
      "emotion": { "label": "neutral" },
      "dialogue": [
        {
          "speaker": "KAT",
          "text": "I hate the way you talk to me, and the way you cut your hair.",
          "parenthetical": null,
          "sentiment": { "compound": -0.57, "label": "negative" }
        }
      ]
    }
  ],
  "speakers": [
    { "name": "KAT", "lines": 340, "words": 3100, "gender": "female" },
    { "name": "PATRICK", "lines": 310, "words": 2950, "gender": "male" }
  ]
}
```

---

##  Recent Improvements & Changelog

- **File Upload Dialogue Extraction**: Updated `/api/tag/upload` in `api/main.py` and `frontend/src/App.jsx` to default `include_dialogue=True`, ensuring uploaded `.txt` and `.srt` transcripts preserve per-scene dialogue breakdowns.
- **Pre-Tagged Outputs Dropdown Selector**: Integrated an output folder selector in `frontend/src/App.jsx` connected to `GET /api/outputs` to load pre-tagged movie metadata instantaneously.
- **Fast Output Index Caching**: Optimized `src/corpus.py` with in-memory index caching and invalidation, reducing search latency from ~4.2s to ~0.01s (100x+ speedup).
- **Subtitle (.SRT) Format Support**: Added `src/srt.py` to detect `.srt` subtitle files, stripping cue numbers, timestamps, and HTML formatting tags before screenplay parsing.
- **Enhanced Search Engine**: Implemented `src/corpus.search_index` featuring multi-word fuzzy matching and word position re-ranking.
- **Dockerized Multi-Stage Build**: Configured a production multi-stage Docker build compiling React 19 frontend assets and embedding spaCy/NLTK models inside a single lightweight container.

---

##  License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
