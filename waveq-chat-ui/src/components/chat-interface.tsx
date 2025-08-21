'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Send, FileAudio, MessageCircle, Bot, User } from 'lucide-react'
import Link from 'next/link'
import { AudioVisualization } from './audio-visualization'
import { CodeCanvas } from './code-canvas'

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
  audioFile?: string
  downloadUrl?: string
  originalAudioFile?: File
  showVisualization?: boolean
  status?: 'uploaded' | 'processed' | 'error'
  code?: string
}

interface ChatInterfaceProps {
  theme?: 'dark' | 'light'
}

export function ChatInterface({ theme = 'light' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  // Initialize messages after component mounts to avoid hydration issues
  useEffect(() => {
    // Try to load saved chat history from localStorage
    const savedMessages = localStorage.getItem('WAVEQ_CHAT_HISTORY')
    
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(messagesWithDates)
      } catch (error) {
        console.error('Error loading chat history:', error)
        // Fallback to default welcome message
        setMessages([
          {
            id: '1',
            text: `שלום! אני Gemini AI, מומחה בעיבוד אודיו. 

🎵 **איך להשתמש במערכת:**

**📎 לעיבוד אודיו:**
1. **העלה קובץ אודיו** - לחץ על כפתור ההעלאה
2. **כתוב הוראות עיבוד** באותה הודעה:
   • "הגבר את העוצמה ב-50%"
   • "חתוך את ה-10 שניות הראשונות" 
   • "הוסף באס ושפר איכות"
   • "הפחת רעש ונרמל"
3. **שלח** - המערכת תעבד ותחזיר קובץ מעובד

**💬 לשאלות כלליות:**
• שאל על טכניקות עיבוד אודיו
• קבל עצות למיקס ומאסטרינג
• למד על כלי עיבוד שונים

**📁 קובצי ייצוא:**
כל הקבצים המעובדים נשמרים בדף הייצואים

איך אוכל לעזור לך היום? 🎧`,
            sender: 'assistant',
            timestamp: new Date()
          }
        ])
      }
    } else {
      // Default welcome message
      setMessages([
        {
          id: '1',
          text: `שלום! אני Gemini AI, מומחה בעיבוד אודיו. 

🎵 **איך להשתמש במערכת:**

**📎 לעיבוד אודיו:**
1. **העלה קובץ אודיו** - לחץ על כפתור ההעלאה
2. **כתוב הוראות עיבוד** באותה הודעה:
   • "הגבר את העוצמה ב-50%"
   • "חתוך את ה-10 שניות הראשונות" 
   • "הוסף באס ושפר איכות"
   • "הפחת רעש ונרמל"
3. **שלח** - המערכת תעבד ותחזיר קובץ מעובד

**💬 לשאלות כלליות:**
• שאל על טכניקות עיבוד אודיו
• קבל עצות למיקס ומאסטרינג
• למד על כלי עיבוד שונים

**📁 קובצי ייצוא:**
כל הקבצים המעובדים נשמרים בדף הייצואים

איך אוכל לעזור לך היום? 🎧`,
          sender: 'assistant',
          timestamp: new Date()
        }
      ])
    }
  }, [])
  const [inputText, setInputText] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Function to analyze audio file and provide insights
  const analyzeAudioFile = async (file: File) => {
    const fileSize = formatFileSize(file.size)
    const fileType = file.type || 'audio/mp3'
    const fileName = file.name
    
    // Create audio context to analyze the file
    const arrayBuffer = await file.arrayBuffer()
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const duration = audioBuffer.duration
      const sampleRate = audioBuffer.sampleRate
      const numberOfChannels = audioBuffer.numberOfChannels
      
      // Analyze audio characteristics
      const channelData = audioBuffer.getChannelData(0) // Get first channel
      const length = channelData.length
      
      // Calculate RMS (Root Mean Square) for volume analysis
      let rms = 0
      let peak = 0
      let zeroCrossings = 0
      
      for (let i = 0; i < length; i++) {
        const sample = Math.abs(channelData[i])
        rms += sample * sample
        if (sample > peak) peak = sample
        if (i > 0 && ((channelData[i] >= 0) !== (channelData[i-1] >= 0))) {
          zeroCrossings++
        }
      }
      rms = Math.sqrt(rms / length)
      
      // Determine quality based on sample rate and bit depth
      let quality = 'בינונית'
      if (sampleRate >= 48000) quality = 'גבוהה מאוד'
      else if (sampleRate >= 44100) quality = 'גבוהה'
      else if (sampleRate >= 22050) quality = 'בינונית'
      else quality = 'נמוכה'
      
      // Generate detailed summary based on analysis
      let summary = ''
      
      // Volume analysis
      if (rms < 0.05) summary = '🔇 הקובץ שקט מאוד - דורש הגברת עוצמה משמעותית'
      else if (rms < 0.1) summary = '🔈 הקובץ שקט יחסית - מומלץ הגברת עוצמה'
      else if (rms < 0.3) summary = '🔉 הקובץ בעוצמה נמוכה-בינונית - ייתכן שצריך הגברה קלה'
      else if (rms < 0.7) summary = '🔊 הקובץ מאוזן היטב מבחינת עוצמה - איכות טובה'
      else if (rms < 0.9) summary = '🔊 הקובץ רם - ייתכן שצריך הפחתה קלה'
      else summary = '🔊 הקובץ רם מאוד - דורש הפחתת עוצמה'
      
      // Peak analysis
      if (peak > 0.98) summary += '\n⚠️ יש שיאים גבוהים מאוד שעלולים לגרום לעיוות חמור'
      else if (peak > 0.95) summary += '\n⚠️ יש שיאים גבוהים שעלולים לגרום לעיוות'
      else if (peak > 0.9) summary += '\n⚠️ יש שיאים גבוהים - מומלץ הגבלה'
      else summary += '\n✅ אין שיאים בעייתיים - רמת עוצמה בטוחה'
      
      // Channel analysis
      if (numberOfChannels === 1) summary += '\n📻 קובץ מונו (ערוץ אחד) - איכות בסיסית'
      else summary += '\n🎧 קובץ סטריאו (שני ערוצים) - איכות מקצועית'
      
      // Sample rate analysis
      if (sampleRate >= 48000) summary += '\n🎯 תדר דגימה גבוה מאוד - איכות מקצועית'
      else if (sampleRate >= 44100) summary += '\n🎯 תדר דגימה סטנדרטי - איכות טובה'
      else if (sampleRate >= 22050) summary += '\n🎯 תדר דגימה נמוך - איכות בסיסית'
      else summary += '\n🎯 תדר דגימה נמוך מאוד - איכות ירודה'
      
      // Generate detailed recommendations
      let recommendations = ''
      
      // Volume recommendations
      if (rms < 0.05) recommendations += '🔊 **הגברת עוצמה משמעותית** - הקובץ שקט מדי\n'
      else if (rms < 0.1) recommendations += '🔊 **הגברת עוצמה** - הקובץ שקט יחסית\n'
      else if (rms > 0.9) recommendations += '🔊 **הפחתת עוצמה** - הקובץ רם מדי\n'
      
      // Peak recommendations
      if (peak > 0.98) recommendations += '⚠️ **הגבלת שיאים דחופה** - מניעת עיוות\n'
      else if (peak > 0.95) recommendations += '⚠️ **הגבלת שיאים** - מניעת עיוות\n'
      else if (peak > 0.9) recommendations += '⚠️ **הגבלת שיאים קלה** - שיפור איכות\n'
      
      // Quality recommendations
      if (sampleRate < 22050) recommendations += '🎯 **שדרוג איכות דחוף** - תדר דגימה נמוך מדי\n'
      else if (sampleRate < 44100) recommendations += '🎯 **שדרוג איכות** - תדר דגימה נמוך\n'
      
      // Channel recommendations
      if (numberOfChannels === 1) recommendations += '📻 **המרה לסטריאו** - שיפור איכות (אופציונלי)\n'
      
      // General recommendations
      recommendations += '🎵 **עיבוד כללי מומלץ:**\n'
      recommendations += '• נרמול עוצמה (Normalize)\n'
      recommendations += '• הפחתת רעש (Noise Reduction)\n'
      recommendations += '• שיפור איזון תדרים (EQ)\n'
      
      if (!recommendations.includes('🔊') && !recommendations.includes('⚠️') && !recommendations.includes('🎯')) {
        recommendations = '✅ **הקובץ באיכות טובה מאוד!**\n'
        recommendations += '• אין צורך בעיבוד דחוף\n'
        recommendations += '• ניתן לשפר מעט עם עיבוד עדין'
      }
      
      // Generate smart quick actions based on analysis
      let quickActions = ''
      
      // Priority actions based on analysis
      if (rms < 0.05) quickActions += '🚨 **פעולות דחופות:**\n'
      else if (rms < 0.1) quickActions += '🔊 **פעולות מומלצות:**\n'
      else quickActions += '🎵 **פעולות לשיפור:**\n'
      
      // Volume actions
      if (rms < 0.05) quickActions += '• `הגבר את העוצמה ב-80%`\n'
      else if (rms < 0.1) quickActions += '• `הגבר את העוצמה ב-50%`\n'
      else if (rms > 0.9) quickActions += '• `הפחת את העוצמה ב-30%`\n'
      
      // Peak actions
      if (peak > 0.98) quickActions += '• `הגבל שיאים דחוף ונרמל`\n'
      else if (peak > 0.95) quickActions += '• `הגבל שיאים ונרמל`\n'
      else if (peak > 0.9) quickActions += '• `הגבל שיאים קל`\n'
      
      // Quality actions
      if (sampleRate < 22050) quickActions += '• `שדרג איכות דחוף ל-44.1kHz`\n'
      else if (sampleRate < 44100) quickActions += '• `שדרג איכות ל-48kHz`\n'
      
      // General improvement actions
      quickActions += '• `הפחת רעש ונרמל עוצמה`\n'
      quickActions += '• `שפר איזון תדרים (EQ)`\n'
      quickActions += '• `הוסף באס ושפר איכות כללית`\n'
      
      return {
        summary,
        fileSize,
        fileType: fileType.split('/')[1]?.toUpperCase() || 'MP3',
        quality,
        duration: formatDuration(duration),
        recommendations,
        quickActions
      }
      
    } catch (error) {
      // Fallback analysis if audio decoding fails
      return {
        summary: 'לא ניתן לנתח את הקובץ - ייתכן שהוא פגום או בפורמט לא נתמך',
        fileSize,
        fileType: fileType.split('/')[1]?.toUpperCase() || 'MP3',
        quality: 'לא ידוע',
        duration: 'לא ידוע',
        recommendations: '• בדוק שהקובץ תקין\n• נסה קובץ בפורמט אחר',
        quickActions: '• `המר לפורמט MP3`\n• `בדוק תקינות הקובץ`'
      }
    } finally {
      audioContext.close()
    }
  }

  // Helper function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Helper function to save messages to localStorage (without File objects)
  const saveMessagesToStorage = (messagesToSave: ChatMessage[]) => {
    const messagesForStorage = messagesToSave.map(msg => ({
      ...msg,
      originalAudioFile: undefined // Remove File objects before saving
    }))
    localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(messagesForStorage))
  }

  const handleRunCode = async (code: string) => {
    try {
      await fetch('/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
    } catch (error) {
      console.error('Error running code:', error)
    }
  }

  const handleDownloadCode = (code: string) => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'code.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() && !audioFile) return

    // Check if this is an audio processing request
    const isAudioProcessing = audioFile && inputText.trim()
    const isAudioFileOnly = audioFile && !inputText.trim()
    
  const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: isAudioProcessing
        ? `עיבוד אודיו: ${audioFile.name} - ${inputText}`
        : inputText || `העלאת קובץ אודיו: ${audioFile?.name}`,
      sender: 'user',
      timestamp: new Date(),
      audioFile: audioFile?.name,
      status: audioFile ? 'uploaded' : undefined
    }

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)
    
    // Save updated messages to localStorage
    saveMessagesToStorage(updatedMessages)
    
    const currentInput = inputText
    const currentAudioFile = audioFile
    setInputText('')
    setAudioFile(null)
    setIsLoading(true)

    try {
      // Get API key from localStorage
      const apiKey = localStorage.getItem('GEMINI_API_KEY')
      
      if (!apiKey) {
        // Show error message in chat with settings button
        const errorResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: 'מפתח API חסר. אנא הגדר את מפתח ה-API של Gemini AI כדי להתחיל לשוחח. לחץ על כפתור ההגדרות למעלה.',
          sender: 'assistant',
          timestamp: new Date()
        }
        const updatedMessagesWithError = [...messages, errorResponse]
        setMessages(updatedMessagesWithError)
        saveMessagesToStorage(updatedMessagesWithError)
        setIsLoading(false)
        return
      }

      if (isAudioFileOnly) {
        // Handle audio file upload without instructions - analyze the file automatically
        
        // Show loading message first
        const loadingMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `🔍 **מנתח את הקובץ "${currentAudioFile!.name}"...**

המערכת בודקת את המאפיינים הטכניים של הקובץ ומכינה המלצות מותאמות אישית...`,
          sender: 'assistant',
          timestamp: new Date()
        }
        const updatedMessagesWithLoading = [...updatedMessages, loadingMessage]
        setMessages(updatedMessagesWithLoading)
        saveMessagesToStorage(updatedMessagesWithLoading)
        
                 try {
           // Analyze the audio file automatically
           const audioAnalysis = await analyzeAudioFile(currentAudioFile!)
           
           // Update uploaded file with analysis data
           const existingUploads = localStorage.getItem('WAVEQ_UPLOADED_FILES')
           if (existingUploads) {
             try {
               let uploads = JSON.parse(existingUploads)
               const fileIndex = uploads.findIndex((f: any) => f.name === currentAudioFile!.name)
               if (fileIndex !== -1) {
                 uploads[fileIndex].duration = audioAnalysis.duration
                 uploads[fileIndex].quality = audioAnalysis.quality
                 uploads[fileIndex].status = 'processed'
                 localStorage.setItem('WAVEQ_UPLOADED_FILES', JSON.stringify(uploads))
               }
             } catch (error) {
               console.error('Error updating uploaded file:', error)
             }
           }
           
           const aiResponse: ChatMessage = {
             id: (Date.now() + 1).toString(),
             text: `🎵 **ניתוח אוטומטי של הקובץ: "${currentAudioFile!.name}"**

📊 **מה המערכת הבינה מהקובץ:**
${audioAnalysis.summary}

🔍 **פרטים טכניים:**
• **גודל קובץ:** ${audioAnalysis.fileSize}
• **סוג קובץ:** ${audioAnalysis.fileType}
• **איכות:** ${audioAnalysis.quality}
• **משך:** ${audioAnalysis.duration}

💡 **המלצות לעיבוד אוטומטי:**
${audioAnalysis.recommendations}

🚀 **פעולות מהירות מומלצות:**
${audioAnalysis.quickActions}

📊 **ויזואליזציה גרפית מתצוגת הקובץ מטה** ⬇️

📝 **איך לעבד את הקובץ:**
1. העלה שוב את הקובץ 📎
2. כתוב הוראות עיבוד ספציפיות
3. שלח - ואני אעבד עבורך!

מה תרצה לעשות עם הקובץ הזה? 🎧`,
             sender: 'assistant',
             timestamp: new Date(),
             originalAudioFile: currentAudioFile!,
             showVisualization: true
           }
          const updatedMessagesWithAI = [...updatedMessages, aiResponse]
          setMessages(updatedMessagesWithAI)
          saveMessagesToStorage(updatedMessagesWithAI)
        } catch (error) {
          // Fallback to basic message if analysis fails
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: `🎵 **קובץ אודיו התקבל בהצלחה!**

אני רואה שהעלת את הקובץ "${currentAudioFile!.name}". 

💡 **כדי שאוכל לעבד את הקובץ עבורך, אנא הוסף הוראות עיבוד:**

🔧 **דוגמאות לעיבוד:**
• "הגבר את העוצמה ב-50%"
• "חתוך את ה-10 השניות הראשונות"
• "הוסף באס חזק ותכלים מסך"
• "הפחת רעש ושפר איכות"
• "הפוך את הקול (reverse)"
• "הוסף echo"
• "נרמל את העוצמה"

📝 **איך לעשות זאת:**
1. העלה שוב את הקובץ 📎
2. כתוב הוראות עיבוד ברורות
3. שלח - ואני אעבד את הקובץ עבורך!

מה תרצה לעשות עם הקובץ הזה? 🎧

🚀 **פעולות מהירות - לחץ כדי להעתיק:**
• \`הגבר את העוצמה ב-30%\`
• \`הפחת רעש ונרמל\`
• \`חתוך את ה-5 שניות הראשונות\`
• \`הוסף באס ושפר איכות\``,
            sender: 'assistant',
            timestamp: new Date()
          }
          const updatedMessagesWithAI = [...updatedMessages, aiResponse]
          setMessages(updatedMessagesWithAI)
          saveMessagesToStorage(updatedMessagesWithAI)
        }
      } else if (isAudioProcessing) {
        // Upload audio and instructions then poll for processing
        const formData = new FormData()
        formData.append('audio', currentAudioFile!)
        formData.append('text', currentInput)

        const uploadResponse = await fetch('/api/chat/audio', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          const errorResponse: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: `❌ שגיאה בהעלאת האודיו: ${errorData.error || 'שגיאה לא ידועה'}`,
            sender: 'assistant',
            timestamp: new Date()
          }
          const updatedMessagesWithError = [...updatedMessages, errorResponse]
          setMessages(updatedMessagesWithError)
          saveMessagesToStorage(updatedMessagesWithError)
          return
        }

        const { request_id } = await uploadResponse.json()

        // Poll for processing completion
        let processingStatus = 'pending'
        while (processingStatus !== 'completed' && processingStatus !== 'error') {
          await new Promise(resolve => setTimeout(resolve, 2000))
          const statusResp = await fetch(`/api/audio/status/${request_id}`)
          if (statusResp.ok) {
            const statusData = await statusResp.json()
            processingStatus = statusData.status
          } else {
            processingStatus = 'error'
          }
        }

        if (processingStatus === 'completed') {
          const downloadResp = await fetch(`/api/audio/download/${request_id}`)
          if (downloadResp.ok) {
            const processedAudioBlob = await downloadResp.blob()
            const processedFileName = `processed_${currentAudioFile!.name}`
            const downloadUrl = URL.createObjectURL(processedAudioBlob)

            // Update uploaded file status
            const existingUploads = localStorage.getItem('WAVEQ_UPLOADED_FILES')
            if (existingUploads) {
              try {
                const uploads = JSON.parse(existingUploads)
                const fileIndex = uploads.findIndex((f: any) => f.name === currentAudioFile!.name)
                if (fileIndex !== -1) {
                  uploads[fileIndex].status = 'processed'
                  uploads[fileIndex].downloadUrl = downloadUrl
                  uploads[fileIndex].operations = [currentInput]
                  localStorage.setItem('WAVEQ_UPLOADED_FILES', JSON.stringify(uploads))
                }
              } catch (err) {
                console.error('Error updating uploaded file:', err)
              }
            }

            // Save to exports list
            const exportedFile = {
              id: Date.now().toString(),
              name: processedFileName,
              originalName: currentAudioFile!.name,
              processedAt: new Date(),
              size: processedAudioBlob.size,
              downloadUrl: downloadUrl,
              operations: [currentInput]
            }

            const existingExports = localStorage.getItem('WAVEQ_EXPORTED_FILES')
            let exports = []
            if (existingExports) {
              try {
                exports = JSON.parse(existingExports)
              } catch (error) {
                console.error('Error parsing exported files:', error)
              }
            }
            exports.unshift(exportedFile)
            localStorage.setItem('WAVEQ_EXPORTED_FILES', JSON.stringify(exports))

            const aiResponse: ChatMessage = {
              id: (Date.now() + 2).toString(),
              text: `✅ הקובץ עובד בהצלחה!\n\n📁 הקובץ נשמר בקובצי הייצוא ומוכן להורדה!`,
              sender: 'assistant',
              timestamp: new Date(),
              audioFile: processedFileName,
              downloadUrl: downloadUrl,
              status: 'processed'
            }

            const updatedMessagesWithAI = [...updatedMessages, aiResponse]
            setMessages(updatedMessagesWithAI)
            saveMessagesToStorage(updatedMessagesWithAI)
          } else {
            const errorResponse: ChatMessage = {
              id: (Date.now() + 2).toString(),
              text: '❌ שגיאה בהורדת הקובץ המעובד',
              sender: 'assistant',
              timestamp: new Date()
            }
            const updatedMessagesWithError = [...updatedMessages, errorResponse]
            setMessages(updatedMessagesWithError)
            saveMessagesToStorage(updatedMessagesWithError)
          }
        } else {
          const errorResponse: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: '❌ שגיאה בעיבוד האודיו',
            sender: 'assistant',
            timestamp: new Date()
          }
          const updatedMessagesWithError = [...updatedMessages, errorResponse]
          setMessages(updatedMessagesWithError)
          saveMessagesToStorage(updatedMessagesWithError)
        }
      } else {
        // Call regular Gemini Chat API - for general audio questions
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-api-key': apiKey
          },
          body: JSON.stringify({
            message: currentInput || `העלאת קובץ אודיו: ${currentAudioFile?.name}`,
            audioFile: currentAudioFile?.name,
            chatHistory: messages
          })
        })

      const data = await response.json()

      if (data.success) {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.message,
          sender: 'assistant',
          timestamp: new Date()
        }
        const updatedMessagesWithAI = [...updatedMessages, aiResponse]
        setMessages(updatedMessagesWithAI)
        saveMessagesToStorage(updatedMessagesWithAI)
      } else {
        // Fallback response
        const fallbackResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.fallback || 'אני מצטער, יש בעיה בתקשורת עם Gemini AI. אנא בדוק את מפתח ה-API בדף ההגדרות.',
          sender: 'assistant',
          timestamp: new Date()
        }
        const updatedMessagesWithFallback = [...updatedMessages, fallbackResponse]
        setMessages(updatedMessagesWithFallback)
        saveMessagesToStorage(updatedMessagesWithFallback)
        
        // Show specific error if available
        if (data.error) {
          console.error('Chat API Error:', data.error)
        }
      }
    }
  } catch (error) {
      console.error('Chat API Error:', error)
      // Error fallback
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'אני מצטער, יש בעיה בתקשורת. אנא נסה שוב או בדוק את החיבור לאינטרנט.',
        sender: 'assistant',
        timestamp: new Date()
      }
      const updatedMessagesWithGeneralError = [...messages, errorResponse]
      setMessages(updatedMessagesWithGeneralError)
      saveMessagesToStorage(updatedMessagesWithGeneralError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
      
      // Save uploaded file to localStorage
      const uploadedFile = {
        id: Date.now().toString(),
        name: file.name,
        originalName: file.name,
        uploadedAt: new Date(),
        size: file.size,
        type: file.type,
        status: 'uploaded' as const,
        fileType: file.type,
        duration: undefined,
        quality: undefined,
        operations: [],
        downloadUrl: undefined
      }
      
      // Get existing uploads
      const existingUploads = localStorage.getItem('WAVEQ_UPLOADED_FILES')
      let uploads = []
      if (existingUploads) {
        try {
          uploads = JSON.parse(existingUploads)
        } catch (error) {
          console.error('Error parsing uploaded files:', error)
        }
      }
      
      // Add new upload
      uploads.unshift(uploadedFile)
      localStorage.setItem('WAVEQ_UPLOADED_FILES', JSON.stringify(uploads))
    }
  }

  // Function to detect language and return text direction
  const detectLanguage = (text: string): 'rtl' | 'ltr' => {
    // Hebrew characters range
    const hebrewRegex = /[\u0590-\u05FF\uFB1D-\uFB4F]/
    // Arabic characters range
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
    
    if (hebrewRegex.test(text) || arabicRegex.test(text)) {
      return 'rtl'
    }
    return 'ltr'
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className={`shadow-xl border-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
        
        
                 <CardContent className="p-0">
           {/* Chat Messages */}
           <div className={`h-[calc(100vh-400px)] overflow-y-auto p-4 space-y-3 ${
             theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
           }`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="w-8 h-8">
                  {message.sender === 'user' ? (
                    <AvatarFallback className="bg-blue-500">
                      <User className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-purple-500">
                      <Bot className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                                 <div className={`max-w-[70%] ${
                   message.sender === 'user' ? 'text-right' : 'text-left'
                 }`}>
                   <div className={`inline-block p-4 rounded-2xl shadow-sm ${
                     message.sender === 'user'
                       ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                       : theme === 'dark' 
                         ? 'bg-gray-800 text-gray-100 border border-gray-700'
                         : 'bg-white text-gray-800 border border-gray-200'
                   }`}>
                    {message.audioFile && (
                      <div className="flex items-center gap-2 mb-3 text-sm opacity-80 bg-black/10 rounded-lg p-2">
                        <FileAudio className="w-4 h-4" />
                        {message.audioFile}
                        {message.status && (
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                              message.status === 'uploaded'
                                ? 'bg-blue-100 text-blue-800'
                                : message.status === 'processed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {message.status === 'uploaded'
                              ? 'הועלה'
                              : message.status === 'processed'
                                ? 'עובד'
                                : 'שגיאה'}
                          </span>
                        )}
                      </div>
                    )}
                     <p
                       className="whitespace-pre-wrap leading-relaxed"
                       style={{
                         textAlign: detectLanguage(message.text) === 'rtl' ? 'right' : 'left',
                         direction: detectLanguage(message.text)
                       }}
                     >
                       {message.text}
                     </p>
                     {message.code && (
                       <div className="mt-3">
                         <CodeCanvas code={message.code} theme={theme} />
                         <div className="flex gap-2 mt-2">
                           <Button size="sm" onClick={() => handleRunCode(message.code!)}>
                             Run
                           </Button>
                           <Button
                             size="sm"
                             variant="secondary"
                             onClick={() => handleDownloadCode(message.code!)}
                           >
                             Download
                           </Button>
                         </div>
                       </div>
                     )}
                     {message.downloadUrl && (
                       <div className="mt-3">
                         <a
                           href={message.downloadUrl}
                           download={message.audioFile}
                           className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                             theme === 'dark'
                               ? 'bg-green-600 hover:bg-green-700 text-white'
                               : 'bg-green-500 hover:bg-green-600 text-white'
                           }`}
                         >
                           <FileAudio className="w-4 h-4" />
                           הורד קובץ מעובד
                         </a>
                       </div>
                     )}
                   </div>
                   
                   {/* Audio Visualization */}
                   {message.showVisualization && message.originalAudioFile && (
                     <div className="mt-4">
                       <AudioVisualization 
                         audioFile={message.originalAudioFile} 
                         theme={theme}
                       />
                     </div>
                   )}
                   
                   <p className={`text-xs mt-2 ${
                     detectLanguage(message.text) === 'rtl' ? 'text-right' : 'text-left'
                   } ${
                     theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                   }`}>
                     {message.timestamp.toLocaleTimeString('he-IL')}
                   </p>
                 </div>
              </div>
            ))}
            
                         {isLoading && (
               <div className="flex gap-3">
                 <Avatar className="w-8 h-8">
                   <AvatarFallback className="bg-purple-500">
                     <Bot className="w-4 h-4 text-white" />
                   </AvatarFallback>
                 </Avatar>
                 <div className={`p-4 rounded-2xl shadow-sm ${
                   theme === 'dark' 
                     ? 'bg-gray-800 text-gray-100 border border-gray-700' 
                     : 'bg-white text-gray-800 border border-gray-200'
                 }`}>
                   <div className="flex items-center gap-3">
                     <div className="flex space-x-2">
                       <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                       <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                       <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                     </div>
                                           <span 
                        className={`text-sm font-medium ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}
                        style={{ 
                          textAlign: 'right',
                          direction: 'rtl'
                        }}
                      >
                        Gemini חושב...
                      </span>
                   </div>
                 </div>
               </div>
             )}
          </div>

                           

                           {/* Message Input */}
                 <div className={`border-t p-4 ${
                   theme === 'dark' 
                     ? 'bg-gray-900 border-gray-700' 
                     : 'bg-white border-gray-200'
                 }`}>
                                       <div className="flex gap-3">
                      <div className="flex-1 flex gap-2">
                        <Textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={audioFile 
                            ? "💡 כתוב הוראות עיבוד: 'הגבר את העוצמה ב-30%', 'הפחת רעש', 'חתוך את ההתחלה'..."
                            : "💬 שאל שאלה על עיבוד אודיו או העלה קובץ + הוראות עיבוד..."
                          }
                          className={`flex-1 resize-none rounded-xl border-2 focus:border-purple-500 transition-colors ${
                            theme === 'dark' 
                              ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                          }`}
                          style={{ 
                            textAlign: inputText ? (detectLanguage(inputText) === 'rtl' ? 'right' : 'left') : 'right',
                            direction: inputText ? detectLanguage(inputText) : 'rtl'
                          }}
                          rows={2}
                        />
                        
                                                    {/* File Upload Button */}
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-12 h-12 p-0 border-2 hover:border-purple-500 transition-all duration-200 ${
                                  theme === 'dark' 
                                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-white' 
                                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
                                }`}
                                title="העלאת קובץ אודיו"
                              >
                                <Upload className="w-5 h-5" />
                              </Button>


                          
                          {/* File Input */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          
                          {/* Selected File Display */}
                          {audioFile && (
                            <div className={`px-3 py-2 rounded-lg text-xs text-center ${
                              theme === 'dark' 
                                ? 'bg-green-900/20 border border-green-700 text-green-300' 
                                : 'bg-green-50 border border-green-200 text-green-800'
                            }`}>
                              <FileAudio className="w-4 h-4 mx-auto mb-1" />
                              <div className="truncate max-w-20">
                                {audioFile.name}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                                                                  <Button
                         onClick={handleSendMessage}
                         disabled={(!inputText.trim() && !audioFile) || isLoading}
                         className="w-14 h-14 p-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
                         title="שלח הודעה"
                       >
                         <Send className="w-6 h-6" />
                       </Button>
                   </div>
                 </div>
        </CardContent>
      </Card>


    </div>
  )
}
