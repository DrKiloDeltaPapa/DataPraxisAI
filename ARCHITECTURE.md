# DataPraxisAI Architecture (2026 refresh)

## 1. High-level view

```
┌─────────────────────────────┐           ┌──────────────────────────────┐
│ React Frontend (Vite SPA)  │  HTTPS    │ FastAPI Backend (Cloud Run) │
│ - Home / Blog / Admin      │◄──────────┤ - REST + Web UI APIs        │
│ - Source + validation UIs  │           │ - Multi-agent orchestration  │
└────────────┬────────────────┘           └──────────────┬──────────────┘
             │                                             │
             │                                     ┌───────▼────────┐
             │                                     │ Agents Layer   │
             │                                     │ orchestrator   │
             │                                     │  ├─ retrieval  │
             │                                     │  ├─ reasoning  │
             │                                     │  └─ validation │
             │                                     └───────┬────────┘
             │                                             │
      Static assets / blogs                        ┌───────▼─────────┐
 (Cloud Storage optional)                          │ RAG Services    │
                                                   │ - Embeddings    │
                                                   │ - FAISS/SQLite  │
                                                   │ - Agent mode    │
                                                   └─────────────────┘
```

## 2. Multi-agent responsibilities

| Agent | Module | Responsibility |
|-------|--------|----------------|
| Orchestrator | `server/agents/orchestrator.py` | Receives API requests, manages task order, collects trace + validation metadata. |
| Retrieval | `server/agents/retrieval_agent.py` | Delegates to `server/services/rag_client` (FAISS/local/agent) for chunk lookup with metadata. |
| Reasoning | `server/agents/reasoning_agent.py` | Builds prompts from retrieved context and calls the active LLM provider (`server/services/llm.py`). |
| Validation | `server/agents/validation_agent.py` | Performs lightweight grounding checks (context presence, citation coverage) and emits findings for UI/observability. |

Agents communicate via shared Pydantic schemas defined in `server/schemas/rag.py`, ensuring consistent payloads between API routes, services, and persistence.

## 3. Backend modules

```
server/
├── agents/           # retrieval, reasoning, validation, orchestrator
├── api/              # (future) routers layered atop orchestrator
├── schemas/          # Pydantic models for requests/responses/storage
├── services/         # embeddings, vector store adapters, LLM client
├── storage/          # JSON blog store (replace with DB later)
├── rag/              # legacy stubs retained for reference
└── main.py           # FastAPI wiring + legacy routes
```

### Service boundaries

- **Retrieval services**: `server/services/rag_client.py` abstracts FAISS, local JSON, and remote agent modes. Metadata hydration happens via `server/services/db_access.py`.
- **Generation services**: `server/services/llm.py` unifies Ollama/OpenAI/mock pathways.
- **Persistence layer**: `server/storage/blog_store.py` maintains generated posts on disk (ready to be swapped for Postgres/Cloud SQL).

### Telemetry & observability

- `server/storage/telemetry_store.py` logs every orchestrated run (payload, validation, trace, duration, chunk counts) into `server/data/telemetry.db`.
- `GET /api/telemetry` exposes recent rows so `client/src/pages/Admin.jsx` can render a live timeline with source citations and validation findings.
- Treat telemetry IDs as the canonical reference when describing experiments or regressions; the workflow is documented further in [MODEL_LIFECYCLE.md](MODEL_LIFECYCLE.md).

## 4. Data flow (blog generation)

1. API receives `BlogGenerateRequest` (`topic`, `audience`, `length`, `top_k`).
2. Orchestrator embeds the topic text using `server/services/embeddings.py`.
3. Retrieval agent fetches contextual chunks with FAISS + SQLite (or fallback) and records trace steps.
4. Reasoning agent crafts the prompt with top snippets and invokes the configured LLM provider.
5. Validation agent inspects retrieved context + generated markdown for grounding issues.
6. Orchestrator assembles a structured response (sources, validation report, agent trace) and returns it to the API.
7. API persists the blog via `server/storage/blog_store.py` (JSON today, Cloud SQL tomorrow) and returns the payload to the client.

## 5. GCP deployment targets

- **Artifact Registry** stores backend/frontend container images (see `server/Dockerfile` and `client/Dockerfile`).
- **Cloud Run (fully managed)** hosts both services with autoscaling, health checks, and IAM-based access control.
- **Secret Manager** injects sensitive env vars (`OPENAI_API_KEY`, lakehouse paths, agent URLs).
- **Cloud Logging / Monitoring** capture Uvicorn logs and service metrics; future work adds structured logging + OpenTelemetry traces.
- **Cloud Storage** (optional) can store generated blogs/assets for compliance-heavy deployments.

Refer to [`deployment/gcp/cloudrun.md`](deployment/gcp/cloudrun.md) for the operational playbook and `deployment/gcp/cloudbuild.yaml` for automated image builds.

## 6. Evaluation & lifecycle hooks

- Follow [MODEL_LIFECYCLE.md](MODEL_LIFECYCLE.md) for ingestion scripts, telemetry exports, dataset creation, and reviewer checklists.
- `server/services/training.py` can emit JSONL prompt/completion pairs for fine-tuning or regression testing.
- Telemetry-driven scoring (chunk count deltas, validation warnings, latency) should accompany any PR that changes retrieval, prompts, or model configuration.

## 7. Roadmap hooks

- Swap `server/storage/blog_store.py` for Cloud SQL + SQLAlchemy models.
- Extend `server/agents/validation_agent.py` with hallucination scoring (e.g., RAGAS, TruthfulQA prompts).
- Introduce a planning/tool-use agent for multi-step research tasks.
- Add `api/` routers with versioning (`/v1/agents/...`) to isolate future healthcare workflows.
- Layer on Terraform modules for networking, Artifact Registry, Cloud Run services, and secret policies.

This document should stay close to the code; update it any time the module layout or deployment strategy shifts.
