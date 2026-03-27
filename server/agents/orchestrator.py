"""Multi-agent orchestration layer for retrieval, reasoning, and validation."""

from __future__ import annotations

import random
import uuid
from datetime import datetime
from time import perf_counter
from typing import List, Optional

from server.agents.retrieval_agent import DefaultRetrievalAgent
from server.agents.reasoning_agent import DefaultReasoningAgent
from server.agents.validation_agent import DefaultValidationAgent
from server.schemas.rag import (
    AgentTraceStep,
    BlogGenerateRequest,
    BlogGenerateResponse,
    BlogSource,
    RAGSearchRequest,
    RAGSearchResponse,
)
from server.services.embeddings import embed_text
from server.services.rag_client import get_rag_client
from server.storage import telemetry_store


class Orchestrator:
    def __init__(self):
        self.retrieval_agent = DefaultRetrievalAgent()
        self.reasoning_agent = DefaultReasoningAgent()
        self.validation_agent = DefaultValidationAgent()
        self._rag_client = get_rag_client()

    def _trace(self, agent: str, status: str, detail: Optional[str] = None) -> AgentTraceStep:
        return AgentTraceStep(agent=agent, status=status, detail=detail)

    def _embed(self, text: str) -> List[float]:
        vector = embed_text(text)
        if not vector:
            raise ValueError("Embedding service returned empty vector")
        return vector

    def search(self, request: RAGSearchRequest) -> RAGSearchResponse:
        started = perf_counter()
        trace = [self._trace("orchestrator", "running", "search")]
        embeddings = self._embed(request.query)
        trace.append(self._trace("retrieval", "running"))
        results = self.retrieval_agent.run(request, embeddings=embeddings)
        trace.append(self._trace("retrieval", "ok", detail=f"returned {len(results)} chunks"))

        validation = self.validation_agent.run(context=results, output=None)
        trace.append(
            self._trace(
                "validation",
                "ok" if validation.passed else "warning",
                detail=f"{len(validation.findings)} findings",
            )
        )

        response = RAGSearchResponse(
            status="ok",
            mode=self._rag_client.mode,
            results=results,
            validation=validation,
            trace=trace,
        )

        telemetry_store.log_run(
            kind="rag_search",
            payload=request.dict(exclude_none=True),
            trace=[step.dict() for step in trace],
            validation=validation.dict() if validation else None,
            sources=[result.dict() for result in results],
            duration_ms=(perf_counter() - started) * 1000,
            chunk_count=len(results),
        )

        return response

    def generate_blog(self, request: BlogGenerateRequest) -> BlogGenerateResponse:
        started = perf_counter()
        trace = [self._trace("orchestrator", "running", "blog_generate")]
        embeddings = self._embed(request.topic)
        trace.append(self._trace("retrieval", "running"))
        retrieval_request = RAGSearchRequest(query=request.topic, top_k=request.top_k)
        context = self.retrieval_agent.run(retrieval_request, embeddings=embeddings)
        trace.append(self._trace("retrieval", "ok", detail=f"{len(context)} chunks"))

        trace.append(self._trace("reasoning", "running"))
        content_markdown = self.reasoning_agent.run(request, context=context)
        trace.append(self._trace("reasoning", "ok"))

        validation = self.validation_agent.run(context=context, output=content_markdown)
        trace.append(
            self._trace(
                "validation",
                "ok" if validation.passed else "warning",
                detail=f"{len(validation.findings)} findings",
            )
        )

        blog_id = str(uuid.uuid4())[:8]
        created_at = datetime.utcnow()
        image_choices = [f"/src/assets/blog_pic_{i}.png" for i in range(1, 15)]
        image = random.choice(image_choices)
        title = request.topic
        subtitle = f"A DataPraxisAI blog for {request.audience} readers"

        date = created_at.date().isoformat()
        frontmatter = (
            f"---\n"
            f"title: {title}\n"
            f"subtitle: {subtitle}\n"
            f"date: {date}\n"
            f"image: {image}\n"
            f"---\n\n"
        )
        normalized = content_markdown.strip()
        if normalized and not normalized.startswith("#") and not normalized.startswith("---"):
            content_markdown = f"# {title}\n\n{content_markdown}"
        content_markdown = frontmatter + content_markdown.strip()

        sources = [
            BlogSource(
                id=result.id,
                score=result.score,
                title=result.source.title,
                author=result.source.author,
                url=result.source.url,
                path=result.source.source_path,
            )
            for result in context
        ]

        response = BlogGenerateResponse(
            id=blog_id,
            title=title,
            subtitle=subtitle,
            content_markdown=content_markdown,
            created_at=created_at,
            image=image,
            sources=sources,
            validation=validation,
            trace=trace,
        )

        telemetry_store.log_run(
            kind="blog_generate",
            payload=request.dict(exclude_none=True),
            trace=[step.dict() for step in trace],
            validation=validation.dict() if validation else None,
            sources=[source.dict() for source in sources],
            duration_ms=(perf_counter() - started) * 1000,
            chunk_count=len(context),
        )

        return response
