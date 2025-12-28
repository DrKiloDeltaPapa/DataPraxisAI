import os
import json
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
from server.services.embeddings import embed_text
from server.services.vector_store import add_embedding, query
from server.services.ingest import ingest_dir
from server.services.training import export_training_dataset
from server.services.rag_client import get_rag_client

APP_ROOT = os.path.dirname(__file__)
DATA_DIR = os.path.join(APP_ROOT, 'data')
BLOGS_FILE = os.path.join(DATA_DIR, 'blogs.json')
EMB_FILE_PATH = os.path.join(DATA_DIR, 'embeddings.json')

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


class RAGSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = None


class BlogGenerateRequest(BaseModel):
    topic: str
    audience: str = "general"
    length: str = "medium"
    top_k: Optional[int] = None


def _read_blogs():
    if not os.path.exists(BLOGS_FILE):
        return []
    with open(BLOGS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


@app.get('/api/blogs')
def get_blogs():
    return _read_blogs()


@app.post('/api/generate')
def generate(req: GenerateRequest):
    # Simple RAG: embed prompt, retrieve top chunks, and return a mock combined answer
    emb = embed_text(req.prompt)
    if not emb:
        # fallback: return mock generation
        return {'content': f'Generated (mock) for prompt: {req.prompt}', 'sources': []}
    results = query(emb, top_k=req.n_results)
    # build a simple answer using retrieved texts
    combined = "\n\n".join([r[1]['text'] for r in results])
    answer = f"[RAG answer]\n\nContext:\n{combined}\n\nResponse for prompt: {req.prompt}"
    return {'content': answer, 'sources': [r[1] for r in results]}


@app.post('/api/docs/ingest')
def ingest_docs(payload: dict):
    # payload should contain doc_id and text chunks
    docs = payload.get('docs') or []
    saved = 0
    for doc in docs:
        doc_id = doc.get('doc_id')
        chunks = doc.get('chunks') or []
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
    try:
        # Validate config before searching
        config_valid, config_error = validate_config()
        if not config_valid and RAG_MODE == 'seagate':
            return {
                "status": "error",
                "message": f"Lakehouse not available: {config_error}. "
                           f"Confirm {FAISS_INDEX_PATH} and {METADATA_DB_PATH} are accessible.",
                "results": [],
            }

        # Embed query
        query_vector = embed_text(req.query)
        if not query_vector:
            raise HTTPException(
                status_code=500,
                detail="Failed to embed query; check embeddings service"
            )

        # Determine top_k
        top_k = req.top_k if req.top_k else CONFIG_TOP_K

        # Search via RAG adapter
        rag_client = get_rag_client()
        results = rag_client.search(query_vector, top_k=top_k)

        return {
            "status": "ok",
            "mode": RAG_MODE,
            "results": results,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"RAG search failed: {str(e)}")


@app.post('/api/blog/generate')
def blog_generate(req: BlogGenerateRequest):
    """
    Generate a blog post using RAG-retrieved context.
    
    Retrieves relevant chunks, then (optionally) calls an LLM
    to synthesize into a blog post.
    
    Currently returns a stub response with retrieved sources.
    Full LLM synthesis depends on integration with Ollama or external LLM.
    
    Request:
        topic: str - blog topic / title
        audience: str - "general" | "technical" | "business" (default: general)
        length: str - "short" | "medium" | "long" (default: medium)
        top_k: int (optional) - chunks to retrieve (default: CONFIG_TOP_K)
    
    Response:
        {
            "title": "Generated Title",
            "content_markdown": "# ...",
            "sources": [
                {
                    "id": "chunk_id",
                    "score": 0.95,
                    "title": "Source Title",
                    "author": "Author Name",
                    "url": "https://...",
                    "path": "/source/file.txt"
                },
                ...
            ]
        }
    """
    try:
        # Embed topic as query
        query_vector = embed_text(req.topic)
        if not query_vector:
            raise HTTPException(
                status_code=500,
                detail="Failed to embed topic"
            )

        # Retrieve relevant chunks
        top_k = req.top_k if req.top_k else CONFIG_TOP_K
        rag_client = get_rag_client()
        search_results = rag_client.search(query_vector, top_k=top_k)

        if not search_results:
            return {
                "title": req.topic,
                "content_markdown": f"# {req.topic}\n\nNo relevant content found.",
                "sources": [],
            }

        # Build sources for response
        sources = [
            {
                "id": r.get("id", ""),
                "score": r.get("score", 0),
                "title": r.get("source", {}).get("title", "Untitled"),
                "author": r.get("source", {}).get("author", "Unknown"),
                "url": r.get("source", {}).get("url", ""),
                "path": r.get("source", {}).get("source_path", ""),
            }
            for r in search_results
        ]

        # Build stub markdown content
        # In production, this would call LLM (Ollama, OpenAI, etc.)
        context_snippets = "\n\n".join(
            f"**[{i+1}]** {r.get('text', '')[:200]}..."
            for i, r in enumerate(search_results[:3])
        )

        content_markdown = f"""# {req.topic}

## Overview
This blog post was generated using Retrieval-Augmented Generation (RAG) from your AI lakehouse.

**Mode**: {RAG_MODE}
**Audience**: {req.audience}
**Length**: {req.length}

## Key Points from Sources
{context_snippets}

## References
See sources below for complete information.
"""

        return {
            "title": req.topic,
            "content_markdown": content_markdown,
            "sources": sources,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Blog generation failed: {str(e)}")


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
