import json
from typing import Any, Dict


def parse_request(request_str: str) -> Dict[str, Any]:
    """Parse an LLM request represented as JSON.

    The request must contain an ``operation`` field and may include a
    ``parameters`` object.  ``parameters`` must be a dictionary if provided.

    Args:
        request_str: JSON string describing the audio editing request.

    Returns:
        Parsed request as a dictionary with ``operation`` and ``parameters``.

    Raises:
        ValueError: If the JSON is invalid, ``operation`` is missing or
            ``parameters`` is not a dictionary.
    """
    try:
        data = json.loads(request_str)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON") from exc

    if "operation" not in data:
        raise ValueError("Missing 'operation'")

    params = data.get("parameters", {})
    if not isinstance(params, dict):
        raise ValueError("'parameters' must be an object")

    return {"operation": data["operation"], "parameters": params}
