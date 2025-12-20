import os
import json
from typing import List

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
EMB_FILE = os.path.join(DATA_DIR, 'embeddings.json')


def export_training_dataset(out_path: str = None, max_items: int = 10000) -> str:
    """Export a simple JSONL training dataset from stored chunks.

    For each chunk, create an instruction-style pair where the prompt asks to summarize the chunk
    and the completion is the chunk text. Writes to server/data/training_export.jsonl by default.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    if out_path is None:
        out_path = os.path.join(DATA_DIR, 'training_export.jsonl')
    items = []
    if not os.path.exists(EMB_FILE):
        # write empty file
        open(out_path, 'w', encoding='utf-8').close()
        return out_path
    with open(EMB_FILE, 'r', encoding='utf-8') as f:
        items = json.load(f)

    count = 0
    with open(out_path, 'w', encoding='utf-8') as out:
        for it in items:
            if count >= max_items:
                break
            text = it.get('text', '').strip()
            if not text:
                continue
            prompt = f"Summarize the following document chunk:\n\n{text[:500]}"
            completion = text.replace('\n', ' ')
            entry = {'prompt': prompt, 'completion': completion}
            out.write(json.dumps(entry, ensure_ascii=False) + "\n")
            count += 1
    return out_path
