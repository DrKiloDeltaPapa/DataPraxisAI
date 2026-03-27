"""Pydantic schemas shared across RAG-related routes and agents."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, validator


class AgentTraceStep(BaseModel):
    """Lightweight trace entry for orchestrated agent calls."""

    agent: Literal["orchestrator", "retrieval", "reasoning", "validation"]
    status: Literal["pending", "running", "ok", "warning", "error"] = "pending"
    detail: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)


class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Natural language query to search against the knowledge base.")
    top_k: Optional[int] = Field(
        default=None,
        ge=1,
        le=30,
        description="Optional override for number of results to return.",
    )


class SearchSourceMetadata(BaseModel):
    doc_id: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    url: Optional[str] = None
    source_path: Optional[str] = None


class RAGSearchResult(BaseModel):
    id: str
    text: Optional[str] = None
    score: float = Field(..., ge=0.0)
    source: SearchSourceMetadata = Field(default_factory=SearchSourceMetadata)


class ValidationFinding(BaseModel):
    code: str
    level: Literal["info", "warning", "error"]
    message: str


class ValidationReport(BaseModel):
    passed: bool = True
    findings: List[ValidationFinding] = Field(default_factory=list)


class RAGSearchResponse(BaseModel):
    status: Literal["ok", "error"]
    mode: str
    results: List[RAGSearchResult]
    validation: Optional[ValidationReport] = None
    trace: List[AgentTraceStep] = Field(default_factory=list)


class BlogGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3)
    audience: Literal["general", "technical", "business"] = "general"
    length: Literal["short", "medium", "long"] = "medium"
    top_k: Optional[int] = Field(default=None, ge=1, le=30)


class BlogSource(BaseModel):
    id: str
    score: float
    title: Optional[str] = None
    author: Optional[str] = None
    url: Optional[str] = None
    path: Optional[str] = None


class BlogGenerateResponse(BaseModel):
    id: str
    title: str
    subtitle: str
    content_markdown: str
    created_at: datetime
    image: str
    sources: List[BlogSource]
    validation: Optional[ValidationReport] = None
    trace: List[AgentTraceStep] = Field(default_factory=list)


class BlogUpdateRequest(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content_markdown: Optional[str] = None
    image: Optional[str] = None
    audience: Optional[str] = None
    length: Optional[str] = None


class BlogRecord(BaseModel):
    id: str
    title: str
    subtitle: str
    content_markdown: str
    created_at: datetime
    image: str
    audience: Optional[str] = None
    length: Optional[str] = None
    sources: List[BlogSource] = Field(default_factory=list)
    validation: Optional[ValidationReport] = None
    trace: List[AgentTraceStep] = Field(default_factory=list)

    @validator("created_at", pre=True)
    def _parse_created_at(cls, v):  # type: ignore[override]
        if isinstance(v, datetime):
            return v
        return datetime.fromisoformat(v)


class TelemetryEvent(BaseModel):
    id: int
    created_at: datetime
    kind: Literal["rag_search", "blog_generate"]
    payload: Dict[str, Any] = Field(default_factory=dict)
    trace: List[AgentTraceStep] = Field(default_factory=list)
    validation: Optional[ValidationReport] = None
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    duration_ms: Optional[float] = None
    chunk_count: Optional[int] = None

    @validator("created_at", pre=True)
    def _parse_created_at(cls, value):  # type: ignore[override]
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(value)
