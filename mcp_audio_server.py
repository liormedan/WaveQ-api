"""
🎵 WaveQ MCP Audio Server

MCP (Model Context Protocol) server for audio processing
with natural language understanding.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

from pydub import AudioSegment, effects
import soundfile as sf
import librosa

# Import our Audio Agent
from audio_agent_library import AudioAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPAudioServer:
    """MCP Server for Audio Processing"""
    
    def __init__(self):
        self.audio_agent = AudioAgent()
        self.active_requests = {}
        self.conversation_history = []
        
    async def process_audio_request(self, message: str, audio_file: str = None) -> Dict[str, Any]:
        """Process natural language audio request"""
        try:
            # Parse with Audio Agent
            parsed = self.audio_agent.parse_natural_language(message)
            
            # Generate operation chain
            operations = self.audio_agent.generate_operation_chain(parsed["operations"])
            
            # Create request
            request_id = f"mcp_audio_{uuid.uuid4().hex[:8]}"
            request = {
                "request_id": request_id,
                "message": message,
                "audio_file": audio_file,
                "operations": operations,
                "confidence": parsed["confidence"],
                "timestamp": datetime.now().isoformat()
            }
            
            # Store request
            self.active_requests[request_id] = request
            
            # Add to conversation
            self.conversation_history.append({
                "role": "user",
                "content": message,
                "timestamp": datetime.now().isoformat()
            })
            
            return request
            
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            return {"error": str(e)}
    
    def get_supported_operations(self) -> Dict[str, Any]:
        """Get supported audio operations"""
        return {
            "operations": self.audio_agent.supported_operations,
            "total": len(self.audio_agent.supported_operations)
        }
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get conversation summary"""
        return {
            "total_messages": len(self.conversation_history),
            "active_requests": len(self.active_requests),
            "timestamp": datetime.now().isoformat()
        }


class AudioProcessingMCP:
    """Standalone audio processor with MQTT integration"""

    def __init__(self) -> None:
        self.request_queue: asyncio.Queue = asyncio.Queue()
        self.processed_dir = Path("processed")
        self.processed_dir.mkdir(exist_ok=True)

    # ------------------------------------------------------------------
    # Audio operations
    # ------------------------------------------------------------------
    async def trim_audio(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        start = int(params.get("start_time", 0) * 1000)
        end_param = params.get("end_time")
        audio = AudioSegment.from_file(file_path)
        end = int(end_param * 1000) if end_param is not None else len(audio)
        trimmed = audio[start:end]
        out_path = self.processed_dir / f"trim_{Path(file_path).stem}.wav"
        trimmed.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def normalize_audio(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        target_db = params.get("target_db", -3)
        audio = AudioSegment.from_file(file_path)
        change = target_db - audio.max_dBFS
        normalized = audio.apply_gain(change)
        out_path = self.processed_dir / f"norm_{Path(file_path).stem}.wav"
        normalized.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def fade_in_audio(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        duration = int(params.get("fade_duration", 100))
        audio = AudioSegment.from_file(file_path)
        processed = audio.fade_in(duration)
        out_path = self.processed_dir / f"fadein_{Path(file_path).stem}.wav"
        processed.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def fade_out_audio(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        duration = int(params.get("fade_duration", 100))
        audio = AudioSegment.from_file(file_path)
        processed = audio.fade_out(duration)
        out_path = self.processed_dir / f"fadeout_{Path(file_path).stem}.wav"
        processed.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def change_speed(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        factor = params.get("speed_factor", 1.0)
        audio = AudioSegment.from_file(file_path)
        processed = audio.speedup(playback_speed=factor, crossfade=0)
        out_path = self.processed_dir / f"speed_{Path(file_path).stem}.wav"
        processed.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def change_pitch(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        steps = params.get("pitch_steps", 0)
        y, sr = librosa.load(file_path, sr=None)
        shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=steps)
        out_path = self.processed_dir / f"pitch_{Path(file_path).stem}.wav"
        sf.write(out_path, shifted, sr)
        return {"output_path": str(out_path)}

    async def add_reverb(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        room = params.get("room_size", 0.5)
        damping = params.get("damping", 0.5)
        audio = AudioSegment.from_file(file_path)
        delay = int(room * 1000)
        echo = audio - (damping * 10)
        processed = audio.overlay(echo, position=delay)
        out_path = self.processed_dir / f"reverb_{Path(file_path).stem}.wav"
        processed.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def noise_reduction(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        strength = params.get("strength", 0.5)
        y, sr = librosa.load(file_path, sr=None)
        coef = max(0.0, min(0.99, 1 - strength))
        reduced = librosa.effects.preemphasis(y, coef=coef)
        out_path = self.processed_dir / f"nr_{Path(file_path).stem}.wav"
        sf.write(out_path, reduced, sr)
        return {"output_path": str(out_path)}

    async def equalize_audio(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        low_gain = params.get("low_gain", 0)
        mid_gain = params.get("mid_gain", 0)
        high_gain = params.get("high_gain", 0)
        audio = AudioSegment.from_file(file_path)
        low = audio.low_pass_filter(200).apply_gain(low_gain)
        mid = audio.high_pass_filter(200).low_pass_filter(2000).apply_gain(mid_gain)
        high = audio.high_pass_filter(2000).apply_gain(high_gain)
        processed = low.overlay(mid).overlay(high)
        out_path = self.processed_dir / f"eq_{Path(file_path).stem}.wav"
        processed.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def compress_audio(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        threshold = params.get("threshold", -20)
        audio = AudioSegment.from_file(file_path)
        processed = effects.compress_dynamic_range(audio, threshold=threshold)
        out_path = self.processed_dir / f"compress_{Path(file_path).stem}.wav"
        processed.export(out_path, format="wav")
        return {"output_path": str(out_path)}

    async def merge_audio_files(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        files = [file_path] + params.get("additional_files", [])
        segments = [AudioSegment.from_file(p) for p in files]
        merged = segments[0]
        for seg in segments[1:]:
            merged += seg
        out_path = self.processed_dir / f"merge_{Path(file_path).stem}.wav"
        merged.export(out_path, format="wav")
        return {"output_path": str(out_path), "merged_files": files}

    async def split_audio(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        duration_ms = int(params.get("segment_duration", 1) * 1000)
        audio = AudioSegment.from_file(file_path)
        paths: List[str] = []
        for idx, start in enumerate(range(0, len(audio), duration_ms)):
            segment = audio[start:start + duration_ms]
            out_path = self.processed_dir / f"split_{Path(file_path).stem}_{idx}.wav"
            segment.export(out_path, format="wav")
            paths.append(str(out_path))
        return {"segment_paths": paths, "total_segments": len(paths)}

    async def convert_format(self, file_path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        target = params.get("target_format", "wav")
        audio = AudioSegment.from_file(file_path)
        out_path = self.processed_dir / f"convert_{Path(file_path).stem}.{target}"
        audio.export(out_path, format=target)
        return {"output_path": str(out_path)}

    async def process_operations(self, file_path: str, operations: List[Dict[str, Any]]) -> str:
        path = file_path
        op_map = {
            "trim": self.trim_audio,
            "normalize": self.normalize_audio,
            "fade_in": self.fade_in_audio,
            "fade_out": self.fade_out_audio,
            "speed": self.change_speed,
            "pitch": self.change_pitch,
            "reverb": self.add_reverb,
            "noise_reduction": self.noise_reduction,
            "equalize": self.equalize_audio,
            "compress": self.compress_audio,
        }
        for op in operations:
            name = op.get("name")
            params = {k: v for k, v in op.items() if k != "name"}
            method = op_map.get(name)
            if not method:
                continue
            result = await method(path, params)
            path = result["output_path"]
        return path

    # ------------------------------------------------------------------
    # MQTT handling
    # ------------------------------------------------------------------
    async def handle_mqtt_messages(self, client: Any) -> None:
        await client.subscribe("audio/edit")
        async with client.messages() as messages:
            async for message in messages:
                try:
                    payload = json.loads(message.payload.decode())
                    await self.request_queue.put(payload)
                except Exception as exc:
                    logger.error(f"Failed to parse message: {exc}")

    async def process_audio_requests(self, client: Any) -> None:
        op_map = {
            "trim": self.trim_audio,
            "normalize": self.normalize_audio,
            "fade_in": self.fade_in_audio,
            "fade_out": self.fade_out_audio,
            "speed": self.change_speed,
            "pitch": self.change_pitch,
            "reverb": self.add_reverb,
            "noise_reduction": self.noise_reduction,
            "equalize": self.equalize_audio,
            "compress": self.compress_audio,
            "merge": self.merge_audio_files,
            "split": self.split_audio,
            "convert": self.convert_format,
        }

        while True:
            request = await self.request_queue.get()
            req_id = request.get("request_id")
            operation = request.get("operation")
            audio_path = request.get("audio_data")
            params = request.get("parameters", {})

            await client.publish(
                f"audio/status/{req_id}",
                json.dumps({"status": "processing"}),
            )

            method = op_map.get(operation)
            if not method:
                await client.publish(
                    f"audio/status/{req_id}",
                    json.dumps({"status": "error", "message": "unknown operation"}),
                )
                continue

            result = await method(audio_path, params)

            await client.publish(
                f"audio/results/{req_id}",
                json.dumps(result),
            )
            await client.publish(
                f"audio/status/{req_id}",
                json.dumps({"status": "completed"}),
            )

# Test the MCP server
async def test_mcp_server():
    """Test MCP Audio Server"""
    print("🎵 Testing MCP Audio Server\n")
    
    server = MCPAudioServer()
    
    # Test requests
    test_requests = [
        "cut from 30 seconds to 2 minutes",
        "normalize to -20 dB and add fade in",
        "remove noise and convert to MP3"
    ]
    
    for request in test_requests:
        print(f"Request: {request}")
        result = await server.process_audio_request(request)
        
        if "error" not in result:
            print(f"Operations: {len(result['operations'])}")
            for op in result['operations']:
                print(f"  • {op['operation']}: {op['parameters']}")
            print(f"Confidence: {result['confidence']:.2f}")
        else:
            print(f"Error: {result['error']}")
        
        print("-" * 50)
    
    # Show summary
    summary = server.get_conversation_summary()
    print(f"\nSummary: {summary['total_messages']} messages, {summary['active_requests']} active requests")
    
    # Show operations
    ops = server.get_supported_operations()
    print(f"\nSupported Operations: {ops['total']}")

if __name__ == "__main__":
    asyncio.run(test_mcp_server())
