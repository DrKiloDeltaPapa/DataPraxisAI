"""
SQLite database access layer for RAG metadata.

This project uses the Seagate lakehouse SQLite schema:

tables:
- chunks(id TEXT PK, document_id TEXT, chunk_index INTEGER, start_char INTEGER, end_char INTEGER, text TEXT)
- documents(id TEXT PK, source TEXT, path TEXT, title TEXT, created_at TEXT, extra_json TEXT)

Important:
- The chunk primary key is `chunks.id` (NOT `chunk_id`).
"""

import sqlite3
from typing import List, Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)


class MetadataDB:
    """Lightweight SQLite interface for chunk + document metadata."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None

    def _get_conn(self) -> sqlite3.Connection:
        """Get or create connection (lazy singleton per instance)."""
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def get_chunk(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single chunk by ID (maps to chunks.id).

        Returns:
            dict with at least: id, document_id, chunk_index, start_char, end_char, text
            plus (if available): source, path, title, created_at, extra_json
            or None if not found.
        """
        try:
            conn = self._get_conn()
            cur = conn.cursor()

            # Join documents to expose source/path/title when available
            cur.execute(
                """
                SELECT
                    c.id,
                    c.document_id,
                    c.chunk_index,
                    c.start_char,
                    c.end_char,
                    c.text,
                    d.source,
                    d.path,
                    d.title,
                    d.created_at,
                    d.extra_json
                FROM chunks c
                LEFT JOIN documents d ON d.id = c.document_id
                WHERE c.id = ?
                """,
                (chunk_id,),
            )

            row = cur.fetchone()
            return dict(row) if row else None

        except Exception as e:
            logger.error(f"Error fetching chunk {chunk_id}: {e}")
            return None

    def get_chunks(self, chunk_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Retrieve multiple chunks efficiently by IDs (maps to chunks.id).

        Args:
            chunk_ids: list of chunk IDs (these correspond to chunks.id)

        Returns:
            dict mapping chunk_id -> row dict
        """
        if not chunk_ids:
            return {}

        # de-dupe while preserving order
        seen = set()
        chunk_ids_unique = []
        for cid in chunk_ids:
            if cid and cid not in seen:
                seen.add(cid)
                chunk_ids_unique.append(cid)

        if not chunk_ids_unique:
            return {}

        result: Dict[str, Dict[str, Any]] = {}
        try:
            conn = self._get_conn()
            cur = conn.cursor()

            placeholders = ",".join(["?"] * len(chunk_ids_unique))

            cur.execute(
                f"""
                SELECT
                    c.id,
                    c.document_id,
                    c.chunk_index,
                    c.start_char,
                    c.end_char,
                    c.text,
                    d.source,
                    d.path,
                    d.title,
                    d.created_at,
                    d.extra_json
                FROM chunks c
                LEFT JOIN documents d ON d.id = c.document_id
                WHERE c.id IN ({placeholders})
                """,
                chunk_ids_unique,
            )

            for row in cur.fetchall():
                row_dict = dict(row)
                # Key by the real PK: id
                result[row_dict["id"]] = row_dict

        except Exception as e:
            logger.error(f"Error fetching chunks {chunk_ids_unique}: {e}")

        return result

    def close(self) -> None:
        """Close connection."""
        if self._conn:
            try:
                self._conn.close()
            finally:
                self._conn = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
