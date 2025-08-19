#!/usr/bin/env python3
"""
WaveQ Audio MCP Server System Test Script
סקריפט בדיקה למערכת עיבוד אודיו MCP
"""

import asyncio
import aiohttp
import json
import time
import os
from pathlib import Path

class WaveQSystemTester:
    def __init__(self):
        self.api_base_url = "http://localhost:8002"
        self.dashboard_url = "http://localhost:8001"
        self.test_results = {}
        
    async def test_api_gateway_health(self):
        """בדיקת בריאות ה-API Gateway"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_base_url}/api/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        self.test_results["api_health"] = {
                            "status": "PASS",
                            "data": data
                        }
                        print("✅ API Gateway Health Check: PASS")
                        return True
                    else:
                        self.test_results["api_health"] = {
                            "status": "FAIL",
                            "error": f"HTTP {response.status}"
                        }
                        print(f"❌ API Gateway Health Check: FAIL (HTTP {response.status})")
                        return False
        except Exception as e:
            self.test_results["api_health"] = {
                "status": "ERROR",
                "error": str(e)
            }
            print(f"❌ API Gateway Health Check: ERROR - {e}")
            return False
    
    async def test_supported_operations(self):
        """בדיקת רשימת הפעולות הנתמכות"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_base_url}/api/audio/operations") as response:
                    if response.status == 200:
                        data = await response.json()
                        self.test_results["supported_operations"] = {
                            "status": "PASS",
                            "count": data.get("total_operations", 0),
                            "operations": list(data.get("operations", {}).keys())
                        }
                        print(f"✅ Supported Operations: PASS ({data.get('total_operations', 0)} operations)")
                        return True
                    else:
                        self.test_results["supported_operations"] = {
                            "status": "FAIL",
                            "error": f"HTTP {response.status}"
                        }
                        print(f"❌ Supported Operations: FAIL (HTTP {response.status})")
                        return False
        except Exception as e:
            self.test_results["supported_operations"] = {
                "status": "ERROR",
                "error": str(e)
            }
            print(f"❌ Supported Operations: ERROR - {e}")
            return False
    
    async def test_web_dashboard(self):
        """בדיקת זמינות ה-Web Dashboard"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.dashboard_url) as response:
                    if response.status == 200:
                        self.test_results["web_dashboard"] = {
                            "status": "PASS",
                            "status_code": response.status
                        }
                        print("✅ Web Dashboard: PASS")
                        return True
                    else:
                        self.test_results["web_dashboard"] = {
                            "status": "FAIL",
                            "error": f"HTTP {response.status}"
                        }
                        print(f"❌ Web Dashboard: FAIL (HTTP {response.status})")
                        return False
        except Exception as e:
            self.test_results["web_dashboard"] = {
                "status": "ERROR",
                "error": str(e)
            }
            print(f"❌ Web Dashboard: ERROR - {e}")
            return False
    
    async def test_audio_processing_workflow(self):
        """בדיקת זרימת עבודה של עיבוד אודיו"""
        try:
            # Create a test audio file (simple sine wave)
            test_audio_path = await self.create_test_audio()
            
            if not test_audio_path:
                self.test_results["audio_workflow"] = {
                    "status": "SKIP",
                    "error": "Could not create test audio file"
                }
                print("⏭️  Audio Workflow: SKIP (no test audio)")
                return False
            
            # Submit audio processing request
            request_id = await self.submit_audio_request(test_audio_path)
            
            if not request_id:
                self.test_results["audio_workflow"] = {
                    "status": "FAIL",
                    "error": "Could not submit audio request"
                }
                print("❌ Audio Workflow: FAIL (could not submit request)")
                return False
            
            # Check processing status
            status = await self.check_processing_status(request_id)
            
            if status:
                self.test_results["audio_workflow"] = {
                    "status": "PASS",
                    "request_id": request_id,
                    "status_check": status
                }
                print(f"✅ Audio Workflow: PASS (Request ID: {request_id})")
                return True
            else:
                self.test_results["audio_workflow"] = {
                    "status": "FAIL",
                    "error": "Processing status check failed"
                }
                print("❌ Audio Workflow: FAIL (status check failed)")
                return False
                
        except Exception as e:
            self.test_results["audio_workflow"] = {
                "status": "ERROR",
                "error": str(e)
            }
            print(f"❌ Audio Workflow: ERROR - {e}")
            return False
    
    async def create_test_audio(self):
        """יצירת קובץ אודיו בדיקה פשוט"""
        try:
            # Try to create a simple test audio file using Python
            import numpy as np
            import soundfile as sf
            
            # Generate a simple sine wave
            sample_rate = 44100
            duration = 2  # seconds
            frequency = 440  # Hz (A note)
            
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            audio_data = np.sin(2 * np.pi * frequency * t)
            
            # Save as WAV file
            test_audio_path = "test_audio.wav"
            sf.write(test_audio_path, audio_data, sample_rate)
            
            print(f"✅ Created test audio file: {test_audio_path}")
            return test_audio_path
            
        except ImportError:
            print("⚠️  Could not create test audio (missing libraries)")
            return None
        except Exception as e:
            print(f"❌ Error creating test audio: {e}")
            return None
    
    async def submit_audio_request(self, audio_file_path):
        """שליחת בקשה לעיבוד אודיו"""
        try:
            # Check if file exists
            if not os.path.exists(audio_file_path):
                print(f"❌ Audio file not found: {audio_file_path}")
                return None
            
            # Prepare form data
            data = aiohttp.FormData()
            data.add_field('audio_file', 
                          open(audio_file_path, 'rb'),
                          filename='test_audio.wav',
                          content_type='audio/wav')
            data.add_field('operation', 'normalize')
            data.add_field('parameters', '{"target_db": -20}')
            data.add_field('client_id', 'test_client')
            data.add_field('priority', 'low')
            data.add_field('description', 'Test audio processing')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.api_base_url}/api/audio/edit", data=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        request_id = result.get('request_id')
                        print(f"✅ Audio request submitted: {request_id}")
                        return request_id
                    else:
                        print(f"❌ Failed to submit audio request: HTTP {response.status}")
                        return None
                        
        except Exception as e:
            print(f"❌ Error submitting audio request: {e}")
            return None
    
    async def check_processing_status(self, request_id):
        """בדיקת סטטוס עיבוד"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.api_base_url}/api/audio/status/{request_id}") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Status check successful: {data.get('status')}")
                        return data
                    else:
                        print(f"❌ Status check failed: HTTP {response.status}")
                        return None
        except Exception as e:
            print(f"❌ Error checking status: {e}")
            return None
    
    async def run_all_tests(self):
        """הפעלת כל הבדיקות"""
        print("🧪 Starting WaveQ Audio MCP System Tests...")
        print("=" * 50)
        
        tests = [
            ("API Gateway Health", self.test_api_gateway_health),
            ("Supported Operations", self.test_supported_operations),
            ("Web Dashboard", self.test_web_dashboard),
            ("Audio Processing Workflow", self.test_audio_processing_workflow)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🔍 Running: {test_name}")
            print("-" * 30)
            
            try:
                result = await test_func()
                if result:
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test_name} failed with exception: {e}")
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Print detailed results
        print("\n📋 DETAILED RESULTS")
        print("-" * 30)
        for test_name, result in self.test_results.items():
            status = result.get('status', 'UNKNOWN')
            status_emoji = {
                'PASS': '✅',
                'FAIL': '❌',
                'ERROR': '💥',
                'SKIP': '⏭️'
            }.get(status, '❓')
            
            print(f"{status_emoji} {test_name}: {status}")
            if 'error' in result:
                print(f"   Error: {result['error']}")
            if 'data' in result:
                print(f"   Data: {json.dumps(result['data'], indent=2)}")
        
        return passed == total
    
    def cleanup(self):
        """ניקוי קבצי בדיקה"""
        try:
            if os.path.exists("test_audio.wav"):
                os.remove("test_audio.wav")
                print("🧹 Cleaned up test audio file")
        except Exception as e:
            print(f"⚠️  Warning: Could not cleanup test files: {e}")

async def main():
    """פונקציה ראשית"""
    tester = WaveQSystemTester()
    
    try:
        success = await tester.run_all_tests()
        
        if success:
            print("\n🎉 All tests passed! The system is working correctly.")
        else:
            print("\n⚠️  Some tests failed. Please check the system configuration.")
        
    except KeyboardInterrupt:
        print("\n⏹️  Testing interrupted by user")
    except Exception as e:
        print(f"\n💥 Testing failed with unexpected error: {e}")
    finally:
        tester.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
