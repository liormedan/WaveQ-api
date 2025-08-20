'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Send, FileAudio, MessageCircle, Bot, User } from 'lucide-react'
import Link from 'next/link'

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
  audioFile?: string
  downloadUrl?: string
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
1. **העלה קובץ אודיו** - לחץ על כפתור ההעלאה 📎
2. **כתוב הוראות עיבוד** - תאר מה אתה רוצה לעשות לקובץ
   - "הגבר את העוצמה ב-50%"
   - "חתוך את ה-10 שניות הראשונות" 
   - "הוסף באס חזק"
   - "הפוך את הקול"
   - "הפחת רעש"
3. **שלח** - המערכת תעבד את הקובץ ותחזיר לך גרסה מעובדת 

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
1. **העלה קובץ אודיו** - לחץ על כפתור ההעלאה 📎
2. **כתוב הוראות עיבוד** - תאר מה אתה רוצה לעשות לקובץ
   - "הגבר את העוצמה ב-50%"
   - "חתוך את ה-10 שניות הראשונות" 
   - "הוסף באס חזק"
   - "הפוך את הקול"
   - "הפחת רעש"
3. **שלח** - המערכת תעבד את הקובץ ותחזיר לך גרסה מעובדת 

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

  const handleSendMessage = async () => {
    if (!inputText.trim() && !audioFile) return

    // Check if this is an audio processing request
    const isAudioProcessing = audioFile && inputText.trim()
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: isAudioProcessing 
        ? `עיבוד אודיו: ${audioFile.name} - ${inputText}`
        : inputText || `העלאת קובץ אודיו: ${audioFile?.name}`,
      sender: 'user',
      timestamp: new Date(),
      audioFile: audioFile?.name
    }

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)
    
    // Save updated messages to localStorage
    localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(updatedMessages))
    
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
        localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(updatedMessagesWithError))
        setIsLoading(false)
        return
      }

      if (isAudioProcessing) {
        // Call Audio Processing API
        const formData = new FormData()
        formData.append('audio', currentAudioFile!)
        formData.append('instructions', currentInput)

        const response = await fetch('/api/audio-processing', {
          method: 'POST',
          headers: {
            'x-gemini-api-key': apiKey
          },
          body: formData
        })

        if (response.ok) {
          const processedAudioBlob = await response.blob()
          const processedFileName = `processed_${currentAudioFile!.name}`
          
          // Get processing info from headers
          const processingInfo = response.headers.get('X-Processing-Info')
          let explanation = 'הקובץ עובד בהצלחה'
          if (processingInfo) {
            const info = JSON.parse(processingInfo)
            explanation = info.explanation || explanation
          }

          // Create download link for processed audio
          const downloadUrl = URL.createObjectURL(processedAudioBlob)
          
          const aiResponse: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: `✅ ${explanation}`,
            sender: 'assistant',
            timestamp: new Date(),
            audioFile: processedFileName,
            downloadUrl: downloadUrl
          }
          
          const updatedMessagesWithAI = [...updatedMessages, aiResponse]
          setMessages(updatedMessagesWithAI)
          localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(updatedMessagesWithAI))
        } else {
          const errorData = await response.json()
          const errorResponse: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: `❌ שגיאה בעיבוד האודיו: ${errorData.error || 'שגיאה לא ידועה'}`,
            sender: 'assistant',
            timestamp: new Date()
          }
          const updatedMessagesWithError = [...updatedMessages, errorResponse]
          setMessages(updatedMessagesWithError)
          localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(updatedMessagesWithError))
        }
      } else {
        // Call regular Gemini Chat API
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
        localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(updatedMessagesWithAI))
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
        localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(updatedMessagesWithFallback))
        
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
      localStorage.setItem('WAVEQ_CHAT_HISTORY', JSON.stringify(updatedMessagesWithGeneralError))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
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
                            ? "כתוב הוראות עיבוד (לדוגמה: 'הגבר את העוצמה', 'חתוך את ה-10 שניות הראשונות', 'הוסף באס')..."
                            : "שאל שאלה על עיבוד אודיו או העלה קובץ לעיבוד..."
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
