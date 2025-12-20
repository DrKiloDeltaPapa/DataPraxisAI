#!/usr/bin/env python3
"""
Ingestion script for local PDFs.

Scans a local directory for PDF files, extracts text, chunks the text,
generates embeddings (via server.services.embeddings.embed_text) and
stores them in the file-backed vector store (server/services/vector_store.add_embedding).

This script is intended for local, self-contained use.
"""
import os
import argparse
from pathlib import Path
from typing import List

# Ensure project root is on sys.path so `server` package imports work when running the script
import sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Support both the older PyPDF2 package and the newer pypdf package.
import importlib
PdfReader = None
for _pkg in ("PyPDF2", "pypdf"):
    try:
        _mod = importlib.import_module(_pkg)
        PdfReader = getattr(_mod, "PdfReader", None)
        if PdfReader is not None:
            break
    except Exception:
        continue

from server.services.embeddings import embed_text
from server.services.vector_store import add_embedding
from server.services.ingest import ingest_dir as ingest_helper


def extract_text_from_pdf(path: Path) -> str:
    if PdfReader is None:
        raise RuntimeError("No PDF reader available: install PyPDF2 or pypdf in your Python environment")
    reader = PdfReader(str(path))
    pages = []
    for p in reader.pages:
        try:
            pages.append(p.extract_text() or "")
        except Exception:
            # fallback: ignore page extraction errors
            pages.append("")
    return "\n\n".join(pages)


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    # Simple character-based sliding window chunking.
    if not text:
        return []
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == length:
            break
        start = max(0, end - overlap)
    return chunks


def ingest_dir(dir_path: Path, dry_run: bool = False):
    # Delegate to server.services.ingest.ingest_dir which supports multiple formats.
    try:
        total = ingest_helper(dir_path, recursive=True, dry_run=dry_run)
        print(f"Ingestion complete. Processed {total} chunks from {dir_path}.")
    except FileNotFoundError:
        print(f"Directory not found: {dir_path}")
    except Exception as e:
        print(f"Ingestion failed: {e}")


def main():
    p = argparse.ArgumentParser(description='Ingest local PDFs into the file-backed vector store')
    p.add_argument('--dir', '-d', default=os.getenv('RAG_DOC_ROOT', './server/data/docs'), help='Directory to scan for PDFs')
    p.add_argument('--dry-run', action='store_true', help='Do not write embeddings; only show actions')
    args = p.parse_args()
    ingest_dir(Path(args.dir), dry_run=args.dry_run)


if __name__ == '__main__':
    main()
