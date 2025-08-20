# WaveQ Audio System - Secure Startup Script
# סקריפט הפעלה מאובטח למערכת עיבוד אודיו

Write-Host "🎵 WaveQ Audio System - Secure Startup" -ForegroundColor Cyan
Write-Host "מערכת עיבוד אודיו מאובטחת" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Gray
Write-Host ""

# Check if config.env exists
if (-not (Test-Path "config.env")) {
    Write-Host "❌ Error: config.env not found!" -ForegroundColor Red
    Write-Host "Please copy config.env.example to config.env and configure it" -ForegroundColor Yellow
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Error: Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

# Activate virtual environment
Write-Host "🔧 Activating Python virtual environment..." -ForegroundColor Green
& ".\venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "🎯 Secure Startup Menu:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray
Write-Host "1. 🎨 Start Frontend Only (Chat UI)" -ForegroundColor White
Write-Host "2. 🔧 Start Backend Only (FastAPI)" -ForegroundColor White
Write-Host "3. 🚀 Start Both Services" -ForegroundColor White
Write-Host "4. 🌐 Open in Browser" -ForegroundColor White
Write-Host "5. 🛑 Stop All Services" -ForegroundColor White
Write-Host "6. 📊 Check System Status" -ForegroundColor White
Write-Host "7. ❌ Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-7)"

if ($choice -eq "1") {
    Write-Host "🎨 Starting Frontend Only..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\WaveQ\WaveQ- Api Server\waveq-chat-ui'; npm run dev"
    Write-Host "✅ Frontend started in new window" -ForegroundColor Green
}

if ($choice -eq "2") {
    Write-Host "🔧 Starting Backend Only..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\WaveQ\WaveQ- Api Server'; .\venv\Scripts\Activate.ps1; python main.py"
    Write-Host "✅ Backend started in new window" -ForegroundColor Green
}

if ($choice -eq "3") {
    Write-Host "🚀 Starting Both Services..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\WaveQ\WaveQ- Api Server'; .\venv\Scripts\Activate.ps1; python main.py"
    Start-Sleep -Seconds 3
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\WaveQ\WaveQ- Api Server\waveq-chat-ui'; npm run dev"
    Write-Host "✅ Both services started in new windows" -ForegroundColor Green
}

if ($choice -eq "4") {
    Write-Host "🌐 Opening services in browser..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
    Start-Process "http://localhost:8001"
    Write-Host "✅ Services opened in browser" -ForegroundColor Green
}

if ($choice -eq "5") {
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*python*"} | Stop-Process -Force
    Write-Host "✅ All services stopped" -ForegroundColor Green
}

if ($choice -eq "6") {
    Write-Host "📊 Checking system status..." -ForegroundColor Blue
    
    # Check if services are running
    $nodeProcesses = Get-Process | Where-Object {$_.ProcessName -like "*node*"}
    $pythonProcesses = Get-Process | Where-Object {$_.ProcessName -like "*python*"}
    
    Write-Host "Node.js processes: $($nodeProcesses.Count)" -ForegroundColor White
    Write-Host "Python processes: $($pythonProcesses.Count)" -ForegroundColor White
    
    # Check ports
    $port3000 = netstat -an | Select-String ":3000"
    $port8001 = netstat -an | Select-String ":8001"
    
    if ($port3000) {
        Write-Host "✅ Port 3000 (Frontend): Active" -ForegroundColor Green
    } else {
        Write-Host "❌ Port 3000 (Frontend): Inactive" -ForegroundColor Red
    }
    
    if ($port8001) {
        Write-Host "✅ Port 8001 (Backend): Active" -ForegroundColor Green
    } else {
        Write-Host "❌ Port 8001 (Backend): Inactive" -ForegroundColor Red
    }
}

if ($choice -eq "7") {
    Write-Host "👋 Goodbye!" -ForegroundColor Green
    exit
}

if ($choice -ne "1" -and $choice -ne "2" -and $choice -ne "3" -and $choice -ne "4" -and $choice -ne "5" -and $choice -ne "6" -and $choice -ne "7") {
    Write-Host "❌ Invalid choice. Please enter 1-7." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
