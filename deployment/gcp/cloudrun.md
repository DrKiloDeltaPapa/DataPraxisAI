# Google Cloud Run Deployment Guide

This guide captures the minimum viable workflow to containerize DataPraxisAI, push the images to Artifact Registry, and deploy the frontend + backend to Cloud Run. Adapt paths as your project evolves.

## 1. Prerequisites

- Google Cloud project with billing enabled.
- `gcloud` CLI authenticated (`gcloud auth login`) and project set (`gcloud config set project <PROJECT_ID>`).
- Artifact Registry API + Cloud Run API enabled.
- Docker or Cloud Build available locally.

Recommended Artifact Registry repositories:

| Component | Repository | Example Image URI |
|-----------|------------|-------------------|
| Backend (FastAPI) | `us-docker.pkg.dev/<PROJECT_ID>/datapraxis/backend` | `us-docker.pkg.dev/acme-ai/datapraxis/backend:latest` |
| Frontend (Vite) | `us-docker.pkg.dev/<PROJECT_ID>/datapraxis/frontend` | `us-docker.pkg.dev/acme-ai/datapraxis/frontend:latest` |

## 2. Build + push locally

From the repo root:

```bash
# Set variables
PROJECT_ID="acme-ai"
REGION="us-central1"
REPO="datapraxis"
TAG="v0.1.0"

# Configure Docker to auth against Artifact Registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Backend
docker build -f server/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/backend:${TAG} .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/backend:${TAG}

# Frontend
docker build -f client/Dockerfile -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/frontend:${TAG} ./client
# (the client Dockerfile expects build context at client/)
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/frontend:${TAG}
```

## 3. Deploy to Cloud Run

```bash
# Backend (FastAPI)
gcloud run deploy datapraxis-backend \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/backend:${TAG} \
  --region=${REGION} \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --set-env-vars="RAG_MODE=local",\
SECRETS_VERSION=projects/${PROJECT_ID}/secrets/datapraxis-env/versions/latest \
  --set-cloudsql-instances="" \
  --ingress=all

# Frontend (static nginx)
gcloud run deploy datapraxis-frontend \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/frontend:${TAG} \
  --region=${REGION} \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --ingress=all
```

> **Secrets**: For production, strip hard-coded env vars and load them from Secret Manager. Cloud Run allows referencing secrets as env vars: `--set-secrets FAISS_INDEX_PATH=datapraxis-faiss:latest` etc.

## 4. Automating with Cloud Build

A starter `cloudbuild.yaml` (checked into `deployment/gcp/cloudbuild.yaml`) builds/pushes both images. Configure a trigger on your main branch and supply substitutions:

```bash
gcloud builds submit --config deployment/gcp/cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_REPO=datapraxis,_TAG=v0.1.0
```

Cloud Build outputs the two image URLs which you can feed into a follow-up deploy step or GitHub Actions workflow.

## 5. Environment + secrets checklist

| Variable | Suggested Source | Notes |
|----------|------------------|-------|
| `RAG_MODE` | Cloud Run env var | `local`, `seagate`, or `agent` |
| `LAKEHOUSE_ROOT`, `FAISS_*`, `METADATA_DB_PATH` | Secret Manager (file mounts) | Only required for `seagate` deployments |
| `LLM_MODE`, `LLM_URL`, `LLM_MODEL` | Env vars | For Ollama (self-hosted) or OpenAI |
| `OPENAI_API_KEY` | Secret Manager | Required when `LLM_MODE=openai` |
| `RAG_AGENT_URL` | Env var | When delegating retrieval to remote agent |

## 6. Observability hooks

- **Health checks**: `/api/health` (backend) responds with `{ "status": "ok" }`.
- **Readiness**: `/api/rag/status` exposes lakehouse/agent mode + validation.
- **Logging**: FastAPI/Uvicorn logs flow to Cloud Logging automatically. Consider adding JSON logging + structured trace IDs in a follow-up phase.
- **Metrics**: Cloud Run automatically surfaces CPU/memory/latency; integrate OpenTelemetry later for detailed spans.

## 7. Next steps

1. Wire up Cloud Build trigger to push on tagged releases.
2. Add Terraform or Deployment Manager templates for repeatable infra.
3. Introduce Secret Manager + Workload Identity Federation for Borg1 lakehouse credentials.
4. Layer in Cloud Monitoring dashboards + alerting.

This document will evolve as we add IaC automation and advanced observability, but it gives a clear "happy path" to ship the existing services to Google Cloud today.
