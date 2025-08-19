# WaveQ Audio MCP Server System

מערכת מתקדמת לעיבוד קבצי אודיו באמצעות MCP (Model Context Protocol) עם תמיכה מלאה ב-n8n.

## 🎯 סקירה כללית

מערכת WaveQ Audio MCP היא פתרון מקיף לעיבוד קבצי אודיו המשלב:
- **MCP Server** - שרת עיבוד אודיו מתקדם
- **API Gateway** - שער API לקבלת בקשות מ-n8n
- **MQTT Broker** - תקשורת אסינכרונית בין הרכיבים
- **Web Dashboard** - ממשק ניהול מתקדם

## 🏗️ ארכיטקטורת המערכת

```
n8n Workflow → API Gateway → MQTT → MCP Server → Audio Processing
                ↓
            Web Dashboard
```

### רכיבי המערכת:

1. **MCP Audio Server** (`mcp_audio_server.py`)
   - מעבד בקשות עריכת אודיו
   - תומך ב-13 פעולות עריכה שונות
   - תקשורת אסינכרונית דרך MQTT

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
- **Format Conversion** - המרת פורמטים

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

# בדיקת סטטוס
docker-compose ps
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
```

## 📡 שימוש עם n8n

### דוגמה לזרימת עבודה ב-n8n:

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.httpRequest",
      "position": [240, 300],
      "parameters": {
        "method": "POST",
        "url": "http://localhost:8002/api/audio/edit",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "audio_file",
              "value": "={{ $json.audio_file }}",
              "type": "file"
            },
            {
              "name": "operation",
              "value": "normalize",
              "type": "string"
            },
            {
              "name": "parameters",
              "value": "{\"target_db\": -18}",
              "type": "string"
            },
            {
              "name": "client_id",
              "value": "={{ $json.client_id }}",
              "type": "string"
            }
          ]
        }
      }
    }
  ]
}
```

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

```bash
# MCP Server
MCP_MQTT_BROKER=localhost
MCP_MQTT_PORT=1883

# API Gateway
MCP_MQTT_BROKER=localhost
MCP_MQTT_PORT=1883
UPLOAD_DIR=uploads
PROCESSED_DIR=processed
```

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
# בדיקת בריאות MQTT
docker exec waveq-mqtt mosquitto_pub -h localhost -t "test" -m "hello"

# בדיקת API Gateway
curl http://localhost:8002/api/health

# בדיקת MCP Server
docker logs waveq-mcp-server
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

**WaveQ Audio MCP Server** - מערכת מתקדמת לעיבוד אודיו עם תמיכה מלאה ב-n8n 🎵✨
