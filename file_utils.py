from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Optional


def cleanup_file(path: str | Path) -> None:
    """Delete a file if it exists."""
    if not path:
        return
    try:
        Path(path).unlink(missing_ok=True)
    except Exception:
        pass


def cleanup_old_files(directory: str | Path, max_age_seconds: int) -> None:
    """Remove files older than max_age_seconds from a directory."""
    dir_path = Path(directory)
    if not dir_path.exists():
        return
    cutoff = time.time() - max_age_seconds
    for file in dir_path.glob("*"):
        try:
            if file.is_file() and file.stat().st_mtime < cutoff:
                file.unlink()
        except Exception:
            continue
