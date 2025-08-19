# WaveQ Audio MCP Server System Startup Script
# סקריפט הפעלה למערכת עיבוד אודיו MCP

Write-Host "🎵 WaveQ Audio MCP Server System" -ForegroundColor Cyan
Write-Host "מערכת עיבוד אודיו מתקדמת עם תמיכה ב-n8n" -ForegroundColor Yellow
Write-Host ""

# Check if Docker is running
Write-Host "🔍 בדיקת Docker..." -ForegroundColor Green
try {
    docker version | Out-Null
    Write-Host "✅ Docker פועל" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker לא פועל. אנא הפעל את Docker Desktop" -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
Write-Host "🔍 בדיקת Docker Compose..." -ForegroundColor Green
try {
    docker-compose version | Out-Null
    Write-Host "✅ Docker Compose זמין" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose לא זמין" -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 יצירת תיקיות נדרשות..." -ForegroundColor Green
$directories = @(
    "uploads",
    "processed", 
    "audio-files",
    "logs",
    "mqtt-config",
    "mqtt-data",
    "mqtt-logs"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ נוצרה תיקייה: $dir" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  תיקייה קיימת: $dir" -ForegroundColor Blue
    }
}

# Check if MQTT config exists
if (!(Test-Path "mqtt-config\mosquitto.conf")) {
    Write-Host "❌ קובץ הגדרות MQTT חסר. אנא צור את הקובץ mqtt-config\mosquitto.conf" -ForegroundColor Red
    exit 1
}

# Stop any existing containers
Write-Host "🛑 עצירת קונטיינרים קיימים..." -ForegroundColor Yellow
try {
    docker-compose down
    Write-Host "✅ קונטיינרים נעצרו" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  אין קונטיינרים פעילים" -ForegroundColor Blue
}

# Start the system
Write-Host "🚀 הפעלת המערכת..." -ForegroundColor Green
try {
    docker-compose up -d
    Write-Host "✅ המערכת הופעלה בהצלחה!" -ForegroundColor Green
} catch {
    Write-Host "❌ שגיאה בהפעלת המערכת" -ForegroundColor Red
    Write-Host "פרטי השגיאה:" -ForegroundColor Red
    docker-compose logs
    exit 1
}

# Wait for services to start
Write-Host "⏳ המתנה להפעלת השירותים..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service status
Write-Host "📊 בדיקת סטטוס השירותים..." -ForegroundColor Green
try {
    $status = docker-compose ps
    Write-Host $status -ForegroundColor White
} catch {
    Write-Host "❌ שגיאה בבדיקת סטטוס" -ForegroundColor Red
}

# Display access information
Write-Host ""
Write-Host "🌐 מידע גישה למערכת:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray
Write-Host "Web Dashboard:     http://localhost:8001" -ForegroundColor White
Write-Host "API Gateway:       http://localhost:8002" -ForegroundColor White
Write-Host "API Docs:          http://localhost:8002/docs" -ForegroundColor White
Write-Host "MQTT Broker:       localhost:1883" -ForegroundColor White
Write-Host "MQTT WebSocket:    localhost:9001" -ForegroundColor White
Write-Host ""

# Check if services are responding
Write-Host "🔍 בדיקת זמינות השירותים..." -ForegroundColor Green

# Check API Gateway
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8002/api/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API Gateway זמין" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ API Gateway לא זמין" -ForegroundColor Red
}

# Check Web Dashboard
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Web Dashboard זמין" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Web Dashboard לא זמין" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 פקודות שימושיות:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Gray
Write-Host "צפייה בלוגים:        docker-compose logs -f" -ForegroundColor White
Write-Host "עצירת המערכת:      docker-compose down" -ForegroundColor White
Write-Host "הפעלה מחדש:         docker-compose restart" -ForegroundColor White
Write-Host "סטטוס שירותים:     docker-compose ps" -ForegroundColor White
Write-Host ""

Write-Host "🎵 המערכת מוכנה לשימוש!" -ForegroundColor Green
Write-Host "ניתן כעת לשלוח בקשות עריכת אודיו דרך n8n או ה-API Gateway" -ForegroundColor Yellow
Write-Host ""

# Optional: Open dashboard in browser
$openBrowser = Read-Host "האם לפתוח את ה-Web Dashboard בדפדפן? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "http://localhost:8001"
    Write-Host "🌐 Web Dashboard נפתח בדפדפן" -ForegroundColor Green
}

Write-Host ""
Write-Host "לסיום, לחץ על Ctrl+C או סגור את החלון" -ForegroundColor Gray
Write-Host "המערכת תמשיך לרוץ ברקע" -ForegroundColor Gray

# Keep script running to show logs
try {
    docker-compose logs -f
} catch {
    Write-Host "המערכת פועלת ברקע. השתמש בפקודות למעלה לניהול" -ForegroundColor Blue
}
