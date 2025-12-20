import os
import json
import math
from typing import List, Tuple

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
EMB_FILE = os.path.join(DATA_DIR, 'embeddings.json')

def _cosine(a: List[float], b: List[float]) -> float:
    dot = sum(x*y for x,y in zip(a,b))
    norm_a = math.sqrt(sum(x*x for x in a))
    norm_b = math.sqrt(sum(x*x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

def _load_embeddings():
    if not os.path.exists(EMB_FILE):
        return []
    with open(EMB_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def _save_embeddings(items):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(EMB_FILE, 'w', encoding='utf-8') as f:
        json.dump(items, f)

def add_embedding(doc_id: str, chunk_id: str, vector: List[float], text: str):
    items = _load_embeddings()
    items.append({'doc_id': doc_id, 'chunk_id': chunk_id, 'vector': vector, 'text': text})
    _save_embeddings(items)

def query(vector: List[float], top_k: int = 5) -> List[Tuple[float, dict]]:
    items = _load_embeddings()
    scored = []
    for it in items:
        score = _cosine(vector, it['vector'])
        scored.append((score, it))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[:top_k]
