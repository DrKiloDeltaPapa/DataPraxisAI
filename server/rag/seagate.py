import os
import json
import sqlite3
import numpy as np
from server.rag.rag_client import DimensionMismatch, LakehouseUnavailable

try:
    import faiss
except ImportError:
    faiss = None

class SeagateRag:
    def __init__(self, settings):
        self.settings = settings
        self.index_path = settings.faiss_index_path
        self.idmap_path = settings.faiss_idmap_path
        self.db_path = settings.metadata_db_path
        self.top_k = settings.top_k
        self._index = None
        self._idmap = None
        self._conn = None
        self._load()

    def _load(self):
        if not (os.path.exists(self.index_path) and os.path.exists(self.idmap_path) and os.path.exists(self.db_path)):
            raise LakehouseUnavailable(f"Lakehouse not available; confirm {self.settings.lakehouse_root} is mounted and paths are correct.")
        if faiss is None:
            raise RuntimeError("faiss not installed. Install faiss-cpu or faiss-gpu.")
        self._index = faiss.read_index(self.index_path)
        if self._index.d != 768:
            raise DimensionMismatch(f"FAISS index dimension {self._index.d} != 768. Rebuild index or check embedding model.")
        with open(self.idmap_path, "r") as f:
            self._idmap = json.load(f)
        self._conn = sqlite3.connect(self.db_path)

    def _embed(self, text):
        # Use a 768-dim embedding model (stub: random for now)
        # Replace with actual embedding model as needed
        return np.random.rand(768).astype(np.float32)

    def _fetch_metadata(self, ids):
        qmarks = ",".join(["?"] * len(ids))
        sql = f"SELECT id, chunk, title, author, url, path FROM chunks WHERE id IN ({qmarks})"
        cur = self._conn.cursor()
        rows = cur.execute(sql, ids).fetchall()
        meta = {row[0]: {"chunk": row[1], "title": row[2], "author": row[3], "url": row[4], "path": row[5]} for row in rows}
        return meta

    def search(self, query, top_k=None):
        emb = self._embed(query)
        D, I = self._index.search(np.array([emb]), top_k or self.top_k)
        idxs = I[0].tolist()
        scores = D[0].tolist()
        ids = [self._idmap[str(i)] for i in idxs if str(i) in self._idmap]
        meta = self._fetch_metadata(ids)
        results = []
        for i, id_ in enumerate(ids):
            m = meta.get(id_, {})
            results.append({
                "id": id_,
                "score": float(scores[i]),
                "chunk": m.get("chunk", ""),
                "source": {
                    "title": m.get("title"),
                    "author": m.get("author"),
                    "url": m.get("url"),
                    "path": m.get("path"),
                }
            })
        return results
