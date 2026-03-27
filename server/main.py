import os
import json
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()

from server.config import (
    RAG_MODE,
    FAISS_INDEX_PATH,
    FAISS_IDMAP_PATH,
    METADATA_DB_PATH,
    TOP_K as CONFIG_TOP_K,
    validate_config,
    log_config,
)
from server.agents.orchestrator import Orchestrator
from server.schemas.rag import (
    BlogGenerateRequest,
    BlogRecord,
    BlogUpdateRequest,
    RAGSearchRequest,
    TelemetryEvent,
)
from server.services.embeddings import embed_text
from server.services.vector_store import add_embedding, query
from server.services.ingest import ingest_dir
from server.services.training import export_training_dataset
from server.services.llm import check_ollama_availability
from server.storage import blog_store, telemetry_store

APP_ROOT = os.path.dirname(__file__)
DATA_DIR = os.path.join(APP_ROOT, 'data')
EMB_FILE_PATH = os.path.join(DATA_DIR, 'embeddings.json')

orchestrator = Orchestrator()

app = FastAPI(title='RAG Blog Backend (scaffold)')

# Validate and log RAG configuration
config_valid, config_error = validate_config()
if not config_valid:
    print(f"[WARNING] RAG Configuration issue: {config_error}")
log_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    prompt: str
    n_results: int = 3


@app.post('/api/generate')
def generate(req: GenerateRequest):
    # Simple RAG: embed prompt, retrieve top chunks, and return a mock combined answer
    emb = embed_text(req.prompt)
    if not emb:
        # fallback: return mock generation
        return {'content': f'Generated (mock) for prompt: {req.prompt}', 'sources': []}
    results = query(emb, top_k=req.n_results)
    out = []
    for score, item in results:
        out.append({
            'score': float(score),
            'doc_id': item.get('doc_id'),
            'chunk_id': item.get('chunk_id'),
            'text': item.get('text')
        })
    return {'content': f'Generated for prompt: {req.prompt}', 'sources': out}


@app.post('/api/docs/ingest')
def ingest(payload: dict):
    """Ingest plain text; split into chunks and embed."""
    text = payload.get('text')
    doc_id = payload.get('doc_id', 'default')
    if not text:
        raise HTTPException(status_code=400, detail='text field required')
    chunks = [text[i:i+500] for i in range(0, len(text), 500)]
    saved = 0
    for idx, chunk in enumerate(chunks):
        vec = embed_text(chunk)
        add_embedding(doc_id, f"{idx}", vec, chunk)
        saved += 1
    return {'ingested': saved}


@app.post('/api/docs/ingest-path')
def ingest_path(payload: dict):
    """Server-side ingestion: scan a local path (must be accessible to the server process) and ingest supported files.

    Example payload: { "path": "/mnt/seagate28/ai_library", "recursive": true }
    """
    path = payload.get('path')
    if not path:
        raise HTTPException(status_code=400, detail='path field required')
    recursive = bool(payload.get('recursive', True))
    try:
        count = ingest_dir(path, recursive=recursive, dry_run=False)
        return {'ingested': count}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail='path not found')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/docs/status')
def docs_status():
    # return number of embeddings and list of unique doc_ids
    if not os.path.exists(EMB_FILE_PATH):
        return {'count': 0, 'docs': []}
    with open(EMB_FILE_PATH, 'r', encoding='utf-8') as f:
        items = json.load(f)
    docs = sorted(list({it.get('doc_id') for it in items if it.get('doc_id')}))
    return {'count': len(items), 'docs': docs}


@app.get('/api/docs/search')
def docs_search(q: str = None, k: int = 5):
    """Search the local vector store using a query string. Returns top-k chunks."""
    if not q:
        raise HTTPException(status_code=400, detail='query param q is required')
    emb = embed_text(q)
    if not emb:
        return {'query': q, 'results': []}
    results = query(emb, top_k=k)
    out = []
    for score, item in results:
        out.append({
            'score': float(score),
            'doc_id': item.get('doc_id'),
            'chunk_id': item.get('chunk_id'),
            'text': item.get('text')
        })
    return {'query': q, 'results': out}


@app.post('/api/docs/clear')
def docs_clear():
    """Clear the file-backed embeddings store (admin)."""
    try:
        if os.path.exists(EMB_FILE_PATH):
            os.remove(EMB_FILE_PATH)
        return {'cleared': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/docs/export-training')
def export_training(payload: dict = None):
    """Create a simple training export from stored chunks and return the path."""
    try:
        out = export_training_dataset()
        return {'exported': out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/health')
def health():
    return {'status': 'ok'}


# ============================================================
# RAG ENDPOINTS (NEW)
# ============================================================

@app.post('/api/rag/search')
def rag_search(req: RAGSearchRequest):
    """
    Search for relevant chunks using RAG.
    
    Routes to FAISS (seagate), local embeddings, or external agent
    based on RAG_MODE configuration.
    
    Request:
        query: str - search query
        top_k: int (optional) - number of results; defaults to CONFIG_TOP_K
    
    Response:
        {
            "results": [
                {
                    "id": "chunk_id",
                    "text": "chunk text",
                    "score": 0.95,
                    "source": {
                        "doc_id": "...",
                        "title": "...",
                        "author": "...",
                        "url": "...",
                        "source_path": "..."
                    }
                },
                ...
            ]
        }
    
    Error Responses:
        503: Lakehouse not available (seagate mode, paths not found)
        500: Embedding dimension mismatch or other server error
    """
    # Validate config before searching
    config_valid, config_error = validate_config()
    if not config_valid and RAG_MODE == 'seagate':
        return {
            "status": "error",
            "message": f"Lakehouse not available: {config_error}. "
                       f"Confirm {FAISS_INDEX_PATH} and {METADATA_DB_PATH} are accessible.",
            "results": [],
        }

    request_payload = RAGSearchRequest(**req.dict())
    if request_payload.top_k is None:
        request_payload.top_k = CONFIG_TOP_K

    try:
        response = orchestrator.search(request_payload)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return response.dict()


@app.post('/api/blog/generate')
def blog_generate(req: BlogGenerateRequest):
    """
    Generate a blog post using RAG-retrieved context and LLM synthesis.
    
    Retrieves relevant chunks, then calls LLM (Ollama/OpenAI/mock)
    to synthesize into a professional blog post.
    
    Request:
        topic: str - blog topic / title
        audience: str - "general" | "technical" | "business" (default: general)
        length: str - "short" | "medium" | "long" (default: medium)
        top_k: int (optional) - chunks to retrieve (default: CONFIG_TOP_K)
    
    Response:
        {
            "id": "blog_uuid",
            "title": "Generated Title",
            "content_markdown": "# ...",
            "created_at": "2025-12-27T...",
            "sources": [...]
        }
    """
    request_payload = BlogGenerateRequest(**req.dict())
    if request_payload.top_k is None:
        request_payload.top_k = CONFIG_TOP_K

    try:
        response = orchestrator.generate_blog(request_payload)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    blog_record = BlogRecord(
        id=response.id,
        title=response.title,
        subtitle=response.subtitle,
        content_markdown=response.content_markdown,
        created_at=response.created_at,
        image=response.image,
        audience=request_payload.audience,
        length=request_payload.length,
        sources=response.sources,
        validation=response.validation,
        trace=response.trace,
    )

    try:
        blog_store.append_blog(blog_record)
    except Exception as exc:  # pragma: no cover - defensive logging only
        logging.warning(f"Could not persist blog: {exc}")

    payload = response.dict()
    payload["created_at"] = response.created_at.isoformat()
    return payload


@app.get('/api/rag/status')
def rag_status():
    """
    Get current RAG status and configuration.
    
    Useful for debugging and verifying setup.
    """
    config_valid, config_error = validate_config()

    return {
        "mode": RAG_MODE,
        "config_valid": config_valid,
        "config_error": config_error,
        "embedding_dimension": 768,  # From config
        "top_k": CONFIG_TOP_K,
        "faiss_index_path": FAISS_INDEX_PATH if RAG_MODE == 'seagate' else None,
        "metadata_db_path": METADATA_DB_PATH if RAG_MODE == 'seagate' else None,
    }


@app.get('/api/telemetry')
def telemetry(limit: int = 25):
    """Return the most recent orchestrator runs for observability dashboards."""
    try:
        events = telemetry_store.fetch_recent(limit=limit)
    except Exception as exc:  # pragma: no cover - defensive logging only
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    payload = [TelemetryEvent(**event).dict() for event in events]
    return {"events": payload, "limit": limit}


@app.get('/api/llm/status')
def llm_status():
    """
    Get LLM synthesis status.
    
    Checks if configured LLM service is available.
    """
    from server.config import LLM_MODE, LLM_URL, LLM_MODEL
    from server.services.llm import check_ollama_availability
    
    status = {
        "mode": LLM_MODE,
        "available": False,
        "message": ""
    }
    
    if LLM_MODE == 'ollama':
        available = check_ollama_availability()
        status["available"] = available
        if available:
            status["message"] = f"Ollama running at {LLM_URL}, model: {LLM_MODEL}"
        else:
            status["message"] = f"Ollama not running at {LLM_URL}. Start with: ollama run {LLM_MODEL} (e.g., ollama run llama3.1:8b)"
    elif LLM_MODE == 'openai':
        from server.config import OPENAI_API_KEY
        status["available"] = bool(OPENAI_API_KEY)
        status["message"] = "OpenAI API" + (" configured" if OPENAI_API_KEY else " NOT configured (set OPENAI_API_KEY env var)")
    elif LLM_MODE == 'mock':
        status["available"] = True
        status["message"] = "Mock/template mode (no actual LLM)"
    
    return status


@app.get('/api/blogs')
def get_blogs():
    """Get list of all generated blogs."""
    blogs = blog_store.load_blogs()
    return sorted(blogs, key=lambda b: b.get('created_at', ''), reverse=True)


@app.get('/api/blogs/{blog_id}')
def get_blog(blog_id: str):
    """Get a specific blog by ID."""
    blog = blog_store.get_blog(blog_id)
    if not blog:
        raise HTTPException(status_code=404, detail=f"Blog {blog_id} not found")
    return blog


@app.put('/api/blogs/{blog_id}')
def update_blog(blog_id: str, update: BlogUpdateRequest):
    """Update a blog post by ID."""
    updated = blog_store.update_blog(blog_id, update.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Blog {blog_id} not found")
    return updated


@app.delete('/api/blogs/{blog_id}')
def delete_blog(blog_id: str):
    """Delete a blog post by ID."""
    deleted = blog_store.delete_blog(blog_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Blog {blog_id} not found")
    return {"deleted": True, "id": blog_id}
