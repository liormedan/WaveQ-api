"""
🎵 WaveQ Audio Agent Library
Audio Processing Expert Agent for Language Models

This library acts as an intelligent intermediary between language models (like Gemini)
and the audio processing system, understanding natural language requests and converting
them to technical audio operations.
"""

import json
import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioAgent:
    """
    Intelligent Audio Processing Agent
    
    This agent understands natural language requests and converts them to
    technical audio processing operations that the system can execute.
    """
    
    def __init__(self):
        self.supported_operations = {
            # Basic Operations
            "trim": {
                "aliases": ["cut", "slice", "remove", "delete", "extract"],
                "description": "Trim audio to specific time range",
                "parameters": ["start_time", "end_time"],
                "examples": [
                    "cut from 30 seconds to 2 minutes",
                    "trim the first 10 seconds",
                    "remove everything after 5 minutes"
                ]
            },
            "normalize": {
                "aliases": ["balance", "level", "adjust volume", "fix levels"],
                "description": "Normalize audio levels to target dB",
                "parameters": ["target_db"],
                "examples": [
                    "normalize to -20 dB",
                    "balance the audio levels",
                    "fix the volume levels"
                ]
            },
            "fade_in": {
                "aliases": ["fade", "smooth start", "gradual start"],
                "description": "Apply fade in effect",
                "parameters": ["duration"],
                "examples": [
                    "add 2 second fade in",
                    "smooth the beginning",
                    "gradual start over 3 seconds"
                ]
            },
            "fade_out": {
                "aliases": ["fade end", "smooth end", "gradual end"],
                "description": "Apply fade out effect",
                "parameters": ["duration"],
                "examples": [
                    "add 1.5 second fade out",
                    "smooth the ending",
                    "gradual end over 2 seconds"
                ]
            },
            "change_speed": {
                "aliases": ["speed up", "slow down", "tempo", "pace"],
                "description": "Change audio playback speed",
                "parameters": ["speed_factor"],
                "examples": [
                    "speed up by 1.5x",
                    "slow down to 0.8x",
                    "make it 2x faster"
                ]
            },
            "change_pitch": {
                "aliases": ["pitch", "tune", "key", "note"],
                "description": "Change audio pitch",
                "parameters": ["pitch_steps"],
                "examples": [
                    "raise pitch by 2 semitones",
                    "lower pitch by 1 semitone",
                    "change to C major"
                ]
            },
            "time_stretch_torch": {
                "aliases": ["time stretch", "stretch", "tempo stretch"],
                "description": "Time stretch audio using torchaudio",
                "parameters": ["rate"],
                "examples": [
                    "time stretch by 1.5x",
                    "stretch to half speed",
                    "tempo stretch using torch"
                ]
            },
            "add_reverb": {
                "aliases": ["reverb", "echo", "room", "space"],
                "description": "Add reverb effect",
                "parameters": ["room_size", "damping"],
                "examples": [
                    "add reverb with large room",
                    "add echo effect",
                    "make it sound like a cathedral"
                ]
            },
            "noise_reduction": {
                "aliases": ["remove noise", "clean", "filter", "denoise"],
                "description": "Reduce background noise",
                "parameters": ["strength"],
                "examples": [
                    "remove background noise",
                    "clean the audio",
                    "filter out static"
                ]
            },
            "equalize": {
                "aliases": ["eq", "equalizer", "bass", "treble", "balance"],
                "description": "Apply equalization",
                "parameters": ["low_gain", "mid_gain", "high_gain"],
                "examples": [
                    "boost the bass",
                    "reduce treble",
                    "balance the frequencies"
                ]
            },
            "compress": {
                "aliases": ["compression", "dynamic range", "squash"],
                "description": "Apply dynamic range compression",
                "parameters": ["threshold", "ratio", "attack", "release"],
                "examples": [
                    "compress the dynamic range",
                    "make quiet parts louder",
                    "squash the peaks"
                ]
            },
            "merge": {
                "aliases": ["combine", "join", "concatenate", "add"],
                "description": "Merge multiple audio files",
                "parameters": ["additional_files"],
                "examples": [
                    "combine with background music",
                    "add sound effects",
                    "merge multiple recordings"
                ]
            },
            "split": {
                "aliases": ["divide", "separate", "segment", "cut into"],
                "description": "Split audio into segments",
                "parameters": ["segment_duration"],
                "examples": [
                    "split into 30 second segments",
                    "divide by chapters",
                    "cut into equal parts"
                ]
            },
            "convert_format": {
                "aliases": ["convert", "export", "save as", "format"],
                "description": "Convert to different audio format",
                "parameters": ["target_format", "quality"],
                "examples": [
                    "convert to MP3",
                    "export as WAV",
                    "save as high quality FLAC"
                ]
            }
        }
        
        # Natural language patterns
        self.patterns = {
            "time": r"(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?)",
            "db": r"(-?\d+(?:\.\d+)?)\s*dB",
            "ratio": r"(\d+(?:\.\d+)?)x",
            "percentage": r"(\d+(?:\.\d+)?)\s*%",
            "semitone": r"(\d+)\s*semitones?",
            "quality": r"(low|medium|high)\s*quality",
            "format": r"(wav|mp3|flac|aac|ogg)"
        }
    
    def parse_natural_language(self, text: str) -> Dict[str, Any]:
        """
        Parse natural language request and convert to technical operations
        
        Args:
            text: Natural language request (e.g., "cut from 30 seconds to 2 minutes")
            
        Returns:
            Dictionary with parsed operations and parameters
        """
        text = text.lower().strip()
        logger.info(f"Parsing natural language request: {text}")
        
        # Initialize result
        result = {
            "operations": [],
            "confidence": 0.0,
            "parsed_text": text,
            "timestamp": datetime.now().isoformat()
        }
        
        # Try to identify operations
        identified_operations = []
        
        for operation, info in self.supported_operations.items():
            # Check main operation name
            if operation in text:
                identified_operations.append({
                    "operation": operation,
                    "parameters": self._extract_parameters(text, operation, info),
                    "confidence": 1.0,
                    "description": info["description"]
                })
                continue
            
            # Check aliases
            for alias in info["aliases"]:
                if alias in text:
                    identified_operations.append({
                        "operation": operation,
                        "parameters": self._extract_parameters(text, operation, info),
                        "confidence": 0.9,
                        "description": info["description"]
                    })
                    break
        
        # Sort by confidence
        identified_operations.sort(key=lambda x: x["confidence"], reverse=True)
        
        result["operations"] = identified_operations
        result["confidence"] = sum(op["confidence"] for op in identified_operations) / max(len(identified_operations), 1)
        
        logger.info(f"Parsed result: {json.dumps(result, indent=2)}")
        return result
    
    def _extract_parameters(self, text: str, operation: str, op_info: Dict) -> Dict[str, Any]:
        """Extract parameters for a specific operation from text"""
        parameters = {}
        
        if operation == "trim":
            # Extract time ranges
            time_matches = re.findall(self.patterns["time"], text)
            if len(time_matches) >= 2:
                parameters["start_time"] = float(time_matches[0])
                parameters["end_time"] = float(time_matches[1])
            elif len(time_matches) == 1:
                if "from" in text or "start" in text:
                    parameters["start_time"] = float(time_matches[0])
                elif "to" in text or "end" in text:
                    parameters["end_time"] = float(time_matches[0])
        
        elif operation == "normalize":
            # Extract dB level
            db_match = re.search(self.patterns["db"], text)
            if db_match:
                parameters["target_db"] = float(db_match.group(1))
            else:
                parameters["target_db"] = -20.0  # Default
        
        elif operation == "change_speed":
            # Extract speed factor
            ratio_match = re.search(self.patterns["ratio"], text)
            if ratio_match:
                speed = float(ratio_match.group(1))
                if "slow" in text or "down" in text:
                    speed = 1 / speed
                parameters["speed_factor"] = speed
            else:
                # Try to infer from text
                if "fast" in text or "speed up" in text:
                    parameters["speed_factor"] = 1.5
                elif "slow" in text or "slow down" in text:
                    parameters["speed_factor"] = 0.8
                else:
                    parameters["speed_factor"] = 1.0

        elif operation == "time_stretch_torch":
            ratio_match = re.search(self.patterns["ratio"], text)
            if ratio_match:
                parameters["rate"] = float(ratio_match.group(1))
            else:
                if "half" in text:
                    parameters["rate"] = 0.5
                elif "double" in text or "twice" in text:
                    parameters["rate"] = 2.0
                else:
                    parameters["rate"] = 1.0

        elif operation == "change_pitch":
            # Extract semitones
            semitone_match = re.search(self.patterns["semitone"], text)
            if semitone_match:
                steps = int(semitone_match.group(1))
                if "lower" in text or "down" in text:
                    steps = -steps
                parameters["pitch_steps"] = steps
            else:
                parameters["pitch_steps"] = 0
        
        elif operation in ["fade_in", "fade_out"]:
            # Extract duration
            time_match = re.search(self.patterns["time"], text)
            if time_match:
                parameters["duration"] = float(time_match.group(1))
            else:
                parameters["duration"] = 1.0  # Default 1 second
        
        elif operation == "convert_format":
            # Extract format and quality
            format_match = re.search(self.patterns["format"], text)
            if format_match:
                parameters["target_format"] = format_match.group(1)
            else:
                parameters["target_format"] = "mp3"
            
            quality_match = re.search(self.patterns["quality"], text)
            if quality_match:
                parameters["quality"] = quality_match.group(1)
            else:
                parameters["quality"] = "high"
        
        return parameters
    
    def generate_operation_chain(self, operations: List[Dict]) -> List[Dict]:
        """
        Generate optimized operation chain from parsed operations
        
        Args:
            operations: List of parsed operations
            
        Returns:
            Optimized operation chain
        """
        # Sort operations by priority and dependencies
        operation_order = [
            "noise_reduction",  # Do noise reduction first
            "normalize",        # Then normalize
            "equalize",         # Then equalize
            "compress",         # Then compress
            "trim",            # Then trim
            "fade_in",         # Then fades
            "fade_out",
            "time_stretch_torch",  # Torchaudio time stretch
            "change_speed",    # Then speed/pitch changes
            "change_pitch",
            "add_reverb",      # Then effects
            "split",           # Then structural changes
            "merge",
            "convert_format"   # Convert format last
        ]
        
        # Sort operations by this order
        sorted_operations = []
        for op_name in operation_order:
            for op in operations:
                if op["operation"] == op_name:
                    sorted_operations.append(op)
        
        # Add any remaining operations
        for op in operations:
            if op not in sorted_operations:
                sorted_operations.append(op)
        
        return sorted_operations
    
    def create_processing_request(self, operations: List[Dict], audio_file: str = None) -> Dict[str, Any]:
        """
        Create a complete processing request from operations
        
        Args:
            operations: List of operations to perform
            audio_file: Path to audio file (optional)
            
        Returns:
            Complete processing request
        """
        request = {
            "request_id": f"audio_agent_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "audio_file": audio_file,
            "operations": [],
            "priority": "normal",
            "description": "Generated by Audio Agent",
            "timestamp": datetime.now().isoformat(),
            "agent_version": "1.0.0"
        }
        
        # Convert operations to system format
        for op in operations:
            system_op = {
                "name": op["operation"],
                "parameters": op["parameters"]
            }
            request["operations"].append(system_op)
        
        return request
    
    def get_help_text(self) -> str:
        """Get help text for supported operations"""
        help_text = "🎵 WaveQ Audio Agent - Supported Operations:\n\n"
        
        for operation, info in self.supported_operations.items():
            help_text += f"🔧 {operation.upper()}\n"
            help_text += f"   Description: {info['description']}\n"
            help_text += f"   Aliases: {', '.join(info['aliases'])}\n"
            help_text += f"   Examples:\n"
            for example in info['examples']:
                help_text += f"     • {example}\n"
            help_text += "\n"
        
        return help_text

# Example usage
if __name__ == "__main__":
    agent = AudioAgent()
    
    # Test natural language parsing
    test_requests = [
        "cut from 30 seconds to 2 minutes",
        "normalize to -20 dB and add 2 second fade in",
        "speed up by 1.5x and boost the bass",
        "remove background noise and convert to MP3"
    ]
    
    print("🎵 Testing Audio Agent Library\n")
    
    for request in test_requests:
        print(f"Request: {request}")
        result = agent.parse_natural_language(request)
        print(f"Parsed: {json.dumps(result, indent=2)}")
        print("-" * 50)
    
    print("\n" + agent.get_help_text())
