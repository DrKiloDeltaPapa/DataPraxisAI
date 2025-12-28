# QUICK START GUIDE — DataPraxisAI RAG

**For impatient users**: Copy, paste, and go!

---

## MacBook (Development)

```bash
# 1. Clone & navigate
git clone https://github.com/DrKiloDeltaPapa/DataPraxisAI.git
cd DataPraxisAI

# 2. Setup backend
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Start backend (Terminal 1)
cd ..
python -m uvicorn server.main:app --reload

# 4. In new terminal: Setup frontend
cd client
npm install
npm run dev

# 5. Open browser
# http://localhost:5173/admin

# 6. Click "Generate Blog Post" tab, enter topic, click generate
```

**Expected**: Yellow "⚠ Limited RAG" status (uses local mode—normal for Mac).

---

## Borg1 (Production, Seagate Access)

```bash
# 1. Clone & navigate
git clone https://github.com/DrKiloDeltaPapa/DataPraxisAI.git
cd DataPraxisAI

# 2. Create .env
cat > .env << 'EOF'
RAG_MODE=seagate
LAKEHOUSE_ROOT=/mnt/seagate_ai_corpus
EOF

# 3. Setup & start backend
cd server
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd ..
python -m uvicorn server.main:app --reload

# 4. In new terminal: Frontend
cd client
npm install && npm run dev

# 5. Open browser
# http://127.0.0.1:5173/admin

# 6. Should see green "✓ RAG Ready" status
# 7. Generate blog posts using FAISS + Seagate
```

---

## API Testing (curl)

```bash
# Check RAG status
curl http://127.0.0.1:8000/api/rag/status | jq

# Search vector database
curl -X POST http://127.0.0.1:8000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning", "top_k": 5}' | jq

# Generate blog
curl -X POST http://127.0.0.1:8000/api/blog/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI in 2025",
    "audience": "technical",
    "length": "medium"
  }' | jq
```

---

## Troubleshooting in 30 Seconds

| Issue | Fix |
|-------|-----|
| "ModuleNotFoundError: faiss" | `pip install faiss-cpu` |
| "Cannot find react-markdown" | `npm install react-markdown` |
| Server won't start | Check port 8000 is free; use `--port 9000` |
| Frontend won't load | Check port 5173 is free; use `npm run dev -- --port 3000` |
| CORS errors | Check FastAPI CORS origins in main.py (should include your Vite URL) |
| No RAG status showing | Backend not running; check Terminal 1 |
| "Lakehouse not available" on Mac | Expected—use local mode (default) |
| "Embedding dimension mismatch" | FAISS index != 768 dims (Borg1 only) |

---

## Files You Need to Know

| File | Purpose | Edit? |
|------|---------|-------|
| `.env` | Your local config (copy from `.env.example`) | YES |
| `server/config.py` | RAG mode logic | Rarely |
| `server/services/rag_client.py` | FAISS/local/agent adapter | Rarely |
| `client/src/pages/Admin.jsx` | Blog generation UI | If tweaking UI |
| `README.md` | Full documentation | Reference |

---

## Key Environment Variables

```bash
RAG_MODE=seagate              # or 'local' (MacBook), 'agent' (future)
LAKEHOUSE_ROOT=/mnt/seagate_ai_corpus
FAISS_INDEX_PATH=$LAKEHOUSE_ROOT/indexes/llama3_bge_v1.faiss
FAISS_IDMAP_PATH=$LAKEHOUSE_ROOT/indexes/llama3_bge_v1_idmap.json
METADATA_DB_PATH=$LAKEHOUSE_ROOT/metadata.db
TOP_K=8
```

---

## One-Liner Verification

```bash
# All systems check (after servers started)
echo "=== Backend ===" && curl -s http://127.0.0.1:8000/api/health && \
echo "=== RAG Status ===" && curl -s http://127.0.0.1:8000/api/rag/status | jq '.mode'
```

Expected output:
```
=== Backend ===
{"status":"ok"}
=== RAG Status ===
"seagate"     # (Borg1) or "local" (MacBook)
```

---

## Done? Next Steps

1. ✅ **Generate a blog post** via Admin UI
2. ✅ **Test RAG search** via curl or UI
3. ✅ **Check Sources** in generated blog (should list citations)
4. 📖 **Read [README.md](./README.md)** for full docs
5. 🔧 **Read [RAG_INTEGRATION_GUIDE.md](./RAG_INTEGRATION_GUIDE.md)** for tech details
6. 🚀 **Deploy** to production (Borg1) or keep developing (MacBook)

---

**Questions?** Check [README.md](./README.md#troubleshooting) or [RAG_INTEGRATION_GUIDE.md](./RAG_INTEGRATION_GUIDE.md).

**Issues?** Open a GitHub issue or check error logs in server terminal.

Happy blogging! 🎉
