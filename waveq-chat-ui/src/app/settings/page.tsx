'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Key, Bot, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
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
        throw new Error('API test failed')
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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ⚙️ הגדרות
          </h1>
          <p className="text-lg text-gray-600">
            הגדר את המערכת לשימוש עם Gemini AI
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              חזרה לצ'אט
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Gemini API Configuration */}
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-6 h-6" />
                הגדרת Gemini AI API
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  מפתח API של Gemini
                </label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="הכנס את מפתח ה-API שלך כאן..."
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-gray-100"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
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
              <div className="flex gap-3">
                <Button
                  onClick={handleSaveApiKey}
                  disabled={isLoading || !apiKey.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isLoading ? 'בודק...' : 'שמור ובדוק'}
                </Button>
                <Button
                  onClick={handleClearApiKey}
                  variant="outline"
                  className="px-6"
                >
                  נקה
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
