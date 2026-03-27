"""Reasoning agent responsible for LLM synthesis."""

from __future__ import annotations

from typing import List

from server.agents.base import ReasoningAgent
from server.schemas.rag import BlogGenerateRequest, RAGSearchResult
from server.services.llm import generate_blog as llm_generate_blog


class DefaultReasoningAgent(ReasoningAgent):
    def run(self, request: BlogGenerateRequest, *, context: List[RAGSearchResult]) -> str:
        if context:
            context_snippets = "\n\n".join(
                f"**Source [{i + 1}]: {chunk.source.title or 'Untitled'}**\n"
                f"{(chunk.text or '')[:500]}..."
                for i, chunk in enumerate(context[:5])
            )
        else:
            context_snippets = "(No relevant content found in knowledge base)"

        return llm_generate_blog(
            topic=request.topic,
            context_snippets=context_snippets,
            audience=request.audience,
            length=request.length,
        )
