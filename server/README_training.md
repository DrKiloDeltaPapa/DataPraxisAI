Training & fine-tuning workflow
===============================

This project includes a small toolchain to export a training dataset from the ingested corpus and prepare it for fine-tuning.

What we provide
---------------
- `POST /api/docs/export-training` — server endpoint that writes a JSONL file to `server/data/training_export.jsonl`. Each line is a JSON object with `prompt` and `completion` fields (simple instruction: "Summarize the following document chunk").
- `server/services/training.py` — helper that builds the JSONL file from `server/data/embeddings.json`.

How to export
-------------
1. Make sure embeddings exist (run ingestion):

```bash
# after activating server venv
python server/scripts/ingest_pdfs.py --dir /path/to/docs
```

2. Call the export endpoint (or run the helper directly):

```bash
# HTTP
curl -X POST http://localhost:8000/api/docs/export-training

# or directly
python -c "from server.services.training import export_training_dataset; print(export_training_dataset())"
```

Result: `server/data/training_export.jsonl` is created.

Fine-tuning options
--------------------
- OpenAI fine-tuning (hosted): Use `openai` CLI or SDK with `training_export.jsonl`. You need `OPENAI_API_KEY`.
- Local fine-tuning (research): Convert JSONL to the dataset format expected by your trainer (Hugging Face, LoRA, etc). The export is simple and can be adapted to instruction-tuning workflows.

Notes & suggestions
--------------------
- The current export produces relatively large completions (full chunk text). You may want to craft prompts and shorter completions for more stable fine-tunes.
- For local models, consider using the Hugging Face `datasets` library to load the JSONL and then use `transformers` with LoRA or full fine-tuning depending on compute.

If you want, I can:
- Add an endpoint that attempts an OpenAI fine-tune (if key present) and returns job status.
- Add a CLI that converts the JSONL into a HF `Dataset` and a sample training loop using PEFT/transformers to fine-tune a small model locally.
