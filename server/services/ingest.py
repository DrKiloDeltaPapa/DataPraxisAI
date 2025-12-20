import os
from pathlib import Path
from typing import List, Iterator

from server.services.embeddings import embed_text
from server.services.vector_store import add_embedding

try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None

try:
    import docx
except Exception:
    docx = None

from bs4 import BeautifulSoup
try:
    import tiktoken
except Exception:
    tiktoken = None


SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.html', '.htm', '.docx']


def extract_text_from_pdf(path: Path) -> str:
    if PdfReader is None:
        raise RuntimeError('PyPDF2 not installed')
    reader = PdfReader(str(path))
    pages = []
    for p in reader.pages:
        try:
            pages.append(p.extract_text() or '')
        except Exception:
            pages.append('')
    return '\n\n'.join(pages)


def extract_text_from_docx(path: Path) -> str:
    if docx is None:
        raise RuntimeError('python-docx not installed')
    doc = docx.Document(str(path))
    paragraphs = [p.text for p in doc.paragraphs if p.text]
    return '\n\n'.join(paragraphs)


def extract_text_from_html(path: Path) -> str:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')
    # remove scripts/styles
    for s in soup(['script', 'style']):
        s.decompose()
    return soup.get_text(separator='\n\n')


def extract_text_from_text(path: Path) -> str:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def extract_text(path: Path) -> str:
    path = Path(path)
    ext = path.suffix.lower()
    if ext == '.pdf':
        return extract_text_from_pdf(path)
    if ext == '.docx':
        return extract_text_from_docx(path)
    if ext in ('.html', '.htm'):
        return extract_text_from_html(path)
    # txt, md, and unknown -> plain text read
    return extract_text_from_text(path)


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 300, model: str = 'gpt-4o-mini') -> List[str]:
    """
    Token-aware chunking using tiktoken when available. Returns chunks where each chunk is
    approximately `chunk_size` tokens (default 1200 tokens). If tiktoken is not available,
    falls back to paragraph-aware character chunking.
    """
    if not text:
        return []

    if tiktoken is not None:
        try:
            enc = tiktoken.encoding_for_model(model)
        except Exception:
            enc = tiktoken.get_encoding('cl100k_base')
        toks = enc.encode(text)
        total = len(toks)
        chunks: List[str] = []
        start = 0
        while start < total:
            end = min(start + chunk_size, total)
            chunk_tokens = toks[start:end]
            chunk_text = enc.decode(chunk_tokens)
            chunks.append(chunk_text)
            if end == total:
                break
            start = max(0, end - overlap)
        return chunks

    # Fallback: paragraph-aware chunking (character-based)
    paras = [p.strip() for p in text.split('\n\n') if p.strip()]
    chunks: List[str] = []
    cur = ''
    for p in paras:
        if len(cur) + len(p) + 2 <= chunk_size:
            cur = (cur + '\n\n' + p).strip() if cur else p
        else:
            if cur:
                chunks.append(cur)
            if len(p) > chunk_size:
                start = 0
                L = len(p)
                while start < L:
                    end = min(start + chunk_size, L)
                    chunks.append(p[start:end].strip())
                    if end == L:
                        break
                    start = max(0, end - overlap)
                cur = ''
            else:
                cur = p
    if cur:
        chunks.append(cur)
    return chunks


def ingest_file(path: Path, chunk_size: int = 1200, overlap: int = 300, dry_run: bool = False) -> int:
    path = Path(path)
    if not path.exists():
        return 0
    text = extract_text(path)
    chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
    doc_id = path.stem
    count = 0
    for i, chunk in enumerate(chunks):
        chunk_id = f"{doc_id}-{i}"
        vec = embed_text(chunk)
        if dry_run:
            print(f"DRY: add_embedding {doc_id} {chunk_id} vec_len={len(vec)} text_len={len(chunk)}")
        else:
            add_embedding(doc_id, chunk_id, vec, chunk)
        count += 1
    return count


def ingest_dir(dir_path: Path, recursive: bool = True, chunk_size: int = 1200, overlap: int = 300, dry_run: bool = False) -> int:
    dir_path = Path(dir_path)
    if not dir_path.exists():
        raise FileNotFoundError(str(dir_path))
    exts = set(SUPPORTED_EXTENSIONS)
    total = 0
    if recursive:
        files = [p for p in dir_path.rglob('*') if p.suffix.lower() in exts]
    else:
        files = [p for p in dir_path.iterdir() if p.is_file() and p.suffix.lower() in exts]
    for f in files:
        print(f"Ingesting file: {f}")
        try:
            c = ingest_file(f, chunk_size=chunk_size, overlap=overlap, dry_run=dry_run)
            total += c
        except Exception as e:
            print(f"Failed to ingest {f}: {e}")
    return total
