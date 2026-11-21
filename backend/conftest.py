"""Pytest setup: isolate the board database.

Runs before the test modules import ``main`` (and therefore ``db``), so the
SQLite path is pointed at a throwaway temp file instead of the real
``backend/data/boards.db``.
"""
import atexit
import os
import tempfile

_tmp = tempfile.NamedTemporaryFile(prefix="boards_test_", suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_PATH"] = _tmp.name


@atexit.register
def _cleanup() -> None:
    try:
        os.unlink(_tmp.name)
    except OSError:
        pass
