"""
Configuration for DataPraxisAI RAG backend.

Supports environment-driven settings for:
- RAG mode (seagate, local, agent)
- Lakehouse paths (FAISS index, ID map, SQLite metadata)
- LLM + retrieval parameters
"""

import os
from typing import Optional

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

# RAG Mode: determines which retrieval backend to use
#   - seagate: direct access to /mnt/seagate_ai_corpus (Borg1 only)
#   - local: in-process embeddings.json + cosine search (fallback)
#   - agent: external HTTP agent at RAG_AGENT_URL (future)
RAG_MODE = os.getenv('RAG_MODE', 'local').lower()

# Lakehouse Root (Borg1 storage)
LAKEHOUSE_ROOT = os.getenv('LAKEHOUSE_ROOT', '/mnt/seagate_ai_corpus')

# FAISS Index paths (relative to LAKEHOUSE_ROOT if not absolute)
FAISS_INDEX_PATH = os.getenv(
    'FAISS_INDEX_PATH',
    os.path.join(LAKEHOUSE_ROOT, 'indexes', 'llama3_bge_v1.faiss')
)
FAISS_IDMAP_PATH = os.getenv(
    'FAISS_IDMAP_PATH',
    os.path.join(LAKEHOUSE_ROOT, 'indexes', 'llama3_bge_v1_idmap.json')
)

# SQLite metadata database
METADATA_DB_PATH = os.getenv(
    'METADATA_DB_PATH',
    os.path.join(LAKEHOUSE_ROOT, 'metadata.db')
)

# Embedding dimension (must match index)
EMBEDDING_DIMENSION = int(os.getenv('EMBEDDING_DIMENSION', '768'))

# RAG retrieval parameters
TOP_K = int(os.getenv('TOP_K', '8'))

# External agent endpoint (for RAG_MODE=agent)
RAG_AGENT_URL = os.getenv('RAG_AGENT_URL', 'http://127.0.0.1:9000')

# ============================================================
# VALIDATION & LOGGING
# ============================================================

def validate_config() -> tuple[bool, Optional[str]]:
    """
    Validate config based on RAG_MODE.
    Returns (is_valid, error_message).
    """
    if RAG_MODE == 'seagate':
        if not os.path.exists(FAISS_INDEX_PATH):
            return False, f"FAISS index not found: {FAISS_INDEX_PATH}"
        if not os.path.exists(FAISS_IDMAP_PATH):
            return False, f"FAISS ID map not found: {FAISS_IDMAP_PATH}"
        if not os.path.exists(METADATA_DB_PATH):
            return False, f"Metadata DB not found: {METADATA_DB_PATH}"
    elif RAG_MODE == 'agent':
        if not RAG_AGENT_URL:
            return False, "RAG_AGENT_URL not set for agent mode"
    # 'local' mode has no strict requirements (uses in-memory embeddings.json)
    
    return True, None


def log_config():
    """Log current configuration (safe, no secrets)."""
    print(f"[RAG Config] Mode: {RAG_MODE}")
    print(f"[RAG Config] Embedding dimension: {EMBEDDING_DIMENSION}")
    print(f"[RAG Config] Top-K: {TOP_K}")
    if RAG_MODE == 'seagate':
        print(f"[RAG Config] FAISS index: {FAISS_INDEX_PATH}")
        print(f"[RAG Config] Metadata DB: {METADATA_DB_PATH}")
    elif RAG_MODE == 'agent':
        print(f"[RAG Config] Agent URL: {RAG_AGENT_URL}")
