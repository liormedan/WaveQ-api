# WaveQ Audio System - Service Manager
# מנהל שירותים למערכת עיבוד אודיו

Write-Host "🎵 WaveQ Audio System - Service Manager" -ForegroundColor Cyan
Write-Host "מנהל שירותים למערכת עיבוד אודיו" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Gray
Write-Host ""

# Activate virtual environment
Write-Host "🔧 Activating Python virtual environment..." -ForegroundColor Green
& ".\venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "🎯 Main Menu:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray
Write-Host "1. 🎨 Start Frontend Only (Chat UI)" -ForegroundColor White
Write-Host "2. 🔧 Start Backend Only (FastAPI)" -ForegroundColor White
Write-Host "3. 🚀 Start Both Services" -ForegroundColor White
Write-Host "4. 🌐 Open in Browser" -ForegroundColor White
Write-Host "5. 🛑 Stop All Services" -ForegroundColor White
Write-Host "6. ❌ Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

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
    Write-Host "👋 Goodbye!" -ForegroundColor Green
    exit
}

if ($choice -ne "1" -and $choice -ne "2" -and $choice -ne "3" -and $choice -ne "4" -and $choice -ne "5" -and $choice -ne "6") {
    Write-Host "❌ Invalid choice. Please enter 1-6." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press Enter to exit..."
Read-Host
