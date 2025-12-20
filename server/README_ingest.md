Ingest PDFs locally into the file-backed vector store
====================================================

Overview
--------
This repository includes a small local ingestion script at `server/scripts/ingest_pdfs.py`.
It scans a directory for PDF files, extracts text (PyPDF2), chunks the text, generates embeddings
(using the local `embed_text` function which will call OpenAI if `OPENAI_API_KEY` is set, otherwise a deterministic mock embedding),
and writes items to the simple file-backed vector store (`server/data/embeddings.json`).

Quick setup
-----------
1. Create and activate a Python virtualenv in the `server/` folder (recommended):

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. (Optional) Set environment variables in `.env` or your shell:

- `OPENAI_API_KEY` - if you want real embeddings from OpenAI (optional)
- `RAG_DOC_ROOT` - default directory scanned by the script (defaults to `./server/data/docs`)

Running the ingestion script
----------------------------
Place documents under the configured directory (default `server/data/docs/`). Supported formats: .pdf, .txt, .md, .html and .docx.

CLI usage (local):
Place files under `server/data/docs/` then run:

```bash
python server/scripts/ingest_pdfs.py --dir server/data/docs
```

Use `--dry-run` to preview actions without writing to the embedding store:

```bash
python server/scripts/ingest_pdfs.py --dir server/data/docs --dry-run
```

Notes & next steps
------------------
- The script uses simple character-based chunking (chunk ~1200 chars with 300 overlap). This is simple and robust for mixed PDFs but can be replaced with token-aware chunkers later.
- Embeddings are stored in `server/data/embeddings.json` using the existing `server/services/vector_store` API.
- For large corpora, consider switching to a vector DB like Chroma, FAISS, or PGVector.

If you want, I can extend the script to support plain text, .docx, or to POST chunks to the running FastAPI ingestion endpoint instead of writing directly to the file-backed store.

Server-side HTTP ingestion
--------------------------
The backend exposes an endpoint to ingest files from paths accessible to the server process:

- POST `/api/docs/ingest-path` with JSON `{ "path": "/absolute/path/to/dir", "recursive": true }`.

This is useful when your Seagate drive is mounted on the same machine as the server. The server will read files and write embeddings into `server/data/embeddings.json`.

You can check ingestion status via GET `/api/docs/status` which returns `{ count: <num_embeddings>, docs: [<doc_id>, ...] }`.
