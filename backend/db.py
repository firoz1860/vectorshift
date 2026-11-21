"""SQLite persistence for whiteboard boards.

Single-tenant, no auth (mirrors the original Supabase schema). Uses the Python
standard library only, so no extra dependencies are needed. The database file
defaults to ``backend/data/boards.db`` and can be overridden with the
``DATABASE_PATH`` environment variable (point it at a mounted volume for durable
storage in production).
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_DEFAULT_PATH = Path(__file__).resolve().parent / "data" / "boards.db"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(_DEFAULT_PATH)))

# SQLite handles its own file locking, but a process-level lock keeps the
# per-request connections from interleaving writes under the async server.
_lock = threading.Lock()

_SUMMARY_FIELDS = ("id", "title", "thumbnail", "category", "created_at", "updated_at")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS boards (
                    id          TEXT PRIMARY KEY,
                    title       TEXT NOT NULL,
                    thumbnail   TEXT,
                    canvas_data TEXT NOT NULL DEFAULT '{}',
                    category    TEXT DEFAULT 'Custom',
                    created_at  TEXT NOT NULL,
                    updated_at  TEXT NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            conn.close()


def _summary(row: sqlite3.Row) -> Dict[str, Any]:
    return {k: row[k] for k in _SUMMARY_FIELDS}


def list_boards() -> List[Dict[str, Any]]:
    with _lock:
        conn = _connect()
        try:
            rows = conn.execute(
                "SELECT * FROM boards ORDER BY updated_at DESC"
            ).fetchall()
            return [_summary(r) for r in rows]
        finally:
            conn.close()


def get_board(board_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        conn = _connect()
        try:
            row = conn.execute(
                "SELECT * FROM boards WHERE id = ?", (board_id,)
            ).fetchone()
            if row is None:
                return None
            return {
                "id": row["id"],
                "title": row["title"],
                "category": row["category"],
                "thumbnail": row["thumbnail"],
                "canvas_data": json.loads(row["canvas_data"] or "{}"),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
        finally:
            conn.close()


def create_board(
    title: str,
    category: str,
    thumbnail: Optional[str],
    canvas_data: Dict[str, Any],
) -> Dict[str, Any]:
    board_id = str(uuid.uuid4())
    now = _now()
    with _lock:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO boards
                    (id, title, thumbnail, canvas_data, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (board_id, title, thumbnail, json.dumps(canvas_data), category, now, now),
            )
            conn.commit()
        finally:
            conn.close()
    return {
        "id": board_id,
        "title": title,
        "thumbnail": thumbnail,
        "category": category,
        "created_at": now,
        "updated_at": now,
    }


def update_board(
    board_id: str,
    title: str,
    category: str,
    thumbnail: Optional[str],
    canvas_data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    now = _now()
    with _lock:
        conn = _connect()
        try:
            existing = conn.execute(
                "SELECT created_at FROM boards WHERE id = ?", (board_id,)
            ).fetchone()
            if existing is None:
                return None
            conn.execute(
                """
                UPDATE boards
                   SET title = ?, thumbnail = ?, canvas_data = ?, category = ?, updated_at = ?
                 WHERE id = ?
                """,
                (title, thumbnail, json.dumps(canvas_data), category, now, board_id),
            )
            conn.commit()
            created_at = existing["created_at"]
        finally:
            conn.close()
    return {
        "id": board_id,
        "title": title,
        "thumbnail": thumbnail,
        "category": category,
        "created_at": created_at,
        "updated_at": now,
    }


def delete_board(board_id: str) -> bool:
    with _lock:
        conn = _connect()
        try:
            cur = conn.execute("DELETE FROM boards WHERE id = ?", (board_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()
