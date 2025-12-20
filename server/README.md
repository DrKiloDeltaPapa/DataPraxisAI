FastAPI RAG backend (scaffold)

Run (recommended inside a virtualenv):

1. Install requirements

   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt

2. Copy `.env.example` to `.env` and fill any keys (OPENAI_API_KEY if available)

3. Start the server

   uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload

Notes:
- This is a minimal scaffold with a few endpoints to get you started.
- The vector store and ingestion services are intentionally simple; swap to Chroma/FAISS/Pinecone in production.
