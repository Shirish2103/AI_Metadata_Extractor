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

from src import corpus, pipeline

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
    target = outputs_dir / filename
    if not target.exists():
        if (outputs_dir / f"{filename}.json.gz").exists():
            target = outputs_dir / f"{filename}.json.gz"
        elif (outputs_dir / f"{filename}.json").exists():
            target = outputs_dir / f"{filename}.json"
        else:
            raise HTTPException(404, f"Output metadata file '{filename}' not found")
    try:
        import gzip
        import json
        if target.name.endswith(".gz"):
            with gzip.open(target, "rt", encoding="utf-8") as f:
                return json.load(f)
        else:
            return json.loads(target.read_text(encoding="utf-8"))
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
    if use_llm and meta and isinstance(meta, dict):
        if force_refresh or not meta.get("summary"):
            from src import summarize

            lines = []
            for seg in meta.get("segments", []):
                for d in seg.get("dialogue", []):
                    if d.get("text"):
                        lines.append(d["text"])
            sample_text = "\n".join(lines) if lines else meta.get("title", "")
            meta["summary"] = summarize.generate(sample_text, title=meta.get("title", ""))
    elif not use_llm and meta and isinstance(meta, dict):
        meta.pop("summary", None)
    return meta


@app.post("/tag")
@app.post("/api/tag")
def tag(req: TagRequest):
    if req.imdb_id:
        cached = pipeline.load_cached_metadata(req.imdb_id)
        if cached is not None and not req.use_transformers:
            has_dialogue = any(bool(s.get("dialogue")) for s in cached.get("segments", []))
            needs_dialogue = req.include_dialogue and not has_dialogue
            if not needs_dialogue:
                return _ensure_summary(cached, req.use_llm, force_refresh=req.use_llm)
        try:
            text = corpus.read_script(req.imdb_id)
        except KeyError:
            if cached is not None:
                return _ensure_summary(cached, req.use_llm, force_refresh=req.use_llm)
            raise HTTPException(404, "script not found")
        meta = pipeline.tag_script(
            text,
            imdb_id=req.imdb_id,
            title=corpus.metadata_for(req.imdb_id).get("title", ""),
            use_transformers=req.use_transformers,
            include_dialogue=req.include_dialogue,
            use_llm=req.use_llm,
        )
        meta = _ensure_summary(meta, req.use_llm, force_refresh=req.use_llm)
        pipeline.save_metadata(req.imdb_id, meta)
        return meta
    if req.text:
        cached = pipeline.load_cached_metadata_by_title(req.title) if req.title else None
        if cached is not None and not req.use_transformers:
            has_dialogue = any(bool(s.get("dialogue")) for s in cached.get("segments", []))
            if not req.include_dialogue or has_dialogue:
                return _ensure_summary(cached, req.use_llm, force_refresh=req.use_llm)
        meta = pipeline.tag_script(
            req.text,
            imdb_id=req.imdb_id,
            title=req.title,
            use_transformers=req.use_transformers,
            include_dialogue=req.include_dialogue,
            use_llm=req.use_llm,
        )
        meta = _ensure_summary(meta, req.use_llm, force_refresh=req.use_llm)
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
    if cached is not None and not use_transformers:
        has_dialogue = any(bool(s.get("dialogue")) for s in cached.get("segments", []))
        if not include_dialogue or has_dialogue:
            return _ensure_summary(cached, use_llm, force_refresh=use_llm)
    meta = pipeline.tag_script(
        raw,
        title=title,
        use_transformers=use_transformers,
        include_dialogue=include_dialogue,
        use_llm=use_llm,
    )
    meta = _ensure_summary(meta, use_llm, force_refresh=use_llm)
    pipeline.save_metadata(title, meta)
    return meta


@app.get("/metadata/{imdb_id}")
@app.get("/api/metadata/{imdb_id}")
def metadata(imdb_id: str):
    cached = pipeline.load_cached_metadata(imdb_id)
    if cached:
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
    )
    pipeline.save_metadata(imdb_id, meta)
    return meta

if DIST_DIR.exists():
    app.mount("/", StaticFiles(directory=str(DIST_DIR), html=True), name="static")