"""Validation agent to flag weakly grounded answers."""

from __future__ import annotations

from typing import List

from server.agents.base import ValidationAgent
from server.schemas.rag import (
    RAGSearchResult,
    ValidationFinding,
    ValidationReport,
)


class DefaultValidationAgent(ValidationAgent):
    def run(self, *, context: List[RAGSearchResult], output: str | None = None) -> ValidationReport:
        findings: List[ValidationFinding] = []

        if not context:
            findings.append(
                ValidationFinding(
                    code="no_context",
                    level="warning",
                    message="No context retrieved; response may be unsupported.",
                )
            )

        missing_citations = [chunk for chunk in context if not chunk.source or not chunk.source.url]
        if missing_citations and context:
            findings.append(
                ValidationFinding(
                    code="missing_citations",
                    level="warning",
                    message="Some retrieved chunks are missing citation metadata.",
                )
            )

        return ValidationReport(passed=len(findings) == 0, findings=findings)
