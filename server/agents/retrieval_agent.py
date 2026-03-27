"""Retrieval agent backed by the existing RAG client implementation."""

from __future__ import annotations

from typing import List, Sequence

from server.agents.base import RetrievalAgent
from server.schemas.rag import RAGSearchRequest, RAGSearchResult
from server.services.rag_client import get_rag_client


class DefaultRetrievalAgent(RetrievalAgent):
    """Thin adapter around the existing vector search client."""

    def __init__(self):
        self._client = get_rag_client()

    def run(self, request: RAGSearchRequest, *, embeddings: Sequence[float]) -> List[RAGSearchResult]:
        results = self._client.search(list(embeddings), top_k=request.top_k)
        return [RAGSearchResult(**r) for r in results]
