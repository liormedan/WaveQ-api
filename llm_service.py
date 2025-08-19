"""Service for parsing natural language audio requests using an LLM."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict

# Operations schema replicated from API to help the LLM understand available actions
OPERATIONS_SCHEMA: Dict[str, Any] = {
    "trim": {
        "description": "Trim audio to specified start and end times",
        "parameters": {
            "start_time": {"type": "float", "description": "Start time in seconds", "default": 0},
            "end_time": {"type": "float", "description": "End time in seconds", "default": "end of file"},
        },
    },
    "normalize": {
        "description": "Normalize audio to target dB level",
        "parameters": {
            "target_db": {"type": "float", "description": "Target dB level", "default": -20},
        },
    },
    "fade_in": {
        "description": "Apply fade in effect",
        "parameters": {
            "fade_duration": {"type": "float", "description": "Fade duration in seconds", "default": 1.0},
        },
    },
    "fade_out": {
        "description": "Apply fade out effect",
        "parameters": {
            "fade_duration": {"type": "float", "description": "Fade duration in seconds", "default": 1.0},
        },
    },
    "change_speed": {
        "description": "Change audio playback speed",
        "parameters": {
            "speed_factor": {"type": "float", "description": "Speed multiplier", "default": 1.0},
        },
    },
    "change_pitch": {
        "description": "Change audio pitch",
        "parameters": {
            "pitch_steps": {"type": "float", "description": "Pitch change in semitones", "default": 0},
        },
    },
    "add_reverb": {
        "description": "Add reverb effect",
        "parameters": {
            "room_size": {"type": "float", "description": "Room size (0-1)", "default": 0.5},
            "damping": {"type": "float", "description": "Damping factor (0-1)", "default": 0.5},
        },
    },
    "noise_reduction": {
        "description": "Reduce noise in audio",
        "parameters": {
            "strength": {"type": "float", "description": "Noise reduction strength (0-1)", "default": 0.1},
        },
    },
    "equalize": {
        "description": "Apply 3-band equalization",
        "parameters": {
            "low_gain": {"type": "float", "description": "Low frequency gain", "default": 1.0},
            "mid_gain": {"type": "float", "description": "Mid frequency gain", "default": 1.0},
            "high_gain": {"type": "float", "description": "High frequency gain", "default": 1.0},
        },
    },
    "compress": {
        "description": "Apply dynamic range compression",
        "parameters": {
            "threshold": {"type": "float", "description": "Compression threshold in dB", "default": -20},
            "ratio": {"type": "float", "description": "Compression ratio", "default": 4.0},
            "attack": {"type": "float", "description": "Attack time in seconds", "default": 0.005},
            "release": {"type": "float", "description": "Release time in seconds", "default": 0.1},
        },
    },
    "merge": {
        "description": "Merge multiple audio files",
        "parameters": {
            "additional_files": {
                "type": "list",
                "description": "List of additional audio files to merge",
                "default": [],
            },
        },
    },
    "split": {
        "description": "Split audio into segments",
        "parameters": {
            "segment_duration": {
                "type": "float",
                "description": "Duration of each segment in seconds",
                "default": 30,
            },
        },
    },
    "convert_format": {
        "description": "Convert audio to different format",
        "parameters": {
            "target_format": {
                "type": "string",
                "description": "Target audio format",
                "default": "mp3",
            },
            "quality": {
                "type": "string",
                "description": "Audio quality",
                "default": "high",
                "options": ["low", "medium", "high"],
            },
        },
    },
}


def _build_prompt(text: str) -> str:
    """Create a prompt for the LLM including the operations schema."""
    return (
        "You are an assistant that converts natural language audio editing requests "
        "into JSON commands. Use the operations schema provided to determine the "
        "operation and its parameters.\n\n"
        f"Operations Schema:\n{json.dumps(OPERATIONS_SCHEMA, indent=2)}\n\n"
        f"User request: {text}\n\n"
        "Respond with a JSON object containing 'operation' and 'parameters'."
    )


def parse_request(text: str) -> Dict[str, Any]:
    """Parse a natural language request into a structured JSON command.

    Returns a dictionary with keys:
    - ``success`` (bool): whether parsing succeeded.
    - ``data`` (dict): the parsed JSON when successful.
    - ``error`` (str): error message when parsing fails.
    - ``prompt`` (str): the prompt sent to the LLM for debugging purposes.
    """
    prompt = _build_prompt(text)

    try:
        from openai import OpenAI

        client = OpenAI()
        response = client.responses.create(
            model="gpt-4o-mini",
            input=prompt,
            temperature=0,
        )

        # Extract text content from response (API shape may vary)
        content = getattr(response, "output_text", None)
        if content is None and getattr(response, "output", None):
            first = response.output[0]
            content = first.get("content", [{}])[0].get("text")  # type: ignore[index]

        data = json.loads(content or "{}")
        if not isinstance(data, dict) or "operation" not in data or "parameters" not in data:
            raise ValueError("Missing required fields 'operation' or 'parameters'.")

        return {"success": True, "data": data}

    except Exception as exc:  # Catch JSON errors, OpenAI errors, etc.
        logging.error("Failed to parse request", exc_info=True)
        return {"success": False, "error": str(exc), "prompt": prompt}
