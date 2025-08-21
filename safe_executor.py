import subprocess
import resource
import re
import tempfile
import os
from typing import Tuple

BANNED_PATTERNS = [
    r"__import__",
    r"import\s+os",
    r"import\s+sys",
    r"subprocess",
    r"shutil",
    r"open\(",
    r"exec\(",
    r"eval\(",
]

def _set_limits(time_limit: int, memory_limit: int) -> None:
    resource.setrlimit(resource.RLIMIT_CPU, (time_limit, time_limit))
    resource.setrlimit(resource.RLIMIT_AS, (memory_limit, memory_limit))

def execute_python(code: str, timeout: int = 2, memory_limit: int = 64 * 1024 * 1024) -> Tuple[str, str]:
    """Safely execute python code with resource limits.

    Returns stdout and stderr as a tuple. Raises ValueError if disallowed
    code is detected or subprocess errors occur.
    """
    for pattern in BANNED_PATTERNS:
        if re.search(pattern, code):
            raise ValueError("Disallowed code detected")

    with tempfile.NamedTemporaryFile('w', suffix='.py', delete=False) as tmp:
        tmp.write(code)
        tmp_path = tmp.name
    try:
        result = subprocess.run(
            ["python", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
            preexec_fn=lambda: _set_limits(timeout, memory_limit),
        )
    finally:
        os.remove(tmp_path)

    return result.stdout.strip(), result.stderr.strip()
