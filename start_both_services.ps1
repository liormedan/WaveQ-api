# WaveQ Audio System - Start Both Services
# הפעלת הבקאנד והפרונט במקביל

Write-Host "🎵 WaveQ Audio System - Starting Both Services" -ForegroundColor Cyan
Write-Host "מערכת עיבוד אודיו - הפעלת הבקאנד והפרונט במקביל" -ForegroundColor Yellow
Write-Host ""

# Check if virtual environment exists
if (!(Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Virtual environment not found. Creating one..." -ForegroundColor Red
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "🔧 Activating Python virtual environment..." -ForegroundColor Green
& ".\venv\Scripts\Activate.ps1"

# Install Python dependencies if needed
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Green
pip install -r requirements.txt

# Check if Node.js dependencies are installed
Write-Host "🔍 Checking Node.js dependencies..." -ForegroundColor Green
if (!(Test-Path "waveq-chat-ui\node_modules")) {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Green
    Set-Location "waveq-chat-ui"
    npm install
    Set-Location ".."
} else {
    Write-Host "✅ Node.js dependencies already installed" -ForegroundColor Green
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Green
$directories = @(
    "uploads",
    "processed", 
    "audio-files",
    "logs"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "🚀 Starting Backend Server (Python FastAPI)..." -ForegroundColor Green
Write-Host "   Port: 8001" -ForegroundColor White

# Start backend server in background
Start-Job -ScriptBlock {
    Set-Location "C:\WaveQ\WaveQ- Api Server"
    & ".\venv\Scripts\Activate.ps1"
    python main.py
} -Name "BackendServer"

Write-Host "🚀 Starting Frontend Server (Next.js)..." -ForegroundColor Green
Write-Host "   Port: 3000" -ForegroundColor White

# Start frontend server in background
Start-Job -ScriptBlock {
    Set-Location "C:\WaveQ\WaveQ- Api Server\waveq-chat-ui"
    npm run dev
} -Name "FrontendServer"

# Wait a moment for servers to start
Write-Host "⏳ Waiting for servers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if services are running
Write-Host ""
Write-Host "📊 Checking service status..." -ForegroundColor Green

# Check backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:8001" -TimeoutSec 5
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "✅ Backend Server (Port 8001) - RUNNING" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend Server (Port 8001) - NOT RESPONDING" -ForegroundColor Red
}

# Check frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend Server (Port 3000) - RUNNING" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend Server (Port 3000) - NOT RESPONDING" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 Access Information:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray
Write-Host "Frontend (Next.js):    http://localhost:3000" -ForegroundColor White
Write-Host "Backend (FastAPI):     http://localhost:8001" -ForegroundColor White
Write-Host "API Documentation:     http://localhost:8001/docs" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Useful Commands:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray
Write-Host "View Backend Logs:     Get-Job -Name 'BackendServer' | Receive-Job" -ForegroundColor White
Write-Host "View Frontend Logs:    Get-Job -Name 'FrontendServer' | Receive-Job" -ForegroundColor White
Write-Host "Stop All Services:     Stop-Job -Name 'BackendServer','FrontendServer'" -ForegroundColor White
Write-Host "Remove Jobs:           Remove-Job -Name 'BackendServer','FrontendServer'" -ForegroundColor White
Write-Host ""

# Optional: Open browsers
$openBrowsers = Read-Host "Open both services in browser? (y/n)"
if ($openBrowsers -eq "y" -or $openBrowsers -eq "Y") {
    Start-Process "http://localhost:3000"
    Start-Process "http://localhost:8001"
    Write-Host "🌐 Both services opened in browser" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎵 Both services are now running!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Keep script running and show logs
try {
    while ($true) {
        Write-Host "📋 Service Status:" -ForegroundColor Cyan
        Get-Job | Format-Table -AutoSize
        
        Write-Host ""
        Write-Host "Press 'q' to quit, 'b' for backend logs, 'f' for frontend logs, or any other key to refresh status"
        $key = Read-Host
        
        if ($key -eq "q" -or $key -eq "Q") {
            break
        } elseif ($key -eq "b" -or $key -eq "B") {
            Write-Host "📋 Backend Logs:" -ForegroundColor Green
            Get-Job -Name "BackendServer" | Receive-Job
        } elseif ($key -eq "f" -or $key -eq "F") {
            Write-Host "📋 Frontend Logs:" -ForegroundColor Green
            Get-Job -Name "FrontendServer" | Receive-Job
        }
        
        Clear-Host
    }
} catch {
    Write-Host "Script interrupted" -ForegroundColor Red
} finally {
    # Cleanup
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    Stop-Job -Name "BackendServer","FrontendServer" -ErrorAction SilentlyContinue
    Remove-Job -Name "BackendServer","FrontendServer" -ErrorAction SilentlyContinue
    Write-Host "✅ All services stopped" -ForegroundColor Green
}
