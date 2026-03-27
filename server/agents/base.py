"""Common interfaces for orchestration agents."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, List, Sequence

from server.schemas.rag import (
    AgentTraceStep,
    BlogGenerateRequest,
    RAGSearchRequest,
    RAGSearchResult,
    ValidationReport,
)


class Agent(ABC):
    """Simple base class that provides a name for trace reporting."""

    name: str = "agent"

    def trace(self, status: str, detail: str | None = None) -> AgentTraceStep:
        return AgentTraceStep(agent=self.name, status=status, detail=detail)


class RetrievalAgent(Agent, ABC):
    name = "retrieval"

    @abstractmethod
    def run(self, request: RAGSearchRequest, *, embeddings: Sequence[float]) -> List[RAGSearchResult]:
        """Return ranked contextual chunks for the request."""


class ReasoningAgent(Agent, ABC):
    name = "reasoning"

    @abstractmethod
    def run(self, request: BlogGenerateRequest, *, context: List[RAGSearchResult]) -> str:
        """Produce grounded markdown output using retrieved context."""


class ValidationAgent(Agent, ABC):
    name = "validation"

    @abstractmethod
    def run(self, *, context: List[RAGSearchResult], output: Any) -> ValidationReport:
        """Score retrieval/generation quality and surface issues."""
