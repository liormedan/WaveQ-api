# 🎵 WaveQ Audio System - Interactive Service Manager

## 📋 Overview
מנהל שירותים אינטראקטיבי למערכת עיבוד אודיו WaveQ עם תפריט קל לשימוש.

## 🚀 Quick Start

### הפעלה מהירה:
```powershell
.\start_menu.ps1
```

## 🎯 Main Menu Options

### 1. 🎨 Start Frontend Only (Chat UI)
- מפעיל רק את ממשק הצ'אט (Next.js)
- פורט: 3000
- גישה: http://localhost:3000

### 2. 🔧 Start Backend Only (FastAPI)
- מפעיל רק את שרת הבקאנד (Python FastAPI)
- פורט: 8001
- גישה: http://localhost:8001
- תיעוד API: http://localhost:8001/docs

### 3. 🚀 Start Both Services
- מפעיל את שני השירותים במקביל
- פרונט + בקאנד
- אופטימלי לפיתוח מלא

### 4. 🔄 Update from Git
- מושך עדכונים מהמאגר
- מעדכן תלויות Python ו-Node.js
- שימושי לעדכונים שוטפים

### 5. 📋 Show Service Logs
- מציג לוגים בזמן אמת
- מעקב אחר פעילות השירותים
- דיבוג בעיות

### 6. 🌐 Open in Browser
- פותח את השירותים הפעילים בדפדפן
- גישה מהירה לממשקים

### 7. 🛑 Stop All Services
- עוצר את כל השירותים
- ניקוי תהליכים
- הכנה לפעלה מחדש

### 8. ❌ Exit
- עוצר את כל השירותים
- יוצא מהמערכת
- ניקוי מלא

## 🔧 Features

### ✅ יתרונות המערכת:
- **טרמינל אחד בלבד** - לא נפתחים חלונות חדשים
- **ניהול מלא** - הפעלה, עצירה, וניטור
- **תפריט אינטראקטיבי** - קל לשימוש
- **צבעים ויזואליים** - זיהוי מהיר של סטטוס
- **לוגים בזמן אמת** - מעקב אחר פעילות
- **עדכון אוטומטי** - תמיכה ב-Git
- **ניהול תלויות** - התקנה אוטומטית

### 🎨 ממשק משתמש:
- תפריט ברור עם מספרים
- צבעים שונים לכל סוג פעולה
- סטטוס שירותים בזמן אמת
- הודעות ברורות בעברית

## 📁 File Structure

```
WaveQ- Api Server/
├── start_menu.ps1          # קובץ הפעלה ראשי
├── README_START_MENU.md    # מדריך זה
├── main.py                 # שרת בקאנד Python
├── waveq-chat-ui/         # ממשק פרונט Next.js
├── requirements.txt        # תלויות Python
└── venv/                  # סביבה וירטואלית Python
```

## 🛠️ Requirements

### System Requirements:
- Windows 10/11
- PowerShell 5.1+
- Python 3.8+
- Node.js 16+
- Git (אופציונלי)

### Dependencies:
- Python packages (מותקן אוטומטית)
- Node.js packages (מותקן אוטומטית)

## 🔍 Troubleshooting

### בעיות נפוצות:

#### ❌ "Virtual environment not found"
- המערכת תיצור סביבה וירטואלית אוטומטית
- אין צורך בפעולה נוספת

#### ❌ "Port already in use"
- השתמש באפשרות 7 לעצירת כל השירותים
- הפעל מחדש את השירות הרצוי

#### ❌ "Dependencies not found"
- המערכת תתקין תלויות אוטומטית
- המתן לסיום ההתקנה

#### ❌ "Service not responding"
- בדוק שהשירות הופעל בהצלחה
- השתמש באפשרות 5 לצפייה בלוגים

## 🎵 Usage Examples

### פיתוח מהיר:
```powershell
.\start_menu.ps1
# בחר 3 - Start Both Services
# המתן להפעלה
# בחר 6 - Open in Browser
```

### בדיקת בקאנד בלבד:
```powershell
.\start_menu.ps1
# בחר 2 - Start Backend Only
# בדוק ב: http://localhost:8001/docs
```

### עדכון מהמאגר:
```powershell
.\start_menu.ps1
# בחר 4 - Update from Git
# המתן לסיום העדכון
```

## 🔒 Security Notes

- המערכת פועלת רק על localhost
- אין גישה חיצונית
- תלויות מותקנות מהמקורות הרשמיים
- סביבה וירטואלית מבודדת

## 📞 Support

### בעיות טכניות:
1. בדוק שהמערכת עומדת בדרישות
2. השתמש באפשרות 5 לצפייה בלוגים
3. עצור והפעל מחדש את השירותים
4. בדוק שהפורטים פנויים

### מידע נוסף:
- ראה README.md הראשי
- בדוק קבצי הקונפיגורציה
- עיין בתיעוד ה-API

---

**🎵 WaveQ Audio System - מערכת עיבוד אודיו מתקדמת**
