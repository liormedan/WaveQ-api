# WaveQ Audio API Manager

מערכת מתקדמת לניהול בקשות עריכת אודיו מ-n8n עם תמיכה ב-MCP (Model Context Protocol).

## 🎯 סקירה כללית

WaveQ Audio API Manager היא מערכת מקיפה המאפשרת:
- **עיבוד אודיו מתקדם** - 13 פעולות עריכה שונות
- **אינטגרציה עם n8n** - זרימות עבודה אוטומטיות
- **MCP Server** - שרת עיבוד אודיו אסינכרוני
- **API Gateway** - ממשק REST מלא
- **Web Dashboard** - ממשק ניהול מתקדם
- **Chat UI** - ממשק צ'אט מבוסס Next.js

## 🏗️ ארכיטקטורת המערכת

```
Chat UI → API Gateway → MQTT → MCP Server → Audio Processing
n8n Workflow →
                ↓
            Web Dashboard
```

### רכיבי המערכת:

1. **MCP Audio Server** (`mcp_audio_server.py`)
   - מעבד בקשות עריכת אודיו
   - תקשורת אסינכרונית דרך MQTT
   - תמיכה ב-13 פעולות עריכה

2. **API Gateway** (`api_gateway.py`)
   - מקבל בקשות מ-n8n
   - מנהל קבצים ועוקב אחר בקשות
   - ממשק REST API מלא

3. **MQTT Broker** (Mosquitto)
   - תקשורת בין הרכיבים
   - תמיכה ב-WebSocket
   - ניהול תורים ובקשות

4. **Web Dashboard** (`main.py`)
   - ממשק ניהול מתקדם
   - מעקב אחר בקשות ועיבוד
   - אנליטיקה וסטטיסטיקות

5. **Chat UI** (`waveq-chat-ui/`)
   - ממשק Next.js לתקשורת עם המערכת

## 🎵 פעולות עריכת אודיו נתמכות

### פעולות בסיסיות:
- **Trim** - חיתוך אודיו לזמנים ספציפיים
- **Normalize** - נרמול רמת עוצמה
- **Fade In/Out** - אפקטי הופעה והיעלמות
- **Speed Change** - שינוי מהירות השמעה
- **Pitch Change** - שינוי גובה הצליל

### פעולות מתקדמות:
- **Reverb** - הוספת הד
- **Noise Reduction** - הפחתת רעש
- **Equalization** - שוויון תדרים (3-פס)
- **Compression** - דחיסה דינמית
- **Format Conversion** - המרת פורמטים עם שליטה ב-bitrate, sample rate ו-channels

### פעולות מורכבות:
- **Merge** - מיזוג קבצי אודיו
- **Split** - חלוקה לקטעים

## 🚀 התקנה והפעלה

### דרישות מערכת:
- Python 3.11+
- Docker & Docker Compose
- FFmpeg (מותקן אוטומטית ב-Docker)

### התקנה מהירה עם Docker:

```bash
# Clone הפרויקט
git clone <repository-url>
cd WaveQ-Api-Server

# הפעלת המערכת
docker-compose up -d

# או השתמש בסקריפט הפעלה
.\start_system.ps1
```

### התקנה ידנית:

```bash
# יצירת סביבה וירטואלית
python -m venv venv
source venv/bin/activate  # Linux/Mac
# או
venv\Scripts\activate     # Windows

# התקנת תלויות
pip install -r requirements.txt

# הפעלת MQTT Broker (Mosquitto)
# התקן Mosquitto או השתמש ב-Docker

# הפעלת MCP Server
python mcp_audio_server.py

# הפעלת API Gateway
python api_gateway.py

# הפעלת Web Dashboard
python main.py

# הפעלת Chat UI (Next.js)
cd waveq-chat-ui
npm install
npm run dev
```

## 📡 שימוש עם n8n

### דוגמה לזרימת עבודה ב-n8n:

הקובץ `n8n_workflow_example.json` מכיל דוגמה מלאה לזרימת עבודה ב-n8n.

### API Endpoints:

#### 1. שליחת בקשה לעריכת אודיו
```http
POST /api/audio/edit
Content-Type: multipart/form-data

audio_file: [קובץ אודיו]
operation: normalize
parameters: {"target_db": -18}
client_id: client123
priority: high
description: נרמול אודיו לפודקאסט
```

#### 2. בדיקת סטטוס בקשה
```http
GET /api/audio/status/{request_id}
```

#### 3. רשימת כל הבקשות
```http
GET /api/audio/requests?client_id=client123&status=completed
```

#### 4. הורדת אודיו מעובד
```http
GET /api/audio/download/{request_id}
```

#### 5. ביטול בקשה
```http
DELETE /api/audio/requests/{request_id}
```

#### 6. רשימת פעולות נתמכות
```http
GET /api/audio/operations
```

## 🔧 הגדרות וקונפיגורציה

### משתני סביבה:

הקובץ `config.env.example` מכיל את כל משתני הסביבה הנדרשים.

### הגדרות MQTT:

הקובץ `mqtt-config/mosquitto.conf` מכיל את כל הגדרות ה-MQTT Broker.

## 📊 ניטור וניהול

### Web Dashboard:
- גישה דרך: `http://localhost:8001`
- ניהול בקשות עריכת אודיו
- מעקב אחר סטטוס עיבוד
- אנליטיקה וסטטיסטיקות

### API Gateway:
- גישה דרך: `http://localhost:8002`
- תיעוד API אוטומטי: `http://localhost:8002/docs`
- בדיקת בריאות: `http://localhost:8002/api/health`

### MCP Server:
- לוגים מפורטים ב-JSON
- מעקב אחר בקשות ועיבוד
- ניהול זיכרון מטמון

## 🧪 בדיקות ופיתוח

### בדיקת המערכת:

```bash
# הפעלת סקריפט בדיקה
python test_system.py

# או בדיקה ידנית
curl http://localhost:8002/api/health
```

### פיתוח מקומי:

```bash
# הפעלת MQTT בלבד
docker-compose up mqtt-broker -d

# הפעלת שירותים ספציפיים
python mcp_audio_server.py &
python api_gateway.py &
python main.py
```

## 🔒 אבטחה

### API Key

המערכת תומכת באימות מבוסס API Key. להפעלה:

1. ערכו את הקובץ `config.env` והגדירו:
   ```bash
   API_KEY_REQUIRED=true
   API_KEY_HEADER=X-API-Key
   API_KEY=your-secret-key
   ```
2. צרפו לכל בקשה את הכותרת המתאימה:
   ```
   X-API-Key: your-secret-key
   ```

בהיעדר מפתח או במקרה של מפתח שגוי יוחזר סטטוס `401 Unauthorized`.

### הגדרות אבטחה מומלצות:

1. **MQTT Authentication**:
   ```bash
   # יצירת משתמשים
   mosquitto_passwd -c passwd admin
   
   # הגדרת הרשאות
   # ערוך את acl file
   ```

2. **API Security**:
   - הוספת API Keys
   - Rate Limiting
   - CORS Configuration

3. **File Security**:
   - הגבלת סוגי קבצים
   - סריקת וירוסים
   - ניקוי קבצים זמניים

## 📈 ביצועים וקנה מידה

### אופטימיזציות:

1. **Parallel Processing**:
   - עיבוד מקביל של מספר בקשות
   - ניהול תורים חכם

2. **Caching**:
   - Redis לקאשינג
   - זיכרון מטמון לתוצאות

3. **Load Balancing**:
   - מספר מופעי MCP Server
   - Load Balancer ל-API Gateway

### מדדי ביצוע:

- **Throughput**: עד 100 בקשות לדקה
- **Latency**: 2-10 שניות לעיבוד
- **Concurrent Requests**: עד 50 בקשות במקביל

## 🚧 פתרון בעיות

### בעיות נפוצות:

1. **MQTT Connection Failed**:
   ```bash
   # בדיקת MQTT Broker
   docker logs waveq-mqtt
   
   # בדיקת פורטים
   netstat -an | grep 1883
   ```

2. **Audio Processing Errors**:
   ```bash
   # בדיקת לוגי MCP Server
   docker logs waveq-mcp-server
   
   # בדיקת תלויות FFmpeg
   docker exec waveq-mcp-server ffmpeg -version
   ```

3. **File Upload Issues**:
   ```bash
   # בדיקת הרשאות תיקיות
   ls -la uploads/
   
   # בדיקת מקום פנוי
   df -h
   ```

## 🔮 פיתוחים עתידיים

### תכונות מתוכננות:

1. **AI-Powered Audio Enhancement**:
   - שיפור אודיו אוטומטי
   - זיהוי רעשים חכם
   - אופטימיזציה אוטומטית

2. **Advanced Workflows**:
   - שרשורי עיבוד מורכבים
   - תנאים והחלטות אוטומטיות
   - אינטגרציה עם שירותי ענן

3. **Real-time Processing**:
   - עיבוד בזמן אמת
   - סטרימינג אודיו
   - שיתוף פעולה בזמן אמת

4. **Mobile App**:
   - אפליקציה לנייד
   - עיבוד אודיו מהטלפון
   - סנכרון עם המערכת

## 📞 תמיכה וקהילה

### משאבים שימושיים:

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MQTT Protocol](https://mqtt.org/)
- [n8n Documentation](https://docs.n8n.io/)
- [Audio Processing with Python](https://librosa.org/)

### דיווח באגים:

אם מצאת באג או בעיה, אנא דווח ב-Issues של הפרויקט.

---

## 📁 מבנה הפרויקט

```
WaveQ-Api-Server/
├── main.py                 # Web Dashboard
├── mcp_audio_server.py     # MCP Audio Processing Server
├── api_gateway.py          # API Gateway for n8n
├── requirements.txt        # Python dependencies
├── docker-compose.yml      # Docker orchestration
├── Dockerfile.mcp          # MCP Server Docker image
├── Dockerfile.gateway      # API Gateway Docker image
├── start_system.ps1        # PowerShell startup script
├── test_system.py          # System testing script
├── n8n_workflow_example.json # n8n workflow example
├── config.env.example      # Environment configuration
├── mqtt-config/            # MQTT broker configuration
│   └── mosquitto.conf
├── waveq-chat-ui/          # Next.js Chat UI
├── templates/              # HTML templates
│   ├── dashboard.html
│   ├── requests.html
│   ├── clients.html
│   ├── analytics.html
│   └── settings.html
├── static/                 # Static files
└── README_MCP.md          # Detailed MCP documentation
```

## 🎯 דפי המערכת

### 1. Dashboard (`/`)
דף הבית עם סקירה כללית של המערכת, סטטיסטיקות מהירות ומצב השירותים.

### 2. ניהול בקשות (`/requests`)
ממשק לניהול בקשות עריכת אודיו, מעקב אחר סטטוס עיבוד וניהול קבצים.

### 3. ניהול לקוחות (`/clients`)
ניהול בסיס נתונים של לקוחות, מעקב אחר בקשות וסטטיסטיקות שימוש.

### 4. אנליטיקה (`/analytics`)
דוחות מתקדמים, גרפים אינטראקטיביים וניתוח ביצועי המערכת.

### 5. הגדרות מערכת (`/settings`)
הגדרות כלליות, הגדרות עיבוד אודיו, הגדרות API והגדרות אבטחה.

---

**WaveQ Audio API Manager** - מערכת מתקדמת לעיבוד אודיו עם תמיכה מלאה ב-n8n ו-MCP 🎵✨

## 🧪 הפעלת בדיקות

להרצת כל הבדיקות השתמשו ב־pytest:

```bash
pytest
```

## 📑 דוגמאות לבקשות HTTP

### שליחת בקשה לעריכת אודיו

```bash
curl -X POST http://localhost:8002/api/audio/edit \
  -H "X-API-Key: your-secret-key" \
  -F "audio_file=@/path/to/file.wav" \
  -F "operation=trim" \
  -F "parameters={\"start\": 0, \"end\": 5}" \
  -F "client_id=tester"
```
