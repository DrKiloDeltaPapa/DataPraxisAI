# Model Lifecycle & Evaluation Playbook

This document explains how to take a generated blog workflow from ad-hoc experiments to a governed release using the assets already in this repository. It ties together ingestion scripts, the multi-agent backend, telemetry logging, and future fine-tuning or evaluation plans so contributors know how to extend the system responsibly.

## 1. Lifecycle Stages

| Stage | Source Files | Purpose |
|-------|--------------|---------|
| Ingest & chunk | `server/scripts/ingest_pdfs.py`, `server/services/ingest.py` | Normalize PDFs or docs, chunk into embeddings-ready text, push to vector store. |
| Index & metadata | `server/services/vector_store.py`, `server/services/db_access.py` | Build FAISS / JSON indexes plus SQLite metadata so retrieval stays fast and explainable. |
| Retrieval QA | `server/agents/retrieval_agent.py`, `server/services/rag_client.py` | Validate search coverage, highlight missing topics before prompting LLMs. |
| Generation + validation | `server/agents/{reasoning,validation}_agent.py` | Produce blogs, attach validation findings (grounding, missing citations). |
| Telemetry & review | `server/storage/telemetry_store.py`, `client/src/pages/Admin.jsx` | Persist every orchestrated run, visualize traces in the Admin console, export for audits. |
| Evaluation & training | `server/services/training.py`, `MODEL_LIFECYCLE.md` | Build labeled datasets, run offline metrics, fine-tune models or update prompts. |

## 2. Data Ingestion & Index Refresh

1. Place PDFs or Markdown sources into `server/data/docs/` (or mount the lakehouse path on Borg1).
2. Run `python server/scripts/ingest_pdfs.py --source ./server/data/docs --dest ./server/data/embeddings.json` on laptops, or point the script at `/mnt/seagate_ai_corpus` on Borg1.
3. For large corpora, rebuild FAISS + SQLite metadata using the utilities in `server/services/vector_store.py` and `server/services/db_access.py`. Commit only configuration changes—never the raw indexes.
4. Record each ingestion run (date, doc set, checksum) in your PR description so reviewers can reproduce the embeddings state.

## 3. Telemetry-Driven Evaluation

The orchestrator automatically writes every `/api/rag/search` and `/api/blog/generate` invocation to `server/data/telemetry.db` via `server/storage/telemetry_store.py`.

- Fields include payloads, trace steps, validation findings, duration, and chunk counts.
- The Admin UI surfaces the latest events so PMs can “replay” an experiment without touching logs.
- Export telemetry for offline analysis:
  ```bash
  sqlite3 server/data/telemetry.db "SELECT * FROM runs ORDER BY created_at DESC" > telemetry_dump.csv
  ```
- Use this dump to spot regressions (e.g., fewer chunks retrieved for the same topic) or to annotate false positives/negatives.

## 4. Building Evaluation Sets

1. **Seed candidates:** Pull `(topic, sources, content_markdown)` rows from telemetry where validation passed.
2. **Annotate outcomes:** Mark whether the generated article was acceptable, needs edits, or failed (hallucination, missing citations, latency spikes).
3. **Create scoring sheets:** At minimum, track factuality, coverage, tone, and agent warnings. Store as CSV/JSONL in `server/data/evals/` (gitignored if sensitive).
4. **Replay queries:** Use `client/src/pages/Admin.jsx` or `curl` to re-run the same topics after making retrieval or prompt tweaks, then compare telemetry deltas.

## 5. Training & Fine-Tuning Hooks

`server/services/training.py` contains the `export_training_dataset()` helper:

```python
from server.services.training import export_training_dataset
export_training_dataset("server/data/training_export.jsonl", max_items=5000)
```

- Generates instruction-style prompt/completion pairs from `embeddings.json` chunks.
- Feed the JSONL into your fine-tuning service (OpenAI, Ollama adapters, etc.) or use it for prompt distillation experiments.
- Document model names, hyperparameters, and evaluation metrics inside your PR using this lifecycle guide for consistency.

## 6. Continuous Improvement Loop

1. **Detect drift** via telemetry (e.g., chunk counts drop, validation raises more findings).
2. **Form hypotheses** (bad ingestion, new domains missing, LLM prompt regression).
3. **Run controlled tests**: spin up a branch, point the frontend at it via `VITE_API_BASE`, and log new telemetry IDs.
4. **Compare metrics**: number of validation warnings, generation latency, reviewer ratings from Section 4.
5. **Decide & ship**: merge ingestion/prompt/model updates only when metrics meet agreed thresholds; tag the repo with the evaluation date.

## 7. Checklists for Contributors

- [ ] Reference this document in your PR if you touch ingestion, retrieval, prompts, or models.
- [ ] Attach telemetry excerpts (IDs or CSV) demonstrating before/after behavior.
- [ ] If adding datasets, script exports, or notebooks, place them under `server/data/` or `notebooks/` (gitignored) and describe reproduction steps.
- [ ] Update `README.md` and `ARCHITECTURE.md` whenever the lifecycle meaningfully changes (new agents, new evaluation metrics, automation scripts).

Treat this file as the living spec for evaluation processes. When new agents, guardrails, or deployment targets land, extend the relevant sections so anyone browsing the repository understands how quality is maintained end-to-end.
