"""Simple JSON-backed persistence for generated blogs."""

from __future__ import annotations

import json
import os
from typing import List, Optional

from server.schemas.rag import BlogRecord

APP_ROOT = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(APP_ROOT, "data")
BLOGS_FILE = os.path.join(DATA_DIR, "blogs.json")


def _ensure_store() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(BLOGS_FILE):
        with open(BLOGS_FILE, "w", encoding="utf-8") as handle:
            json.dump([], handle)


def load_blogs() -> List[dict]:
    if not os.path.exists(BLOGS_FILE):
        return []
    with open(BLOGS_FILE, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_blogs(records: List[dict]) -> None:
    _ensure_store()
    with open(BLOGS_FILE, "w", encoding="utf-8") as handle:
        json.dump(records, handle, indent=2, ensure_ascii=False)


def append_blog(record: BlogRecord) -> None:
    blogs = load_blogs()
    payload = record.dict()
    created_at = payload.get("created_at")
    if hasattr(created_at, "isoformat"):
        payload["created_at"] = created_at.isoformat()
    blogs.append(payload)
    save_blogs(blogs)


def get_blog(blog_id: str) -> Optional[dict]:
    blogs = load_blogs()
    for blog in blogs:
        if blog.get("id") == blog_id:
            return blog
    return None


def delete_blog(blog_id: str) -> bool:
    blogs = load_blogs()
    new_blogs = [blog for blog in blogs if blog.get("id") != blog_id]
    if len(new_blogs) == len(blogs):
        return False
    save_blogs(new_blogs)
    return True


def update_blog(blog_id: str, fields: dict) -> Optional[dict]:
    blogs = load_blogs()
    updated = None
    for idx, blog in enumerate(blogs):
        if blog.get("id") == blog_id:
            blog.update(fields)
            blogs[idx] = blog
            updated = blog
            break
    if updated:
        save_blogs(blogs)
    return updated