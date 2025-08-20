@echo off
chcp 65001 >nul
title WaveQ Audio System - Start Both Services

echo 🎵 WaveQ Audio System - Starting Both Services
echo מערכת עיבוד אודיו - הפעלת הבקאנד והפרונט במקביל
echo.

echo 🔧 Activating Python virtual environment...
call "venv\Scripts\activate.bat"

echo 🚀 Starting Backend Server (Port 8001)...
start "Backend Server" powershell -NoExit -Command "cd 'C:\WaveQ\WaveQ- Api Server'; .\venv\Scripts\Activate.ps1; python main.py"

echo 🚀 Starting Frontend Server (Port 3000)...
start "Frontend Server" powershell -NoExit -Command "cd 'C:\WaveQ\WaveQ- Api Server\waveq-chat-ui'; npm run dev"

echo.
echo ⏳ Waiting for servers to start...
timeout /t 10 /nobreak >nul

echo.
echo ✅ Both services started!
echo.
echo 🌐 Access Information:
echo Frontend (Next.js):    http://localhost:3000
echo Backend (FastAPI):     http://localhost:8001
echo.

set /p open_browsers="Open both services in browser? (y/n): "
if /i "%open_browsers%"=="y" (
    start http://localhost:3000
    start http://localhost:8001
    echo 🌐 Both services opened in browser
)

echo.
echo 🎵 Services are running in separate windows
echo Close those windows to stop the services
echo.
pause
