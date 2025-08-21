"""
🎵 WaveQ MCP Audio Server

MCP (Model Context Protocol) server for audio processing
with natural language understanding.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

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
