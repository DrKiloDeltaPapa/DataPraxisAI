from server.services.embeddings import embed_text
from server.services.vector_store import query

class LocalRag:
    def __init__(self, settings):
        self.settings = settings
        self.top_k = settings.top_k

    def search(self, query, top_k=None):
        emb = embed_text(query)
        results = query(emb, top_k=top_k or self.top_k)
        out = []
        for score, item in results:
            out.append({
                "id": item.get("doc_id"),
                "score": float(score),
                "chunk": item.get("text"),
                "source": {
                    "title": item.get("title"),
                    "author": item.get("author"),
                    "url": item.get("url"),
                    "path": item.get("path"),
                }
            })
        return out
