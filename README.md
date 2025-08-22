# WaveQ Audio API Manager

מערכת מתקדמת לניהול בקשות עריכת אודיו עם תמיכה ב-MCP (Model Context Protocol).

## 🎯 סקירה כללית

WaveQ Audio API Manager היא מערכת מקיפה המאפשרת:
- **עיבוד אודיו מתקדם** - 13 פעולות עריכה שונות
- **MCP Server** - שרת עיבוד אודיו אסינכרוני
- **Web Dashboard** - ממשק ניהול מתקדם
- **Chat UI** - ממשק צ'אט מבוסס Next.js

## 🏗️ ארכיטקטורת המערכת

```
Chat UI → MQTT → MCP Server → Audio Processing
                ↓
            Web Dashboard
```

### רכיבי המערכת:

1. **MCP Audio Server** (`mcp_audio_server.py`)
   - מעבד בקשות עריכת אודיו
   - תקשורת אסינכרונית דרך MQTT
   - תמיכה ב-13 פעולות עריכה

2. **MQTT Broker** (Mosquitto)
   - תקשורת בין הרכיבים
   - תמיכה ב-WebSocket
   - ניהול תורים ובקשות

3. **Web Dashboard** (`main.py`)
   - ממשק ניהול מתקדם
   - מעקב אחר בקשות ועיבוד
   - אנליטיקה וסטטיסטיקות

4. **Chat UI** (`waveq-chat-ui/`)
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
### בניית והפעלת Web Dashboard עם Docker:

```bash
# בניית התמונה
docker build -f Dockerfile.dashboard -t waveq-dashboard .

# הפעלת הקונטיינר
docker run -p 8001:8001 waveq-dashboard
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

# ברירת המחדל של המערכת חושפת גם חיבור MQTT רגיל (1883)
# וגם חיבור WebSocket (9001) ללקוחות חיצוניים כגון ה-Chat UI.
# ניתן לבדוק את החיבור באמצעות הסקריפט הבא:

```bash
python - <<'PY'
import paho.mqtt.client as mqtt
client = mqtt.Client(transport="websockets")
client.connect("localhost", 9001)
client.disconnect()
print("WebSocket connection to Mosquitto succeeded")
PY
```

# הפעלת MCP Server
python mcp_audio_server.py

# הפעלת Web Dashboard
python main.py

# הפעלת Chat UI (Next.js)
cd waveq-chat-ui
npm install
npm run dev

# ברירת המחדל של ה-Chat UI מתחברת ל-broker דרך WebSocket בכתובת `ws://localhost:9001`.
```

## 🔔 עדכוני סטטוס בזמן אמת

המערכת מספקת עדכוני סטטוס בזמן אמת באמצעות WebSocket.

### נקודת קצה
`ws://<server-host>/ws/requests`

### פורמט הודעה (JSON)

```json
{
  "request_id": "REQ-000001",
  "status": "processing",
  "client_name": "client1",
  "audio_file": "file.wav",
  "edit_type": "noise_reduction",
  "description": "Remove noise",
  "priority": "normal",
  "created_at": "2024-01-01T12:00:00",
  "updated_at": "2024-01-01T12:00:00",
  "processing_time": null,
  "result_file": null,
  "error_message": null
}
```

הדשבורד מתחבר לנקודת קצה זו ומקבל עדכונים על בקשות חדשות ושינויים בסטטוס ללא צורך ברענון ידני של העמוד.

## 🔧 הגדרות וקונפיגורציה

### משתני סביבה:

הקובץ `config.env.example` מכיל את כל משתני הסביבה הנדרשים.

### הגדרות MQTT:

הקובץ `mqtt-config/mosquitto.conf` מכיל את כל הגדרות ה-MQTT Broker.
הערכים הבאים בקובץ הסביבה (`config.env`) מגדירים את פרטי החיבור:

- `MCP_MQTT_BROKER` – שם ה-host של ה-broker
- `MCP_MQTT_PORT` – פורט MQTT רגיל (ברירת מחדל 1883)
- `MCP_MQTT_WS_PORT` – פורט WebSocket ללקוחות חיצוניים (ברירת מחדל 9001)

## 📊 ניטור וניהול

### Web Dashboard:
- גישה דרך: `http://localhost:8001`
- ניהול בקשות עריכת אודיו
- מעקב אחר סטטוס עיבוד
- אנליטיקה וסטטיסטיקות

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
- [Audio Processing with Python](https://librosa.org/)

### דיווח באגים:

אם מצאת באג או בעיה, אנא דווח ב-Issues של הפרויקט.

---

## 📁 מבנה הפרויקט

```
WaveQ-Api-Server/
├── main.py                 # Web Dashboard
├── mcp_audio_server.py     # MCP Audio Processing Server
├── requirements.txt        # Python dependencies
├── docker-compose.yml      # Docker orchestration
├── Dockerfile.mcp          # MCP Server Docker image
├── start_system.ps1        # PowerShell startup script
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

**WaveQ Audio API Manager** - מערכת מתקדמת לעיבוד אודיו עם תמיכה מלאה ב-MCP 🎵✨

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
