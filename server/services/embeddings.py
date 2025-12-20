import os
import hashlib
try:
    import openai
except Exception:
    openai = None

OPENAI_KEY = os.getenv('OPENAI_API_KEY')

def get_openai_embedding(text: str):
    if not OPENAI_KEY or not openai:
        return None
    openai.api_key = OPENAI_KEY
    # note: API usage simplified; adapt to the installed openai version
    resp = openai.Embedding.create(input=text, model='text-embedding-3-small')
    return resp['data'][0]['embedding']

def mock_embedding(text: str, dim: int = 1536):
    # deterministic pseudo-embedding for local dev
    h = hashlib.sha256(text.encode('utf-8')).digest()
    vec = [((b % 128) / 128.0) for b in h]
    # pad/repeat to dim
    out = []
    i = 0
    while len(out) < dim:
        out.append(vec[i % len(vec)])
        i += 1
    return out[:dim]

def embed_text(text: str):
    emb = get_openai_embedding(text)
    if emb is not None:
        return emb
    return mock_embedding(text)
