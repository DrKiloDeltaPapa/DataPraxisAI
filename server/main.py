import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import List

load_dotenv()

from server.services.embeddings import embed_text
from server.services.vector_store import add_embedding, query
from server.services.ingest import ingest_dir
from server.services.training import export_training_dataset

APP_ROOT = os.path.dirname(__file__)
DATA_DIR = os.path.join(APP_ROOT, 'data')
BLOGS_FILE = os.path.join(DATA_DIR, 'blogs.json')
EMB_FILE_PATH = os.path.join(DATA_DIR, 'embeddings.json')

app = FastAPI(title='RAG Blog Backend (scaffold)')

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
