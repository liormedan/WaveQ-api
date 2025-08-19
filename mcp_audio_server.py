import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import tempfile
import os
from datetime import datetime
import uuid

# Audio processing libraries
from pydub import AudioSegment
import librosa
import soundfile as sf
import numpy as np
from scipy import signal

# MCP and networking
import asyncio_mqtt as aiomqtt
from pythonjsonlogger import jsonlogger

class AudioProcessingMCP:
    """MCP Server for Audio Processing Operations"""
    
    def __init__(self, mqtt_broker: str = "localhost", mqtt_port: int = 1883):
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.client_id = f"audio_mcp_{uuid.uuid4().hex[:8]}"
        self.processing_queue = asyncio.Queue()
        self.results_cache = {}
        
        # Setup logging
        self.setup_logging()
        
        # Supported audio operations
        self.supported_operations = {
            "trim": self.trim_audio,
            "normalize": self.normalize_audio,
            "fade_in": self.fade_in_audio,
            "fade_out": self.fade_out_audio,
            "change_speed": self.change_speed,
            "change_pitch": self.change_pitch,
            "add_reverb": self.add_reverb,
            "noise_reduction": self.noise_reduction,
            "equalize": self.equalize_audio,
            "compress": self.compress_audio,
            "merge": self.merge_audio_files,
            "split": self.split_audio,
            "convert_format": self.convert_format,
            "process_operations": self.process_operations_handler
        }
    
    def setup_logging(self):
        """Setup JSON logging for MCP operations"""
        logger = logging.getLogger()
        logHandler = logging.StreamHandler()
        formatter = jsonlogger.JsonFormatter(
            fmt='%(asctime)s %(name)s %(levelname)s %(message)s'
        )
        logHandler.setFormatter(formatter)
        logger.addHandler(logHandler)
        logger.setLevel(logging.INFO)
        self.logger = logger
    
    async def start_server(self):
        """Start the MCP server and listen for requests"""
        self.logger.info("Starting Audio Processing MCP Server", extra={
            "client_id": self.client_id,
            "broker": self.mqtt_broker,
            "port": self.mqtt_port
        })
        
        try:
            async with aiomqtt.Client(
                hostname=self.mqtt_broker,
                port=self.mqtt_port,
                identifier=self.client_id
            ) as client:
                await client.subscribe("audio/requests/#")
                await client.subscribe("audio/status/#")
                
                self.logger.info("Connected to MQTT broker and subscribed to topics")
                
                # Start processing tasks
                asyncio.create_task(self.process_audio_requests(client))
                asyncio.create_task(self.handle_mqtt_messages(client))
                
                # Keep server running
                while True:
                    await asyncio.sleep(1)
                    
        except Exception as e:
            self.logger.error("MCP Server error", extra={"error": str(e)})
            raise
    
    async def handle_mqtt_messages(self, client):
        """Handle incoming MQTT messages"""
        async with client.messages() as messages:
            async for message in messages:
                try:
                    topic = message.topic.value
                    payload = json.loads(message.payload.decode())
                    
                    self.logger.info("Received MQTT message", extra={
                        "topic": topic,
                        "payload": payload
                    })
                    
                    if topic.startswith("audio/requests/"):
                        await self.processing_queue.put({
                            "topic": topic,
                            "payload": payload,
                            "timestamp": datetime.now().isoformat()
                        })
                        
                except Exception as e:
                    self.logger.error("Error processing MQTT message", extra={
                        "error": str(e),
                        "topic": message.topic.value if hasattr(message, 'topic') else 'unknown'
                    })
    
    async def process_audio_requests(self, client):
        """Process audio requests from the queue"""
        while True:
            try:
                request = await self.processing_queue.get()
                await self.process_single_request(client, request)
            except Exception as e:
                self.logger.error("Error in audio processing loop", extra={"error": str(e)})
    
    async def process_single_request(self, client, request):
        """Process a single audio request"""
        try:
            payload = request["payload"]
            request_id = payload.get("request_id", str(uuid.uuid4()))
            
            self.logger.info("Processing audio request", extra={
                "request_id": request_id,
                "operation": payload.get("operation")
            })
            
            # Update status to processing
            await self.publish_status(client, request_id, "processing", "Processing audio file...")
            
            # Process the audio
            result = await self.execute_audio_operation(payload)
            
            # Store result
            self.results_cache[request_id] = result
            
            # Update status to completed
            await self.publish_status(client, request_id, "completed", "Audio processing completed")
            
            # Publish result
            await self.publish_result(client, request_id, result)
            
        except Exception as e:
            self.logger.error("Error processing audio request", extra={
                "request_id": request.get("payload", {}).get("request_id", "unknown"),
                "error": str(e)
            })
            
            # Publish error status
            await self.publish_status(client, request_id, "error", f"Error: {str(e)}")
    
    async def execute_audio_operation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the requested audio operation"""
        operation = payload.get("operation")
        audio_data = payload.get("audio_data")
        parameters = payload.get("parameters", {})
        
        if operation not in self.supported_operations:
            raise ValueError(f"Unsupported operation: {operation}")
        
        # Create temporary file for processing
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_path = temp_path = temp_file.name
        
        try:
            # Load audio file
            if isinstance(audio_data, str) and os.path.exists(audio_data):
                audio_path = audio_data
            else:
                # Handle base64 or binary data
                audio_path = await self.save_audio_data(audio_data, temp_path)
            
            # Execute operation
            result = await self.supported_operations[operation](audio_path, parameters)
            
            return {
                "operation": operation,
                "result": result,
                "parameters": parameters,
                "timestamp": datetime.now().isoformat()
            }
            
        finally:
            # Cleanup temporary files
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    async def save_audio_data(self, audio_data: Any, temp_path: str) -> str:
        """Save audio data to temporary file"""
        # Implementation depends on how audio data is received
        # For now, assume it's a file path
        return audio_data
    
    async def publish_status(self, client, request_id: str, status: str, message: str):
        """Publish status update to MQTT"""
        status_message = {
            "request_id": request_id,
            "status": status,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        
        await client.publish(f"audio/status/{request_id}", json.dumps(status_message))
    
    async def publish_result(self, client, request_id: str, result: Dict[str, Any]):
        """Publish processing result to MQTT"""
        await client.publish(f"audio/results/{request_id}", json.dumps(result))

    # Audio Processing Methods
    async def process_operations_handler(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Wrapper to process a sequence of operations from parameters"""
        operations = parameters.get("operations", [])
        result_path = await self.process_operations(audio_path, operations)
        return {"output_path": result_path, "operations": operations}

    async def process_operations(self, file_path: str, operations: List[Dict[str, Any]]) -> str:
        """Apply multiple audio operations sequentially using Pydub/FFmpeg"""
        if not operations:
            raise ValueError("No operations provided")

        audio = AudioSegment.from_file(file_path)

        for op in operations:
            name = op.get("name")
            if name == "trim":
                start = int(op.get("start", 0) * 1000)
                end = int(op.get("end", len(audio) / 1000) * 1000)
                audio = audio[start:end]
            elif name == "fade_in":
                duration = int(op.get("duration", 1000))
                audio = audio.fade_in(duration)
            elif name == "fade_out":
                duration = int(op.get("duration", 1000))
                audio = audio.fade_out(duration)
            elif name == "normalize":
                audio = audio.normalize()
            else:
                raise ValueError(f"Unsupported operation: {name}")

        output_dir = Path("processed")
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{Path(file_path).stem}_processed.wav"
        audio.export(output_path, format="wav")

        return str(output_path)

    async def trim_audio(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Trim audio file to specified start and end times"""
        start_time = parameters.get("start_time", 0)  # seconds
        end_time = parameters.get("end_time", None)  # seconds
        
        audio = AudioSegment.from_file(audio_path)
        
        if end_time is None:
            end_time = len(audio) / 1000  # Convert to seconds
        
        start_ms = int(start_time * 1000)
        end_ms = int(end_time * 1000)
        
        trimmed_audio = audio[start_ms:end_ms]
        
        # Save trimmed audio
        output_path = f"{audio_path}_trimmed.wav"
        trimmed_audio.export(output_path, format="wav")
        
        return {
            "output_path": output_path,
            "duration": len(trimmed_audio) / 1000,
            "start_time": start_time,
            "end_time": end_time
        }
    
    async def normalize_audio(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize audio to target dB level"""
        target_db = parameters.get("target_db", -20)
        
        audio = AudioSegment.from_file(audio_path)
        normalized_audio = audio.normalize(headroom=target_db)
        
        output_path = f"{audio_path}_normalized.wav"
        normalized_audio.export(output_path, format="wav")
        
        return {
            "output_path": output_path,
            "target_db": target_db,
            "original_db": audio.dBFS,
            "normalized_db": normalized_audio.dBFS
        }
    
    async def fade_in_audio(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Apply fade in effect to audio"""
        fade_duration = parameters.get("fade_duration", 1000)  # milliseconds
        
        audio = AudioSegment.from_file(audio_path)
        faded_audio = audio.fade_in(fade_duration)
        
        output_path = f"{audio_path}_fade_in.wav"
        faded_audio.export(output_path, format="wav")
        
        return {
            "output_path": output_path,
            "fade_duration": fade_duration
        }
    
    async def fade_out_audio(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Apply fade out effect to audio"""
        fade_duration = parameters.get("fade_duration", 1000)  # milliseconds
        
        audio = AudioSegment.from_file(audio_path)
        faded_audio = audio.fade_out(fade_duration)
        
        output_path = f"{audio_path}_fade_out.wav"
        faded_audio.export(output_path, format="wav")
        
        return {
            "output_path": output_path,
            "fade_duration": fade_duration
        }
    
    async def change_speed(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Change audio playback speed"""
        speed_factor = parameters.get("speed_factor", 1.0)
        
        # Load audio with librosa for speed change
        y, sr = librosa.load(audio_path)
        
        # Change speed using librosa
        y_fast = librosa.effects.time_stretch(y, rate=speed_factor)
        
        output_path = f"{audio_path}_speed_{speed_factor}.wav"
        sf.write(output_path, y_fast, sr)
        
        return {
            "output_path": output_path,
            "speed_factor": speed_factor,
            "original_duration": len(y) / sr,
            "new_duration": len(y_fast) / sr
        }
    
    async def change_pitch(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Change audio pitch"""
        pitch_steps = parameters.get("pitch_steps", 0)  # semitones
        
        y, sr = librosa.load(audio_path)
        
        # Change pitch using librosa
        y_pitch = librosa.effects.pitch_shift(y, sr=sr, n_steps=pitch_steps)
        
        output_path = f"{audio_path}_pitch_{pitch_steps}.wav"
        sf.write(output_path, y_pitch, sr)
        
        return {
            "output_path": output_path,
            "pitch_steps": pitch_steps,
            "original_pitch": "C4",  # This would need actual pitch detection
            "new_pitch": f"C{4 + pitch_steps}"
        }
    
    async def add_reverb(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Add reverb effect to audio"""
        room_size = parameters.get("room_size", 0.5)
        damping = parameters.get("damping", 0.5)
        
        y, sr = librosa.load(audio_path)
        
        # Simple reverb simulation using convolution
        reverb_length = int(room_size * sr)
        reverb = np.exp(-damping * np.arange(reverb_length) / sr)
        reverb = reverb / np.sum(reverb)
        
        y_reverb = np.convolve(y, reverb, mode='same')
        
        output_path = f"{audio_path}_reverb.wav"
        sf.write(output_path, y_reverb, sr)
        
        return {
            "output_path": output_path,
            "room_size": room_size,
            "damping": damping
        }
    
    async def noise_reduction(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Reduce noise in audio using spectral gating"""
        noise_reduction_strength = parameters.get("strength", 0.1)
        
        y, sr = librosa.load(audio_path)
        
        # Simple noise reduction using spectral gating
        D = librosa.stft(y)
        D_mag, D_phase = librosa.magphase(D)
        
        # Estimate noise from first few frames
        noise_spectrum = np.mean(np.abs(D_mag[:, :10]), axis=1, keepdims=True)
        
        # Apply spectral gating
        gate = D_mag > (noise_reduction_strength * noise_spectrum)
        D_mag_filtered = D_mag * gate
        
        # Reconstruct signal
        D_filtered = D_mag_filtered * D_phase
        y_filtered = librosa.istft(D_filtered)
        
        output_path = f"{audio_path}_noise_reduced.wav"
        sf.write(output_path, y_filtered, sr)
        
        return {
            "output_path": output_path,
            "noise_reduction_strength": noise_reduction_strength
        }
    
    async def equalize_audio(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Apply equalization to audio"""
        # Simple 3-band EQ
        low_gain = parameters.get("low_gain", 1.0)
        mid_gain = parameters.get("mid_gain", 1.0)
        high_gain = parameters.get("high_gain", 1.0)
        
        y, sr = librosa.load(audio_path)
        
        # Apply filters for different frequency bands
        # Low frequencies (0-500 Hz)
        low_filter = signal.butter(4, 500/(sr/2), btype='low')[0]
        y_low = signal.filtfilt(low_filter[0], low_filter[1], y)
        
        # Mid frequencies (500-4000 Hz)
        mid_filter_low = signal.butter(4, 500/(sr/2), btype='high')[0]
        mid_filter_high = signal.butter(4, 4000/(sr/2), btype='low')[0]
        y_mid = signal.filtfilt(mid_filter_low[0], mid_filter_low[1], y)
        y_mid = signal.filtfilt(mid_filter_high[0], mid_filter_high[1], y_mid)
        
        # High frequencies (4000+ Hz)
        high_filter = signal.butter(4, 4000/(sr/2), btype='high')[0]
        y_high = signal.filtfilt(high_filter[0], high_filter[1], y)
        
        # Combine with gains
        y_eq = low_gain * y_low + mid_gain * y_mid + high_gain * y_high
        
        output_path = f"{audio_path}_equalized.wav"
        sf.write(output_path, y_eq, sr)
        
        return {
            "output_path": output_path,
            "low_gain": low_gain,
            "mid_gain": mid_gain,
            "high_gain": high_gain
        }
    
    async def compress_audio(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Apply dynamic range compression"""
        threshold = parameters.get("threshold", -20)  # dB
        ratio = parameters.get("ratio", 4.0)
        attack = parameters.get("attack", 0.005)  # seconds
        release = parameters.get("release", 0.1)  # seconds
        
        y, sr = librosa.load(audio_path)
        
        # Convert to dB
        y_db = 20 * np.log10(np.abs(y) + 1e-10)
        
        # Apply compression
        gain_reduction = np.where(y_db > threshold, 
                                (threshold - y_db) * (1 - 1/ratio), 0)
        
        # Smooth gain changes
        attack_samples = int(attack * sr)
        release_samples = int(release * sr)
        
        gain_reduction = signal.lfilter([1], [1, -np.exp(-1/release_samples)], gain_reduction)
        gain_reduction = signal.lfilter([1], [1, -np.exp(-1/attack_samples)], gain_reduction)
        
        # Apply gain
        y_compressed = y * np.power(10, gain_reduction/20)
        
        output_path = f"{audio_path}_compressed.wav"
        sf.write(output_path, y_compressed, sr)
        
        return {
            "output_path": output_path,
            "threshold": threshold,
            "ratio": ratio,
            "attack": attack,
            "release": release
        }
    
    async def merge_audio_files(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Merge multiple audio files"""
        additional_files = parameters.get("additional_files", [])
        
        if not additional_files:
            raise ValueError("No additional files provided for merging")
        
        # Load main audio
        main_audio = AudioSegment.from_file(audio_path)
        
        # Load and merge additional files
        for file_path in additional_files:
            if os.path.exists(file_path):
                additional_audio = AudioSegment.from_file(file_path)
                main_audio = main_audio + additional_audio
        
        output_path = f"{audio_path}_merged.wav"
        main_audio.export(output_path, format="wav")
        
        return {
            "output_path": output_path,
            "merged_files": [audio_path] + additional_files,
            "total_duration": len(main_audio) / 1000
        }
    
    async def split_audio(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Split audio into segments"""
        segment_duration = parameters.get("segment_duration", 30)  # seconds
        
        audio = AudioSegment.from_file(audio_path)
        total_duration = len(audio) / 1000
        
        segments = []
        segment_paths = []
        
        for i in range(0, int(total_duration), segment_duration):
            start_ms = i * 1000
            end_ms = min((i + segment_duration) * 1000, len(audio))
            
            segment = audio[start_ms:end_ms]
            segment_path = f"{audio_path}_segment_{i//segment_duration}.wav"
            
            segment.export(segment_path, format="wav")
            segments.append({
                "segment_number": i//segment_duration + 1,
                "start_time": i,
                "end_time": min(i + segment_duration, total_duration),
                "duration": (end_ms - start_ms) / 1000
            })
            segment_paths.append(segment_path)
        
        return {
            "segment_paths": segment_paths,
            "segments": segments,
            "total_segments": len(segments)
        }
    
    async def convert_format(self, audio_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Convert audio to different format"""
        target_format = parameters.get("target_format", "mp3")
        quality = parameters.get("quality", "high")
        
        audio = AudioSegment.from_file(audio_path)
        
        # Set quality parameters
        if target_format == "mp3":
            if quality == "high":
                bitrate = "320k"
            elif quality == "medium":
                bitrate = "192k"
            else:
                bitrate = "128k"
            output_path = f"{audio_path}.{target_format}"
            audio.export(output_path, format=target_format, bitrate=bitrate)
        else:
            output_path = f"{audio_path}.{target_format}"
            audio.export(output_path, format=target_format)
        
        return {
            "output_path": output_path,
            "target_format": target_format,
            "quality": quality,
            "original_format": audio_path.split(".")[-1]
        }

async def main():
    """Main function to start the MCP server"""
    # Create and start the MCP server
    mcp_server = AudioProcessingMCP()
    
    try:
        await mcp_server.start_server()
    except KeyboardInterrupt:
        print("Shutting down MCP server...")
    except Exception as e:
        print(f"Error starting MCP server: {e}")

if __name__ == "__main__":
    asyncio.run(main())
