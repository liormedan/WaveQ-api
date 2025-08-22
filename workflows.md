# Audio Editing Workflows

This document outlines supported audio input sources and edit actions for version 1 of the WaveQ Audio API Manager.

## Audio Input Sources
- Microphone capture
- Local file upload
- Remote file URL
- Existing library asset
- Live stream session

## Supported Actions (v1)
All edit requests are published to the MQTT topic `audio/edit`. Each request must include a unique `id`; status updates are published to `audio/status/<id>`.

### Trim
- **Required parameters**: `start_ms`, `end_ms`
- **Priority level**: `1` (highest) to `5` (lowest)
- **Request topic**: `audio/edit`
- **Status topic**: `audio/status/<id>`
- **Sample request**:
```json
{
  "id": "REQ-1001",
  "action": "trim",
  "priority": 3,
  "params": {"start_ms": 0, "end_ms": 5000}
}
```
- **Sample status** (topic `audio/status/REQ-1001`):
```json
{"id": "REQ-1001", "status": "completed", "result": "trimmed_file.wav"}
```

### Normalize
- **Required parameters**: `target_db`
- **Priority level**: `1` (highest) to `5` (lowest)
- **Request topic**: `audio/edit`
- **Status topic**: `audio/status/<id>`
- **Sample request**:
```json
{
  "id": "REQ-1002",
  "action": "normalize",
  "priority": 3,
  "params": {"target_db": -1.0}
}
```
- **Sample status** (topic `audio/status/REQ-1002`):
```json
{"id": "REQ-1002", "status": "completed", "result": "normalized_file.wav"}
```

### Noise Reduction
- **Required parameters**: `profile`
- **Priority level**: `1` (highest) to `5` (lowest)
- **Request topic**: `audio/edit`
- **Status topic**: `audio/status/<id>`
- **Sample request**:
```json
{
  "id": "REQ-1003",
  "action": "noise_reduction",
  "priority": 2,
  "params": {"profile": "speech"}
}
```
- **Sample status** (topic `audio/status/REQ-1003`):
```json
{"id": "REQ-1003", "status": "completed", "result": "denoised_file.wav"}
```

### Equalize
- **Required parameters**: `bands` (e.g., `{100: -2, 1000: 1, 5000: -1}`)
- **Priority level**: `1` (highest) to `5` (lowest)
- **Request topic**: `audio/edit`
- **Status topic**: `audio/status/<id>`
- **Sample request**:
```json
{
  "id": "REQ-1004",
  "action": "equalize",
  "priority": 4,
  "params": {"bands": {"100": -2, "1000": 1, "5000": -1}}
}
```
- **Sample status** (topic `audio/status/REQ-1004`):
```json
{"id": "REQ-1004", "status": "completed", "result": "equalized_file.wav"}
```

### Merge
- **Required parameters**: `sources` (array of audio IDs)
- **Priority level**: `1` (highest) to `5` (lowest)
- **Request topic**: `audio/edit`
- **Status topic**: `audio/status/<id>`
- **Sample request**:
```json
{
  "id": "REQ-1005",
  "action": "merge",
  "priority": 5,
  "params": {"sources": ["track1.wav", "track2.wav"]}
}
```
- **Sample status** (topic `audio/status/REQ-1005`):
```json
{"id": "REQ-1005", "status": "completed", "result": "merged_file.wav"}
```

## Workflow Examples

### Workflow A: Clean Up Recording
| Step | Publish to `audio/edit` | Expected status topic | Expected status flow |
|------|------------------------|----------------------|----------------------|
| 1    | Trim payload (`REQ-A1`) | `audio/status/REQ-A1` | `queued → processing → completed` |
| 2    | Normalize payload (`REQ-A2`) | `audio/status/REQ-A2` | `queued → processing → completed` |
| 3    | Noise reduction payload (`REQ-A3`) | `audio/status/REQ-A3` | `queued → processing → completed` |

### Workflow B: Merge Two Clips
| Step | Publish to `audio/edit` | Expected status topic | Expected status flow |
|------|------------------------|----------------------|----------------------|
| 1    | Merge payload (`REQ-B1`) | `audio/status/REQ-B1` | `queued → processing → completed` |
| 2    | Equalize payload (`REQ-B2`) | `audio/status/REQ-B2` | `queued → processing → completed` |

