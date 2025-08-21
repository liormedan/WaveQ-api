"""
🎵 WaveQ Gemini Audio Integration Layer

This module integrates Google's Gemini language model with the Audio Agent Library,
enabling natural language audio processing requests through Gemini's understanding
capabilities.
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import asyncio

# Import our Audio Agent
from audio_agent_library import AudioAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiAudioIntegration:
    """
    Integration layer between Gemini and Audio Agent
    
    This class handles the communication between Gemini's natural language
    understanding and our specialized audio processing capabilities.
    """
    
    def __init__(self, gemini_client=None):
        self.audio_agent = AudioAgent()
        self.gemini_client = gemini_client
        self.conversation_history = []
        
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
    
    async def process_audio_request(self, user_message: str, audio_file: str = None) -> Dict[str, Any]:
        """
        Process an audio request using Gemini + Audio Agent
        
        Args:
            user_message: User's natural language request
            audio_file: Optional audio file path
            
        Returns:
            Processed request with operations and Gemini insights
        """
        logger.info(f"Processing audio request: {user_message}")
        
        # Add to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Step 1: Use Audio Agent to parse the request
        parsed_operations = self.audio_agent.parse_natural_language(user_message)
        
        # Step 2: Generate optimized operation chain
        operation_chain = self.audio_agent.generate_operation_chain(
            parsed_operations["operations"]
        )
        
        # Step 3: Create processing request
        processing_request = self.audio_agent.create_processing_request(
            operation_chain, audio_file
        )
        
        # Step 4: Enhance with Gemini insights (if available)
        if self.gemini_client:
            gemini_insights = await self._get_gemini_insights(user_message, parsed_operations)
            processing_request["gemini_insights"] = gemini_insights
        
        # Step 5: Add conversation context
        processing_request["conversation_context"] = {
            "user_message": user_message,
            "parsed_confidence": parsed_operations["confidence"],
            "conversation_history_length": len(self.conversation_history)
        }
        
        # Add response to conversation history
        self.conversation_history.append({
            "role": "assistant",
            "content": f"Processed audio request with {len(operation_chain)} operations",
            "timestamp": datetime.now().isoformat(),
            "operations": operation_chain
        })
        
        logger.info(f"Generated processing request: {json.dumps(processing_request, indent=2)}")
        return processing_request
    
    async def _get_gemini_insights(self, user_message: str, parsed_operations: Dict) -> Dict[str, Any]:
        """
        Get additional insights from Gemini about the audio request
        
        Args:
            user_message: Original user message
            parsed_operations: Parsed operations from Audio Agent
            
        Returns:
            Gemini insights and suggestions
        """
        if not self.gemini_client:
            return {"error": "Gemini client not available"}
        
        try:
            # Create enhanced prompt for Gemini
            enhanced_prompt = f"""
User Request: "{user_message}"

Parsed Audio Operations: {json.dumps(parsed_operations, indent=2)}

Please provide:
1. Confirmation that the operations match the user's intent
2. Any additional suggestions or optimizations
3. Potential issues or considerations
4. Professional audio processing advice

Respond in a helpful, professional manner.
"""
            
            # Get Gemini response
            response = await self._call_gemini(enhanced_prompt)
            
            return {
                "analysis": response,
                "timestamp": datetime.now().isoformat(),
                "model": "gemini-pro"
            }
            
        except Exception as e:
            logger.error(f"Error getting Gemini insights: {e}")
            return {"error": str(e)}
    
    async def _call_gemini(self, prompt: str) -> str:
        """
        Call Gemini API (placeholder - implement with actual Gemini client)
        
        Args:
            prompt: Prompt to send to Gemini
            
        Returns:
            Gemini's response
        """
        # This is a placeholder - you would implement actual Gemini API calls here
        # For now, we'll simulate a response
        
        await asyncio.sleep(0.1)  # Simulate API call
        
        return f"""
Audio Processing Analysis:

✅ Operations correctly identified: {len(prompt.split()) > 50}
✅ Parameters extracted appropriately
✅ Operation order optimized for best results

Suggestions:
- Consider adding fade-in/fade-out for smoother transitions
- Monitor audio quality during processing
- Test with a small sample first

The parsed operations appear to match your request well. The system will process them in the optimal order for best results.
"""
    
    def get_supported_operations_help(self) -> str:
        """Get help text for supported operations"""
        return self.audio_agent.get_help_text()
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get summary of the conversation"""
        return {
            "total_messages": len(self.conversation_history),
            "user_messages": len([m for m in self.conversation_history if m["role"] == "user"]),
            "assistant_messages": len([m for m in self.conversation_history if m["role"] == "assistant"]),
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
        logger.info("Conversation history cleared")

# Example usage and testing
async def test_gemini_integration():
    """Test the Gemini Audio Integration"""
    print("🎵 Testing Gemini Audio Integration\n")
    
    # Create integration instance
    integration = GeminiAudioIntegration()
    
    # Test requests
    test_requests = [
        "I want to cut my podcast from 2 minutes to 10 minutes and add some reverb",
        "Can you normalize my audio and boost the bass?",
        "I need to remove background noise and convert to MP3 format"
    ]
    
    for request in test_requests:
        print(f"User Request: {request}")
        print("-" * 60)
        
        # Process request
        result = await integration.process_audio_request(request)
        
        print(f"Parsed Operations: {len(result['operations'])}")
        for op in result['operations']:
            print(f"  • {op['name']}: {op['parameters']}")
        
        print(f"Confidence: {result['conversation_context']['parsed_confidence']:.2f}")
        print(f"Gemini Insights: {result.get('gemini_insights', {}).get('analysis', 'N/A')[:100]}...")
        print("=" * 60)
    
    # Show conversation summary
    summary = integration.get_conversation_summary()
    print(f"\nConversation Summary:")
    print(f"Total Messages: {summary['total_messages']}")
    print(f"Duration: {summary['conversation_duration']}")
    
    # Show help
    print("\n" + integration.get_supported_operations_help())

if __name__ == "__main__":
    # Run test
    asyncio.run(test_gemini_integration())

