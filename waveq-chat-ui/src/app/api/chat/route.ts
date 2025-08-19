import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Gemini AI - try to get API key from request headers first, then from env
export async function POST(request: NextRequest) {
  try {
    const { message, audioFile, chatHistory } = await request.json()
    
    // Get API key from request headers (sent from frontend)
    const apiKey = request.headers.get('x-gemini-api-key') || process.env.GEMINI_API_KEY || ''
    
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'מפתח API חסר',
          fallback: 'אנא הגדר את מפתח ה-API בדף ההגדרות'
        },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(request: NextRequest) {
  try {
    const { message, audioFile, chatHistory } = await request.json()

    // Create a chat model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    // Build context based on whether there's an audio file
    let context = ''
    if (audioFile) {
      context = `המשתמש שלח קובץ אודיו בשם: ${audioFile}. 
      אתה מומחה בעיבוד אודיו ויכול לעזור עם:
      - ניתוח איכות האודיו
      - המלצות לעריכה
      - הסברים על טכניקות עיבוד
      - פתרון בעיות אודיו
      
      הודעה מהמשתמש: ${message}`
    } else {
      context = `אתה מומחה בעיבוד אודיו ויכול לעזור עם:
      - טכניקות עיבוד אודיו
      - המלצות על כלים
      - הסברים על מושגים טכניים
      - פתרון בעיות
      
      הודעה מהמשתמש: ${message}`
    }

    // Generate response
    const result = await model.generateContent(context)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      success: true,
      message: text,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Gemini API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'שגיאה בתקשורת עם Gemini AI',
        fallback: 'אני מצטער, יש בעיה בתקשורת. אני כאן כדי לעזור עם עיבוד אודיו!'
      },
      { status: 500 }
    )
  }
}
