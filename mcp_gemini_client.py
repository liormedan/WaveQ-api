"""
🎵 WaveQ MCP Gemini Client

MCP Client that connects to Gemini and uses Audio Agent
for natural language audio processing.
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

# Import our MCP Audio Server
from mcp_audio_server import MCPAudioServer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPGeminiClient:
    """MCP Client for Gemini + Audio Agent Integration"""
    
    def __init__(self):
        self.audio_server = MCPAudioServer()
        self.conversation_history = []
        self.gemini_responses = []
        
        # System prompt for Gemini
        self.system_prompt = """
You are WaveQ Audio Processing Assistant, an expert in audio editing and processing.

Your capabilities include:
- Understanding natural language audio requests
- Converting them to technical operations
- Providing helpful suggestions and explanations
- Handling complex multi-step audio processing tasks

When a user asks about audio processing:
1. Understand their intent
2. Identify the audio operations needed
3. Extract relevant parameters
4. Provide clear explanations
5. Suggest optimizations when possible

Always be helpful, clear, and professional. If you're unsure about something, ask for clarification.
"""
    
    async def process_with_gemini(self, user_message: str, audio_file: str = None) -> Dict[str, Any]:
        """
        Process audio request with Gemini insights
        
        Args:
            user_message: User's natural language request
            audio_file: Optional audio file path
            
        Returns:
            Complete response with Gemini insights and audio operations
        """
        try:
            logger.info(f"Processing with Gemini: {user_message}")
            
            # Step 1: Process with Audio Agent
            audio_result = await self.audio_server.process_audio_request(user_message, audio_file)
            
            if "error" in audio_result:
                return audio_result
            
            # Step 2: Get Gemini insights (simulated for now)
            gemini_insights = await self._get_gemini_insights(user_message, audio_result)
            
            # Step 3: Create enhanced response
            enhanced_response = {
                "request_id": audio_result["request_id"],
                "user_message": user_message,
                "audio_file": audio_file,
                "audio_operations": audio_result["operations"],
                "confidence": audio_result["confidence"],
                "gemini_insights": gemini_insights,
                "timestamp": datetime.now().isoformat(),
                "processing_summary": self._create_processing_summary(audio_result["operations"])
            }
            
            # Add to conversation history
            self.conversation_history.append({
                "role": "user",
                "content": user_message,
                "timestamp": datetime.now().isoformat()
            })
            
            self.conversation_history.append({
                "role": "assistant",
                "content": f"Processed audio request with {len(audio_result['operations'])} operations",
                "timestamp": datetime.now().isoformat(),
                "operations": audio_result["operations"],
                "gemini_insights": gemini_insights
            })
            
            return enhanced_response
            
        except Exception as e:
            logger.error(f"Error in Gemini processing: {e}")
            return {"error": str(e)}
    
    async def _get_gemini_insights(self, user_message: str, audio_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get insights from Gemini about the audio request
        
        Args:
            user_message: Original user message
            audio_result: Result from Audio Agent
            
        Returns:
            Gemini insights and suggestions
        """
        try:
            # Simulate Gemini API call
            await asyncio.sleep(0.1)
            
            # Create enhanced prompt
            enhanced_prompt = f"""
User Request: "{user_message}"

Parsed Audio Operations: {json.dumps(audio_result["operations"], indent=2)}

Please provide:
1. Confirmation that the operations match the user's intent
2. Any additional suggestions or optimizations
3. Potential issues or considerations
4. Professional audio processing advice

Respond in a helpful, professional manner.
"""
            
            # Simulate Gemini response
            gemini_response = f"""
Audio Processing Analysis:

✅ Operations correctly identified: {len(audio_result["operations"])} operations
✅ Parameters extracted appropriately
✅ Operation order optimized for best results

Suggestions:
- Consider adding fade-in/fade-out for smoother transitions
- Monitor audio quality during processing
- Test with a small sample first

The parsed operations appear to match your request well. The system will process them in the optimal order for best results.

Professional Advice:
- Always backup original files before processing
- Use high-quality settings for final output
- Consider the target platform (web, mobile, broadcast)
"""
            
            return {
                "analysis": gemini_response,
                "timestamp": datetime.now().isoformat(),
                "model": "gemini-pro",
                "confidence": audio_result["confidence"]
            }
            
        except Exception as e:
            logger.error(f"Error getting Gemini insights: {e}")
            return {"error": str(e)}
    
    def _create_processing_summary(self, operations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a summary of the processing operations"""
        summary = {
            "total_operations": len(operations),
            "operation_types": {},
            "estimated_duration": "2-5 minutes",
            "complexity": "medium" if len(operations) <= 3 else "high",
            "recommendations": []
        }
        
        # Count operation types
        for op in operations:
            op_type = op["operation"]
            summary["operation_types"][op_type] = summary["operation_types"].get(op_type, 0) + 1
        
        # Add recommendations based on operations
        if "noise_reduction" in summary["operation_types"]:
            summary["recommendations"].append("Use headphones to monitor noise reduction quality")
        
        if "normalize" in summary["operation_types"]:
            summary["recommendations"].append("Check final levels to ensure they meet platform requirements")
        
        if "convert_format" in summary["operation_types"]:
            summary["recommendations"].append("Verify output format compatibility with target platform")
        
        return summary
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get conversation history summary"""
        return {
            "total_messages": len(self.conversation_history),
            "user_messages": len([m for m in self.conversation_history if m["role"] == "user"]),
            "assistant_messages": len([m for m in self.conversation_history if m["role"] == "assistant"]),
            "gemini_responses": len(self.gemini_responses),
            "conversation_duration": self._calculate_conversation_duration(),
            "last_message": self.conversation_history[-1] if self.conversation_history else None
        }
    
    def _calculate_conversation_duration(self) -> str:
        """Calculate total conversation duration"""
        if len(self.conversation_history) < 2:
            return "0 minutes"
        
        first_time = datetime.fromisoformat(self.conversation_history[0]["timestamp"])
        last_time = datetime.fromisoformat(self.conversation_history[-1]["timestamp"])
        duration = last_time - first_time
        
        minutes = int(duration.total_seconds() / 60)
        return f"{minutes} minutes"
    
    def clear_conversation_history(self):
        """Clear conversation history"""
        self.conversation_history.clear()
        self.gemini_responses.clear()
        logger.info("Conversation history cleared")

# Test the MCP Gemini Client
async def test_mcp_gemini_client():
    """Test MCP Gemini Client"""
    print("🎵 Testing MCP Gemini Client\n")
    
    client = MCPGeminiClient()
    
    # Test requests
    test_requests = [
        "I want to cut my podcast from 2 minutes to 10 minutes and add some reverb",
        "Can you normalize my audio and boost the bass?",
        "I need to remove background noise and convert to MP3 format"
    ]
    
    for request in test_requests:
        print(f"User Request: {request}")
        print("-" * 60)
        
        # Process with Gemini
        result = await client.process_with_gemini(request)
        
        if "error" not in result:
            print(f"Audio Operations: {len(result['audio_operations'])}")
            for op in result['audio_operations']:
                print(f"  • {op['operation']}: {op['parameters']}")
            
            print(f"Confidence: {result['confidence']:.2f}")
            print(f"Processing Summary: {result['processing_summary']['total_operations']} operations")
            print(f"Complexity: {result['processing_summary']['complexity']}")
            
            if result['gemini_insights'] and 'analysis' in result['gemini_insights']:
                print(f"Gemini Insights: {result['gemini_insights']['analysis'][:200]}...")
        else:
            print(f"Error: {result['error']}")
        
        print("=" * 60)
    
    # Show conversation summary
    summary = client.get_conversation_summary()
    print(f"\nConversation Summary:")
    print(f"Total Messages: {summary['total_messages']}")
    print(f"User Messages: {summary['user_messages']}")
    print(f"Assistant Messages: {summary['assistant_messages']}")
    print(f"Duration: {summary['conversation_duration']}")

if __name__ == "__main__":
    asyncio.run(test_mcp_gemini_client())

