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
  ]
}
```

#### RAG Status
```http
GET /api/rag/status
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
