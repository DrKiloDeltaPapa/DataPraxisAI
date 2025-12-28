"""
SQLite database access layer for RAG metadata.

Queries chunk metadata and text by IDs without loading entire DB into memory.
"""

import sqlite3
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class MetadataDB:
    """Lightweight SQLite interface for chunk metadata."""

    def __init__(self, db_path: str):
        """
        Initialize DB connection (lazy).
        
        Args:
            db_path: absolute path to metadata.db
        """
        self.db_path = db_path
        self._conn = None

    def _get_conn(self) -> sqlite3.Connection:
        """Get or create connection (lazy singleton per instance)."""
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def get_chunk(self, chunk_id: str) -> Optional[Dict]:
        """
        Retrieve a single chunk by ID.
        
        Returns:
            dict with keys: chunk_id, text, source_path, doc_id, title, author, url, etc.
            or None if not found.
        """
        try:
            conn = self._get_conn()
            cursor = conn.cursor()
            # Assume table structure: chunks(chunk_id, text, source_path, doc_id, title, author, url, ...)
            cursor.execute(
                "SELECT * FROM chunks WHERE chunk_id = ?",
                (chunk_id,)
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None
        except Exception as e:
            logger.error(f"Error fetching chunk {chunk_id}: {e}")
            return None

    def get_chunks(self, chunk_ids: List[str]) -> Dict[str, Dict]:
        """
        Retrieve multiple chunks efficiently.
        
        Args:
            chunk_ids: list of chunk IDs to fetch
        
        Returns:
            dict mapping chunk_id -> metadata dict
        """
        if not chunk_ids:
            return {}
        
        result = {}
        try:
            conn = self._get_conn()
            cursor = conn.cursor()
            placeholders = ','.join('?' * len(chunk_ids))
            cursor.execute(
                f"SELECT * FROM chunks WHERE chunk_id IN ({placeholders})",
                chunk_ids
            )
            for row in cursor.fetchall():
                row_dict = dict(row)
                result[row_dict['chunk_id']] = row_dict
        except Exception as e:
            logger.error(f"Error fetching chunks {chunk_ids}: {e}")
        
        return result

    def close(self):
        """Close connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
