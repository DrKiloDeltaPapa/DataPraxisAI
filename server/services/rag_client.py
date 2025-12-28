"""
RAG Client: Unified interface for retrieval from multiple backends.

Supports:
1. seagate: FAISS index + SQLite metadata on Borg1 Seagate drive
2. local: In-process embeddings.json + cosine similarity (fallback)
3. agent: External HTTP agent (future)
"""

import json
import logging
import os
from typing import List, Dict, Optional, Tuple
import math
import httpx

try:
    import faiss
except ImportError:
    faiss = None

from server.config import (
    RAG_MODE,
    FAISS_INDEX_PATH,
    FAISS_IDMAP_PATH,
    METADATA_DB_PATH,
    EMBEDDING_DIMENSION,
    RAG_AGENT_URL,
)
from server.services.db_access import MetadataDB
from server.services.vector_store import query as local_query

logger = logging.getLogger(__name__)


# ============================================================
# FAISS Singleton (lazy-loaded)
# ============================================================

class FAISSIndexCache:
    """Singleton cache for FAISS index + ID map."""

    _instance = None
    _index = None
    _idmap = None
    _index_dim = None

    @classmethod
    def get(cls) -> Optional['FAISSIndexCache']:
        """Get or create singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_index(self) -> Tuple[Optional[object], Optional[List[str]]]:
        """
        Load FAISS index and ID map from disk.
        
        Returns:
            (faiss_index, id_map_list)
            where id_map_list[i] is the semantic chunk_id for FAISS row i
        """
        if self._index is not None and self._idmap is not None:
            return self._index, self._idmap

        if not os.path.exists(FAISS_INDEX_PATH):
            logger.error(f"FAISS index not found: {FAISS_INDEX_PATH}")
            return None, None

        if not os.path.exists(FAISS_IDMAP_PATH):
            logger.error(f"FAISS ID map not found: {FAISS_IDMAP_PATH}")
            return None, None

        if faiss is None:
            logger.error("faiss not installed; install with: pip install faiss-cpu")
            return None, None

        try:
            # Load FAISS index
            self._index = faiss.read_index(FAISS_INDEX_PATH)
            self._index_dim = self._index.d

            # Validate dimension
            if self._index_dim != EMBEDDING_DIMENSION:
                logger.error(
                    f"Index dimension mismatch: index has {self._index_dim}, "
                    f"expected {EMBEDDING_DIMENSION}"
                )
                self._index = None
                self._index_dim = None
                return None, None

            # Load ID map
            with open(FAISS_IDMAP_PATH, 'r') as f:
                idmap_json = json.load(f)
                # Assume format: {"0": "chunk_id_1", "1": "chunk_id_2", ...}
                # or simple list: ["chunk_id_1", "chunk_id_2", ...]
                if isinstance(idmap_json, dict):
                    # Sort by numeric key
                    self._idmap = [idmap_json[str(i)] for i in range(len(idmap_json))]
                else:
                    self._idmap = idmap_json

            logger.info(
                f"FAISS index loaded: {len(self._idmap)} vectors, "
                f"dimension {self._index_dim}"
            )
            return self._index, self._idmap

        except Exception as e:
            logger.error(f"Error loading FAISS index: {e}")
            self._index = None
            self._idmap = None
            return None, None


# ============================================================
# RAG Client Interface
# ============================================================

class RAGClient:
    """
    Unified RAG retrieval interface.
    
    Routes to appropriate backend based on RAG_MODE.
    """

    def __init__(self):
        self.mode = RAG_MODE
        self.db = None
        if self.mode == 'seagate':
            try:
                self.db = MetadataDB(METADATA_DB_PATH)
            except Exception as e:
                logger.warning(f"Could not initialize metadata DB: {e}")

    def search(self, query_vector: List[float], top_k: int = 8) -> List[Dict]:
        """
        Retrieve top-k chunks for a query vector.
        
        Args:
            query_vector: embedding vector (expected dim 768)
            top_k: number of results to return
        
        Returns:
            list of dicts: {
                "id": chunk_id,
                "text": chunk_text,
                "score": similarity_score (0-1),
                "source": {
                    "doc_id": str,
                    "title": str,
                    "author": str,
                    "url": str,
                    "source_path": str,
                }
            }
        """
        if self.mode == 'seagate':
            return self._search_seagate(query_vector, top_k)
        elif self.mode == 'agent':
            return self._search_agent(query_vector, top_k)
        else:  # local
            return self._search_local(query_vector, top_k)

    def _search_seagate(self, query_vector: List[float], top_k: int) -> List[Dict]:
        """Search FAISS index on Seagate drive."""
        import numpy as np

        if len(query_vector) != EMBEDDING_DIMENSION:
            logger.error(
                f"Query vector dimension {len(query_vector)} "
                f"!= expected {EMBEDDING_DIMENSION}"
            )
            return []

        cache = FAISSIndexCache.get()
        index, idmap = cache.load_index()

        if index is None or idmap is None:
            logger.error("FAISS index not available")
            return []

        try:
            # FAISS expects 2D array (batch of vectors)
            query_array = np.array([query_vector], dtype='float32')

            # Search
            distances, indices = index.search(query_array, top_k)

            # Collect results
            results = []
            chunk_ids = []

            for dist, idx in zip(distances[0], indices[0]):
                if idx < 0:  # FAISS uses -1 for no result
                    continue
                if idx >= len(idmap):
                    logger.warning(f"Index {idx} out of range for idmap")
                    continue

                chunk_id = idmap[idx]
                chunk_ids.append(chunk_id)

                # Convert L2 distance to similarity score (0-1)
                # L2 distance: lower is better; scale to (0, 1) range
                score = 1.0 / (1.0 + float(dist))

                results.append({
                    "id": chunk_id,
                    "score": score,
                    "text": None,  # Will fill from DB
                    "source": {},
                })

            # Fetch metadata from SQLite
            if self.db and chunk_ids:
                metadata = self.db.get_chunks(chunk_ids)
                for r in results:
                    chunk_data = metadata.get(r["id"])
                    if chunk_data:
                        r["text"] = chunk_data.get("text", "")
                        r["source"] = {
                            "doc_id": chunk_data.get("doc_id", ""),
                            "title": chunk_data.get("title", ""),
                            "author": chunk_data.get("author", ""),
                            "url": chunk_data.get("url", ""),
                            "source_path": chunk_data.get("source_path", ""),
                        }

            return results

        except Exception as e:
            logger.error(f"FAISS search error: {e}")
            return []

    def _search_local(self, query_vector: List[float], top_k: int) -> List[Dict]:
        """
        Search using local embeddings.json (fallback).
        
        Wraps existing vector_store.query() and enriches with mock metadata.
        """
        try:
            scored = local_query(query_vector, top_k)
            results = []

            for score, item in scored:
                results.append({
                    "id": f"{item.get('doc_id', 'doc')}#{item.get('chunk_id', '0')}",
                    "score": max(0, min(1, score)),  # Clamp to [0,1]
                    "text": item.get("text", ""),
                    "source": {
                        "doc_id": item.get("doc_id", ""),
                        "title": "",
                        "author": "",
                        "url": "",
                        "source_path": "",
                    },
                })

            return results

        except Exception as e:
            logger.error(f"Local search error: {e}")
            return []

    def _search_agent(self, query_vector: List[float], top_k: int) -> List[Dict]:
        """
        Search via external HTTP agent.
        
        Expects POST /search endpoint at RAG_AGENT_URL.
        """
        try:
            payload = {
                "query_vector": query_vector,
                "top_k": top_k,
            }
            with httpx.Client(timeout=30) as client:
                resp = client.post(
                    f"{RAG_AGENT_URL}/search",
                    json=payload,
                )
                if resp.status_code == 200:
                    return resp.json().get("results", [])
                else:
                    logger.error(f"Agent returned {resp.status_code}")
                    return []
        except Exception as e:
            logger.error(f"Agent search error: {e}")
            return []

    def close(self):
        """Clean up resources."""
        if self.db:
            self.db.close()


# ============================================================
# Module-level convenience functions
# ============================================================

_client = None


def get_rag_client() -> RAGClient:
    """Get singleton RAG client."""
    global _client
    if _client is None:
        _client = RAGClient()
    return _client


def search(query_vector: List[float], top_k: int = 8) -> List[Dict]:
    """Convenience wrapper."""
    client = get_rag_client()
    return client.search(query_vector, top_k)
