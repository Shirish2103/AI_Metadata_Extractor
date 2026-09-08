import logging
import sys
from pathlib import Path
import pandas as pd
import threading
from contextlib import asynccontextmanager

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src import corpus, entity_resolution, ner, pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

def _current_index():
    """Load the corpus index fresh. Deliberately not cached at module scope:
    when running from outputs/ alone (no raw dataset), rebuilding is cheap
    and newly-tagged uploads/pastes should show up in /scripts immediately
    rather than only after a restart."""
    try:
        idx = corpus.load_index()
        return idx if not idx.empty else corpus.build_index()
    except Exception as exc:
        logger.error("Failed to load corpus index: %s", exc)
        return None


try:
    logger.info("Loaded corpus index with %s scripts", len(_current_index()))
except Exception:
    pass


class TagRequest(BaseModel):
    imdb_id: str = ""
    text: str = ""
    title: str = ""
    use_transformers: bool = False
    include_dialogue: bool = False
    use_llm: bool = False


from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

DIST_DIR = PROJECT_ROOT / "frontend" / "dist"

def _warm_up():
    """Preload optional heavyweight models so the first request isn't slow."""
    try:
        from src import classify, ner

        classify.load_classifier()
        ner.load_spacy("en_core_web_lg")
    except Exception as exc:  # pragma: no cover
        logger.warning("Model warm-up failed (non-fatal): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=_warm_up, daemon=True).start()
    yield

app = FastAPI(title="ScriptTagger API", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


def _correct_cached_entities(meta: dict) -> dict:
    """Apply current speaker-aware NER rules to metadata created by older builds."""
    speakers = [s.get("name", "") for s in meta.get("speakers", []) if isinstance(s, dict)]
    overall = meta.get("overall", {})
    if isinstance(overall.get("entities"), list):
        overall["entities"] = ner._merge_entities(ner.promote_speaker_entities(overall["entities"], speakers))
    return meta


def _cached_script_context(meta: dict) -> str:
    """Reconstruct useful semantic context from stored screenplay segments."""
    lines: list[str] = []
    for segment in meta.get("segments", []):
        if not isinstance(segment, dict):
            continue
        if segment.get("heading"):
            lines.append(f"[{segment['heading']}]")
        for dialogue in segment.get("dialogue", []):
            if not isinstance(dialogue, dict) or not dialogue.get("text"):
                continue
            speaker = dialogue.get("speaker")
            lines.append(f"{speaker}: {dialogue['text']}" if speaker else str(dialogue["text"]))
    return "\n".join(lines)


def _resolve_cached_entities(meta: dict) -> tuple[dict, bool]:
    """Semantically resolve a legacy output once, then retain its result."""
    overall = meta.get("overall", {})
    if not isinstance(overall.get("entities"), list):
        return meta, False
    previous = overall.get("entity_resolution", {})
    if isinstance(previous, dict) and previous.get("applied") and previous.get("version") == entity_resolution.RESOLUTION_VERSION:
        return meta, False
    context = _cached_script_context(meta)
    if not context:
        overall["entity_resolution"] = {"enabled": False, "applied": False, "reason": "cached output has no dialogue context"}
        return meta, False
    entities, resolution = entity_resolution.resolve(overall["entities"], context, title=str(meta.get("title", "")))
    overall["entities"] = entities
    overall["entity_resolution"] = resolution
    return meta, bool(resolution.get("applied"))


@app.get("/")
def root():
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"app": "ScriptTagger", "endpoints": ["/health", "/scripts", "/tag/upload", "/metadata/{id}", "/scripts/{id}"]}


@app.get("/api/info")
def info():
    return {"app": "ScriptTagger", "endpoints": ["/health", "/scripts", "/tag/upload", "/metadata/{id}", "/scripts/{id}"]}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/outputs")
@app.get("/api/outputs")
def list_outputs():
    outputs_dir = PROJECT_ROOT / "outputs"
    if not outputs_dir.exists():
        return {"total": 0, "results": []}

    files = sorted(list(outputs_dir.glob("*.json.gz")) + list(outputs_dir.glob("*.json")))
    results = []
    for p in files:
        filename = p.name
        stem = filename[:-8] if filename.endswith(".json.gz") else p.stem
        
        imdb_id = ""
        if "_" in stem:
            parts = stem.rsplit("_", 1)
            if parts[1].isdigit() and len(parts[1]) >= 7:
                title = parts[0].replace("_", " ")
                imdb_id = parts[1]
            else:
                title = stem.replace("_", " ")
        else:
            title = stem.replace("_", " ")
            
        results.append({
            "filename": filename,
            "title": title,
            "imdb_id": imdb_id,
            "id": stem
        })

    return {"total": len(results), "results": results}


@app.get("/outputs/{filename:path}")
@app.get("/api/outputs/{filename:path}")
def get_output_metadata(filename: str):
    outputs_dir = PROJECT_ROOT / "outputs"
    # Prevent path traversal: resolve and ensure target stays within outputs_dir
    try:
        target = (outputs_dir / filename).resolve()
        if not target.is_relative_to(outputs_dir.resolve()):
            raise HTTPException(400, "Invalid filename")
    except Exception:
        raise HTTPException(400, "Invalid filename")
    if not target.exists():
        if (outputs_dir / f"{filename}.json.gz").exists():
            target = (outputs_dir / f"{filename}.json.gz").resolve()
        elif (outputs_dir / f"{filename}.json").exists():
            target = (outputs_dir / f"{filename}.json").resolve()
        else:
            raise HTTPException(404, f"Output metadata file '{filename}' not found")
    try:
        import gzip
        import json
        if target.name.endswith(".gz"):
            with gzip.open(target, "rt", encoding="utf-8") as f:
                data = json.load(f)
        else:
            data = json.loads(target.read_text(encoding="utf-8"))
        # Upgrade old cached metadata from its screenplay speaker roster,
        # without requiring the entire raw corpus to be tagged again.
        data = _correct_cached_entities(data)
        return data
    except Exception as e:
        raise HTTPException(500, f"Failed to read metadata: {str(e)}")


@app.get("/scripts")
@app.get("/api/scripts")
def scripts(query: str = "", limit: int = 0, offset: int = 0):
    df = _current_index()
    if df is None:
        raise HTTPException(503, "corpus index unavailable")
    if query:
        df = corpus.search_index(df, query)
    if limit > 0:
        df = df.iloc[offset : offset + limit]
    elif offset > 0:
        df = df.iloc[offset:]
    rows = []
    for _, r in df.iterrows():
        g_val = r.get("genres")
        genres_list = [g.strip() for g in str(g_val).split(",") if g.strip()] if pd.notna(g_val) and g_val else []
        yr_raw = r.get("year")
        yr_val = None
        if pd.notna(yr_raw) and yr_raw != "":
            try:
                yr_val = int(float(yr_raw))
            except Exception:
                yr_val = None
        rows.append(
            {
                "imdb_id": str(r["imdbid"]),
                "title": str(r.get("title")) if pd.notna(r.get("title")) else "",
                "year": yr_val,
                "genres": genres_list[:5],
                "num_scenes": None,
            }
        )
    return {"total": len(df), "results": rows}


@app.get("/scripts/{imdb_id}")
@app.get("/api/scripts/{imdb_id}")
def raw_script(imdb_id: str):
    try:
        text = corpus.read_script(imdb_id)
    except KeyError:
        raise HTTPException(404, "script not found")
    return {"imdb_id": imdb_id, "title": corpus.metadata_for(imdb_id).get("title", ""), "text": text}


def _ensure_summary(meta: dict, use_llm: bool, force_refresh: bool = False) -> dict:
    if not meta or not isinstance(meta, dict):
        return meta
    if use_llm:
        current_model = str(meta.get("summary", {}).get("model", "") if isinstance(meta.get("summary"), dict) else "")
        needs_refresh = force_refresh or not meta.get("summary") or "Offline Fallback" in current_model
        if needs_refresh:
            from src import summarize

            sample_text = ""
            imdb_id = str(meta.get("imdb_id") or "").strip()
            if imdb_id and imdb_id != "0000000":
                try:
                    sample_text = corpus.read_script(imdb_id)
                except Exception:
                    pass

            if not sample_text:
                lines = []
                for seg in meta.get("segments", []):
                    h = seg.get("heading")
                    if h:
                        lines.append(f"[{h}]")
                    for d in seg.get("dialogue", []):
                        spk = d.get("speaker")
                        txt = d.get("text")
                        if txt:
                            lines.append(f"{spk}: {txt}" if spk else txt)
                sample_text = "\n".join(lines) if lines else meta.get("title", "")

            top_speakers = [s.get("name") for s in meta.get("speakers", []) if isinstance(s, dict) and s.get("name")][:6]
            new_summary = summarize.generate(sample_text, title=meta.get("title", ""), characters=top_speakers)
            if new_summary:
                meta["summary"] = new_summary
                save_key = imdb_id or meta.get("title")
                if save_key:
                    try:
                        pipeline.save_metadata(save_key, meta)
                    except Exception as exc:
                        logger.warning("Could not persist refreshed summary: %s", exc)
    return meta


@app.post("/tag")
@app.post("/api/tag")
def tag(req: TagRequest):
    if req.imdb_id:
        cached = pipeline.load_cached_metadata(req.imdb_id)
        if cached is not None:
            # Existing output metadata is authoritative for a movie selection.
            # Do not rerun the expensive pipeline just because an older cache
            # lacks optional dialogue or transformer-emotion fields.
            return cached
        try:
            text = corpus.read_script(req.imdb_id)
        except KeyError:
            if cached is not None:
                return cached
            raise HTTPException(404, "script not found")
        meta = pipeline.tag_script(
            text,
            imdb_id=req.imdb_id,
            title=corpus.metadata_for(req.imdb_id).get("title", ""),
            use_transformers=True,
            include_dialogue=req.include_dialogue,
            use_llm=True,
        )
        meta = _ensure_summary(meta, True, force_refresh=False)
        pipeline.save_metadata(req.imdb_id, meta)
        return meta
    if req.text:
        cached = pipeline.load_cached_metadata_by_title(req.title) if req.title else None
        if cached is not None:
            has_dialogue = any(bool(s.get("dialogue")) for s in cached.get("segments", []))
            has_transformers = any(d.get("emotion") is not None for s in cached.get("segments", []) for d in s.get("dialogue", []))
            if (not req.include_dialogue or has_dialogue) and has_transformers:
                return cached
        meta = pipeline.tag_script(
            req.text,
            imdb_id=req.imdb_id,
            title=req.title,
            use_transformers=True,
            include_dialogue=req.include_dialogue,
            use_llm=True,
        )
        meta = _ensure_summary(meta, True, force_refresh=False)
        pipeline.save_metadata(req.imdb_id or req.title, meta)
        return meta
    raise HTTPException(400, "provide either imdb_id or text")


@app.post("/tag/upload")
@app.post("/api/tag/upload")
async def tag_upload(
    file: UploadFile = File(...),
    use_transformers: bool = False,
    include_dialogue: bool = True,
    use_llm: bool = False,
):
    raw = (await file.read()).decode("utf-8", errors="replace")
    title = Path(file.filename).stem if file.filename else ""
    cached = pipeline.load_cached_metadata_by_title(title) if title else None
    if cached is not None:
        has_dialogue = any(bool(s.get("dialogue")) for s in cached.get("segments", []))
        has_transformers = any(d.get("emotion") is not None for s in cached.get("segments", []) for d in s.get("dialogue", []))
        if (not include_dialogue or has_dialogue) and has_transformers:
            return cached
    meta = pipeline.tag_script(
        raw,
        title=title,
        use_transformers=True,
        include_dialogue=include_dialogue,
        use_llm=True,
    )
    meta = _ensure_summary(meta, True, force_refresh=False)
    pipeline.save_metadata(title, meta)
    return meta


@app.get("/metadata/{imdb_id}")
@app.get("/api/metadata/{imdb_id}")
def metadata(imdb_id: str):
    cached = pipeline.load_cached_metadata(imdb_id)
    if cached:
        cached = _correct_cached_entities(cached)
        return cached
    try:
        text = corpus.read_script(imdb_id)
    except KeyError:
        raise HTTPException(404, "script not found")
    meta = pipeline.tag_script(
        text,
        imdb_id=imdb_id,
        title=corpus.metadata_for(imdb_id).get("title", ""),
        use_transformers=False,
        use_llm=True,
    )
    meta = _ensure_summary(meta, use_llm=True, force_refresh=False)
    pipeline.save_metadata(imdb_id, meta)
    return meta


@app.post("/metadata/{imdb_id}/summary")
@app.post("/api/metadata/{imdb_id}/summary")
def refresh_summary(imdb_id: str):
    cached = pipeline.load_cached_metadata(imdb_id)
    if not cached:
        try:
            text = corpus.read_script(imdb_id)
            meta = pipeline.tag_script(
                text,
                imdb_id=imdb_id,
                title=corpus.metadata_for(imdb_id).get("title", ""),
                use_transformers=False,
                use_llm=True,
            )
            pipeline.save_metadata(imdb_id, meta)
            return {"summary": meta.get("summary")}
        except Exception:
            raise HTTPException(404, "Metadata or script not found")
    cached = _ensure_summary(cached, use_llm=True, force_refresh=True)
    pipeline.save_metadata(imdb_id, cached)
    return {"summary": cached.get("summary")}

if DIST_DIR.exists():
    # SPA fallback for dashboard/app routes — must be defined before static mount so they take precedence
    @app.get("/dashboard/{path:path}")
    @app.get("/app/{path:path}")
    def spa_dashboard(path: str):
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(404)

    @app.get("/app")
    def spa_app():
        index_file = DIST_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(404)

    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")
