import os
import hashlib
from typing import List, Optional

try:
    from openai import OpenAI
except Exception:
    OpenAI = None  # type: ignore

OPENAI_KEY = os.getenv("OPENAI_API_KEY")

# IMPORTANT: Your FAISS index on Seagate is d=768
DEFAULT_EMBED_DIM = 768

# Choose an embedding model whose output dim matches your index.
# If your index was built with a local sentence-transformer/BGE that outputs 768,
# you SHOULD keep using that same embedder for queries.
# OpenAI models commonly output 1536/3072. If you use OpenAI embeddings here,
# they will NOT match your 768-d FAISS index unless you rebuild the index.
OPENAI_EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")


def get_openai_embedding(text: str) -> Optional[List[float]]:
    """
    Returns an OpenAI embedding if OPENAI_API_KEY is set and the OpenAI SDK is available.
    NOTE: The returned vector dimension depends on the model and may NOT be 768.
    """
    if not OPENAI_KEY or OpenAI is None:
        return None

    client = OpenAI(api_key=OPENAI_KEY)

    # OpenAI SDK v1.x
    resp = client.embeddings.create(
        model=OPENAI_EMBED_MODEL,
        input=text,
    )
    return resp.data[0].embedding


def mock_embedding(text: str, dim: int = DEFAULT_EMBED_DIM) -> List[float]:
    """
    Deterministic pseudo-embedding for local dev/testing.
    Uses sha256 to generate a repeatable vector of the requested dim.
    """
    h = hashlib.sha256(text.encode("utf-8")).digest()
    vec = [((b % 128) / 128.0) for b in h]

    out: List[float] = []
    i = 0
    while len(out) < dim:
        out.append(vec[i % len(vec)])
        i += 1
    return out[:dim]


def embed_text(text: str, expected_dim: int = DEFAULT_EMBED_DIM) -> List[float]:
    """
    Primary embedding function.
    - Uses OpenAI if available
    - Falls back to deterministic mock embedding

    If OpenAI is used and the returned embedding dimension doesn't match expected_dim,
    we fall back to mock embedding to avoid FAISS dimension mismatch at query time.
    """
    emb = get_openai_embedding(text)
    if emb is not None:
        if len(emb) != expected_dim:
            # Prevent hard-to-debug FAISS errors later (Index dimension mismatch)
            return mock_embedding(text, dim=expected_dim)
        return emb

    return mock_embedding(text, dim=expected_dim)
