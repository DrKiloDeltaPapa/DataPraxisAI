# DataPraxisAI Blog Application

A full-stack blog generation system powered by **Retrieval-Augmented Generation (RAG)** using a FAISS vector index backed by the AI lakehouse on Borg1's Seagate drive.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Client (React + Vite)                                           │
│ - Admin dashboard: Generate blog posts                          │
│ - Home/Blog pages: Display generated content                    │
└─────────────┬───────────────────────────────────────────────────┘
              │ HTTP
              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Server (Python FastAPI)                                         │
│ - /api/rag/search          → Search FAISS + SQLite             │
│ - /api/blog/generate       → RAG + LLM synthesis               │
│ - /api/docs/...            → Legacy embeddings management      │
└─────────────┬──────────────┬────────────────────────────────────┘
              │              │
    RAG_MODE  ↓              ↓
  ┌─────────────────────────────────────────┐
  │ seagate (Borg1)                         │
  │ - FAISS index: 9.4M vectors, dim=768   │
  │ - SQLite metadata + chunks              │
  │ - Path: /mnt/seagate_ai_corpus          │
  │                                         │
  │ local (MacBook dev fallback)            │
  │ - embeddings.json + cosine similarity   │
  │                                         │
  │ agent (future)                          │
  │ - External HTTP agent service           │
  └─────────────────────────────────────────┘
```


## Features

### Multi-agent pipeline

The backend now routes all retrieval and generation work through a lightweight orchestration layer (see [ARCHITECTURE.md](ARCHITECTURE.md) for the full diagram):

| Component | Responsibility |
|-----------|----------------|
| **Orchestrator** | Receives API requests, determines task order, aggregates agent traces + validation. |
| **Retrieval agent** | Embeds the query/topic and queries FAISS/local/remote vector stores via `server/services/rag_client.py`, returning chunk text + metadata. |
| **Reasoning agent** | Builds prompts from retrieved context and calls the configured LLM provider (Ollama/OpenAI/mock). |
| **Validation agent** | Performs grounding checks (context presence, citation metadata) and surfaces warnings for the UI/logs. |

Each API response now includes optional `validation` and `trace` payloads so clients can display provenance and debugging details.

### Telemetry + traces

- Every orchestrated `/api/rag/search` and `/api/blog/generate` run is persisted to `server/data/telemetry.db` (SQLite).
- The new `GET /api/telemetry?limit=25` endpoint streams those rows back so the Admin UI can render a live timeline of retrieval chunks, validation status, and agent traces.
- Telemetry rows capture the original request payload, chunk counts, duration (ms), validation findings, traces, and summarized sources/results for easy observability.
- The broader eval + training workflow that builds on this telemetry lives in [MODEL_LIFECYCLE.md](MODEL_LIFECYCLE.md).

- Generate blogs using RAG + LLM with strict format (title, subtitle, date, image, markdown)
- All blogs include a random image from `/src/assets/blog_pic_1.png` to `/blog_pic_14.png`
- Admin dashboard: generate, edit, and delete blogs
- Blog images always shown at the top; YAML frontmatter hidden from readers
- Robust error handling and environment-driven config

## API Endpoints

- `POST /api/blog/generate` — Generate a new blog (RAG + LLM)
- `GET /api/blogs` — List all blogs
- `GET /api/blogs/{id}` — Get a single blog
- `PUT /api/blogs/{id}` — Update a blog (title, subtitle, image, markdown, etc.)
- `DELETE /api/blogs/{id}` — Delete a blog
- `GET /api/telemetry` — Retrieve recent orchestrator runs for observability dashboards

## Admin UI Usage

- Go to `/admin` to:
  - Generate new blogs
  - Edit title, subtitle, image, and markdown for any blog
  - Delete blogs
  - All changes are persisted to the backend

---
## Setup Instructions

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **MacBook**: Just clone and install dependencies
- **Borg1**: Seagate drive mounted at `/mnt/seagate_ai_corpus` with FAISS index + metadata.db

### 1. Clone the Repository

```bash
git clone https://github.com/DrKiloDeltaPapa/DataPraxisAI.git
cd DataPraxisAI
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure for your environment:

```bash
cp .env.example .env
```

#### On **Borg1** (with Seagate access):

```bash
# .env
RAG_MODE=seagate
LAKEHOUSE_ROOT=/mnt/seagate_ai_corpus
FAISS_INDEX_PATH=$LAKEHOUSE_ROOT/indexes/llama3_bge_v1.faiss
FAISS_IDMAP_PATH=$LAKEHOUSE_ROOT/indexes/llama3_bge_v1_idmap.json
METADATA_DB_PATH=$LAKEHOUSE_ROOT/metadata.db
```

#### On **MacBook** (development, no Seagate):

```bash
# .env
RAG_MODE=local
# Seagate paths will not be accessed; local embeddings.json is used instead
```

pip install -r requirements.txt
### 3. Backend Setup

> Run from the **repo root** so imports like `server.*` resolve correctly.

```bash
cd server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies (includes faiss-cpu and ollama client)
pip install -r requirements.txt

# Back to repo root, then start FastAPI (default: http://127.0.0.1:8000)
cd ..
python -m uvicorn server.main:app --reload
```

### 4. Frontend Setup

In a new terminal:

```bash
cd client

# Install npm dependencies
npm install

# Start dev server (default: http://localhost:5173)
npm run dev
```

Copy the frontend environment template if you plan to build static assets:

```bash
cp client/.env.example client/.env
```

- `VITE_BASE_PATH` controls the public path for bundled assets (leave `/` for local dev, set to `/DataPraxisAI/` for GitHub Pages).
- `VITE_API_BASE` points the UI at a deployed FastAPI backend (leave blank locally to use the dev proxy, set to your Cloud Run / Render URL for static hosting).

#### GitHub Pages / static hosting

1. Set `VITE_BASE_PATH=/REPO_NAME/` and `VITE_API_BASE=https://your-backend.example.com` in `client/.env`.
2. Run `npm run build` to produce `client/dist` with the correct public paths.
3. Publish `client/dist` via GitHub Pages (e.g., push to a `gh-pages` branch or enable the Pages workflow) and update the repo “About” link to the published URL.
4. Make sure the referenced backend is reachable over HTTPS and exposes the `/api/*` routes; GitHub Pages itself can only host the static frontend.

## Evaluation & Training Lifecycle

Use telemetry plus the helper scripts in this repo to prove every change is safe to ship:

- **Ingestion & indexing** — Refresh embeddings via `server/scripts/ingest_pdfs.py` and `server/services/ingest.py`, then rebuild FAISS/SQLite metadata as needed with the helpers in `server/services/vector_store.py` and `server/services/db_access.py`.
- **Telemetry reviews** — Inspect `server/data/telemetry.db` (also surfaced in the Admin UI) to compare chunk counts, validation warnings, and latency before/after a change.
- **Dataset exports** — Run `export_training_dataset()` from `server/services/training.py` to produce JSONL prompt/completion files for fine-tuning or regression tests.
- **Scoring & governance** — Follow the detailed playbook in [MODEL_LIFECYCLE.md](MODEL_LIFECYCLE.md) for checklists, annotation tips, and reporting expectations.

Always reference the telemetry IDs or evaluation sheets from your testing when opening a PR so reviewers can replay the scenario.

### 5. Verify Setup

1. Open Admin page: `http://localhost:5173/admin`
2. Check **RAG Status** at the top:
   - **Borg1 (seagate mode)**: "✓ RAG Ready" (green)
   - **MacBook (local mode)**: "⚠ Limited RAG" (yellow, but functional)
3. Try generating a blog post by entering a topic

---

## Features

### Admin Dashboard (`/admin`)

#### Generate Blog Post
- Enter a **topic/title**
- Select **audience** (General, Technical, Business)
- Choose **length** (Short, Medium, Long)
- Click **Generate Blog Post**
- View rendered markdown + citations

#### Vector Search (Legacy)
- Search the local embeddings.json
- Manage embeddings (refresh status, clear)
- Export training datasets

### API Endpoints

#### Search RAG Index
```http
POST /api/rag/search
Content-Type: application/json

{
  "query": "machine learning frameworks",
  "top_k": 8
}
```

Response:
```json
{
  "status": "ok",
  "mode": "seagate",
  "results": [
    {
      "id": "chunk_12345",
      "text": "...",
      "score": 0.95,
      "source": {
        "doc_id": "doc_001",
        "title": "Deep Learning Handbook",
        "author": "Jane Doe",
        "url": "https://...",
        "source_path": "/corpus/docs/handbook.pdf"
      }
    }
  ],
  "validation": {
    "passed": true,
    "findings": []
  },
  "trace": [
    { "agent": "orchestrator", "status": "running", "detail": "search" },
    { "agent": "retrieval", "status": "ok", "detail": "returned 8 chunks" }
  ]
}
```

#### Generate Blog
```http
POST /api/blog/generate
Content-Type: application/json

{
  "topic": "Generative AI Applications",
  "audience": "technical",
  "length": "medium",
  "top_k": 8
}
```

Response:
```json
{
  "title": "Generative AI Applications",
  "content_markdown": "# ...",
  "sources": [
    {
      "id": "chunk_12345",
      "score": 0.95,
      "title": "...",
      "author": "...",
      "url": "...",
      "path": "..."
    }
  ],
  "validation": {
    "passed": true,
    "findings": []
  },
  "trace": [
    { "agent": "retrieval", "status": "ok" },
    { "agent": "reasoning", "status": "ok" }
  ]
}
```

#### RAG Status
```http
GET /api/rag/status
```

#### Telemetry feed
```http
GET /api/telemetry?limit=20
```

Response:
```json
{
  "limit": 20,
  "events": [
    {
      "id": 14,
      "created_at": "2024-07-04T02:15:01.982081",
      "kind": "blog_generate",
      "payload": {"topic": "Responsible AI", "audience": "technical"},
      "chunk_count": 8,
      "duration_ms": 4125.7,
      "validation": {"passed": true, "findings": []},
      "trace": [
        {"agent": "orchestrator", "status": "running", "detail": "blog_generate"},
        {"agent": "retrieval", "status": "ok", "detail": "8 chunks"}
      ]
    }
  ]
}
```

---

## Environment Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `RAG_MODE` | `local` | `seagate` \| `local` \| `agent` |
| `LAKEHOUSE_ROOT` | `/mnt/seagate_ai_corpus` | Borg1 Seagate path |
| `FAISS_INDEX_PATH` | `$LAKEHOUSE_ROOT/indexes/llama3_bge_v1.faiss` | FAISS binary index |
| `FAISS_IDMAP_PATH` | `$LAKEHOUSE_ROOT/indexes/llama3_bge_v1_idmap.json` | Chunk ID mapping |
| `METADATA_DB_PATH` | `$LAKEHOUSE_ROOT/metadata.db` | SQLite metadata |
| `EMBEDDING_DIMENSION` | `768` | Must match FAISS index |
| `TOP_K` | `8` | Default retrieval count |
| `RAG_AGENT_URL` | `http://127.0.0.1:9000` | External agent (future) |

---

## Lakehouse Structure (Borg1 Seagate)

```
/mnt/seagate_ai_corpus/
├── corpus/
│   ├── raw/              # Harvested source documents
│   ├── clean/            # Normalized full-text
│   └── chunks/           # Chunked text (used for RAG)
├── indexes/
│   ├── llama3_bge_v1.faiss          # FAISS index: 9,411,960 vectors, dim=768
│   └── llama3_bge_v1_idmap.json     # Maps FAISS row IDs → chunk IDs
├── metadata.db          # SQLite: chunks, sources, metadata
├── logs/                # Processing logs
└── models/              # Optional cached models (Ollama, etc.)
```

**Do NOT commit lakehouse files to Git.** The `.gitignore` excludes:
- `server/data/embeddings.json`
- `server/data/*.faiss`
- `server/data/*.index`
- Lakehouse paths never appear in Git

---

## Development & Testing

### Test RAG Search (using curl)

```bash
# On Borg1 (seagate mode):
curl -X POST http://127.0.0.1:8000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning", "top_k": 5}'

# Expected: Results from FAISS + metadata
```

### Check Configuration

```bash
curl http://127.0.0.1:8000/api/rag/status
```

### Build for Production

**Frontend:**
```bash
cd client
npm run build
# Output: client/dist/
```

**Backend:**
- Just run via Gunicorn or your ASGI server of choice:
  ```bash
  gunicorn -w 4 -k uvicorn.workers.UvicornWorker server.main:app
  ```

### Container images & Cloud Run

- **Backend Dockerfile**: [server/Dockerfile](server/Dockerfile) (Python 3.11 + Uvicorn, ready for Cloud Run `PORT=8080`).
- **Frontend Dockerfile**: [client/Dockerfile](client/Dockerfile) (multi-stage Node build + nginx runtime).
- **Global `.dockerignore`**: [./.dockerignore](.dockerignore) keeps FAISS indexes, node_modules, and local data out of image layers.
- **Deployment playbook**: see [deployment/gcp/cloudrun.md](deployment/gcp/cloudrun.md) for Artifact Registry + Cloud Run steps and [deployment/gcp/cloudbuild.yaml](deployment/gcp/cloudbuild.yaml) for an automated build pipeline.

> Tip: When running locally with Docker, mount your `.env` (or use `--env-file`) and, if needed, mount `/mnt/seagate_ai_corpus` as a read-only volume when building on Borg1.

---

## Troubleshooting

### "Lakehouse not available" Error

**On Borg1:**
- Confirm Seagate drive is mounted: `ls -la /mnt/seagate_ai_corpus`
- Check paths in `.env` match actual files
- Verify FAISS index exists and is readable

**On MacBook:**
- This is expected. Set `RAG_MODE=local` and use local embeddings.json instead
- Or set `RAG_MODE=agent` and connect to Borg1's agent service (if running)

### "Embedding dimension mismatch" (500 error)

- FAISS index dimension ≠ 768 (configured)
- Check FAISS index was built with correct embedding model (BGE, Llama3, etc.)
- Verify `EMBEDDING_DIMENSION=768` in `.env`

### Slow Retrieval

- FAISS index is large (9.4M vectors). First load may take 10–30s.
- **Solution**: FAISS is cached in memory after first request (singleton pattern)
- Consider using GPU-accelerated FAISS on Borg1: `pip install faiss-gpu`

### Port Conflicts

- **Server** (FastAPI): change with `uvicorn main:app --port 9000`
- **Client** (Vite): change in `client/vite.config.js` or `npm run dev -- --port 3000`

---

## Future Enhancements

1. **LLM Synthesis**: Integrate Ollama (local) or OpenAI to generate blog content instead of stub
2. **Agent Service**: Run dedicated agent on Borg1; allow MacBook to connect via HTTP
3. **Persistent Storage**: Move from `blogs.json` to PostgreSQL for scalability
4. **Multi-Index Support**: Switch between different embedding models/indexes at runtime
5. **Caching**: Add Redis for frequently retrieved chunks
6. **Monitoring**: Add logging/metrics for RAG performance and latency

---

## Contributing

1. Create a branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add my feature'`
3. Push: `git push origin feature/my-feature`
4. Open a PR to `main`

---

## License

MIT (or your chosen license)

---

## Contact

For questions or issues, contact the DataPraxisAI team or open an issue on GitHub.
