'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Key, Bot, CheckCircle, AlertCircle, Eye, EyeOff, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('WAVEQ_THEME')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    }
    
    // Load saved API key from localStorage
    const savedApiKey = localStorage.getItem('GEMINI_API_KEY')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
  }, [])



  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setStatus('error')
      setStatusMessage('אנא הכנס מפתח API')
      return
    }

    setIsLoading(true)
    setStatus('idle')

    try {
      // Test the API key by making a simple request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey
        },
        body: JSON.stringify({
          message: 'בדיקת חיבור',
          audioFile: null,
          chatHistory: []
        })
      })

             if (response.ok) {
         // Save to localStorage
         localStorage.setItem('GEMINI_API_KEY', apiKey)
         setStatus('success')
         setStatusMessage('מפתח API נשמר בהצלחה!')
         
         // Clear message after 3 seconds
         setTimeout(() => {
           setStatus('idle')
           setStatusMessage('')
         }, 3000)
       } else {
         const errorData = await response.json()
         throw new Error(errorData.fallback || 'API test failed')
       }
    } catch (error) {
      setStatus('error')
      setStatusMessage('שגיאה בבדיקת מפתח API. אנא ודא שהמפתח תקין')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearApiKey = () => {
    localStorage.removeItem('GEMINI_API_KEY')
    setApiKey('')
    setStatus('success')
    setStatusMessage('מפתח API נמחק בהצלחה!')
    
    setTimeout(() => {
      setStatus('idle')
      setStatusMessage('')
    }, 3000)
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <main className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white' 
        : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 text-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            ⚙️ הגדרות
          </h1>
          <p className={`text-lg ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            הגדר את המערכת לשימוש עם Gemini AI
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Button variant="outline" className={`flex items-center gap-3 px-8 py-4 border-2 hover:border-purple-500 transition-all duration-200 ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-600 hover:bg-gray-700 text-white' 
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'
            }`}>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="font-medium">חזרה לצ'אט</div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>דף הבית</div>
              </div>
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Gemini API Configuration */}
          <Card className={`shadow-xl border-0 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-6 h-6" />
                הגדרת Gemini AI API
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  מפתח API של Gemini
                </label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="הכנס את מפתח ה-API שלך כאן..."
                    className={`pr-12 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`absolute right-0 top-0 h-full px-3 ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700 text-gray-300' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  המפתח נשמר באופן מקומי בדפדפן שלך
                </p>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {getStatusIcon()}
                  <span className={`text-sm ${getStatusColor()}`}>
                    {statusMessage}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={handleSaveApiKey}
                  disabled={isLoading || !apiKey.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-14 flex items-center gap-3 justify-center"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Key className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{isLoading ? 'בודק...' : 'שמור ובדוק'}</div>
                    <div className="text-xs opacity-80">אימות המפתח</div>
                  </div>
                </Button>
                <Button
                  onClick={handleClearApiKey}
                  variant="outline"
                  className="h-14 px-8 border-2 hover:border-red-500 transition-all duration-200 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="text-right">
                    <div className="font-medium">נקה</div>
                    <div className="text-xs text-gray-500">מחיקת המפתח</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                הוראות הגדרה
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">קבלת מפתח API</h4>
                    <p className="text-sm text-gray-600">
                      היכנס ל-{' '}
                      <a 
                        href="https://makersuite.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Google AI Studio
                      </a>
                      {' '}וצור מפתח API חדש
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">הכנסת המפתח</h4>
                    <p className="text-sm text-gray-600">
                      העתק את מפתח ה-API והדבק אותו בשדה למעלה
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">בדיקה ושמירה</h4>
                    <p className="text-sm text-gray-600">
                      לחץ על "שמור ובדוק" כדי לאמת שהמפתח עובד
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 טיפ</h4>
                <p className="text-sm text-blue-800">
                  לאחר הגדרת המפתח, תוכל לחזור לדף הצ'אט ולהתחיל לשוחח עם Gemini AI על עיבוד אודיו!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                יכולות Gemini AI
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">🎵 עיבוד אודיו</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• ניתוח איכות אודיו</li>
                    <li>• המלצות לעריכה</li>
                    <li>• טכניקות עיבוד מתקדמות</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">🛠️ כלים וציוד</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• המלצות על תוכנות</li>
                    <li>• ציוד הקלטה</li>
                    <li>• פתרון בעיות</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
