'use client'

import React, { useState, useEffect } from 'react'
import { ChatInterface } from '@/components/chat-interface'
import { Button } from '@/components/ui/button'
import { Settings, Sun, Moon, Key, Bot, Music, Scissors, FileAudio } from 'lucide-react'

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [currentPage, setCurrentPage] = useState<'chat' | 'settings'>('chat')

  // Load saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('WAVEQ_THEME')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    }
  }, [])

  // Save theme preference
  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    console.log('Changing theme from', theme, 'to', newTheme)
    setTheme(newTheme)
    localStorage.setItem('WAVEQ_THEME', newTheme)
  }

  // Handle new chat - clear history and return to chat page
  const handleNewChat = () => {
    // Clear chat history from localStorage
    localStorage.removeItem('WAVEQ_CHAT_HISTORY')
    
    // Return to chat page
    setCurrentPage('chat')
    
    // Force page refresh to clear chat interface
    window.location.reload()
  }

  console.log('Current theme:', theme)
  
  return (
    <main className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white' 
        : 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 text-gray-900'
    }`}>
      {/* Header with Navigation */}
      <header className={`${
        theme === 'dark' 
          ? 'bg-gray-800/90 backdrop-blur-sm border-gray-700' 
          : 'bg-white/80 backdrop-blur-sm border-gray-200'
      } border-b sticky top-0 z-50`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">🎵</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  WaveQ Chat
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Gemini AI + עיבוד אודיו
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex">
        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-6xl mx-auto px-6 py-8" key={theme}>
            {/* Dynamic Content Based on Current Page */}
            {currentPage === 'chat' ? (
              <>
                {/* Chat Interface */}
                <ChatInterface theme={theme} />

                {/* Features Section */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className={`${
                    theme === 'dark' 
                      ? 'bg-gray-800/60 backdrop-blur-sm border-gray-600' 
                      : 'bg-white/60 backdrop-blur-sm border-gray-200'
                  } rounded-xl p-4 border text-center hover:shadow-lg transition-all duration-300`}>
                    <Button 
                      variant="outline" 
                      className={`w-full h-16 border-2 hover:border-purple-500 transition-all duration-200 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-white' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-xl">🎵</span>
                      </div>
                      התחל עיבוד
                    </Button>
                  </div>
                  
                  <div className={`${
                    theme === 'dark' 
                      ? 'bg-gray-800/60 backdrop-blur-sm border-gray-600' 
                      : 'bg-white/60 backdrop-blur-sm border-gray-200'
                  } rounded-xl p-4 border text-center hover:shadow-lg transition-all duration-300`}>
                    <Button 
                      variant="outline" 
                      className={`w-full h-16 border-2 hover:border-green-500 transition-all duration-200 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-white' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-xl">📱</span>
                      </div>
                      גלה תכונות
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className={`mt-16 text-center text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <p>Powered by Google Gemini AI • Built with Next.js & Shadcn/ui</p>
                </div>
              </>
            ) : (
              /* Settings Page */
              <div className="max-w-4xl mx-auto">
                <div className={`${
                  theme === 'dark' 
                    ? 'bg-gray-800/60 backdrop-blur-sm border-gray-600' 
                    : 'bg-white/60 backdrop-blur-sm border-gray-200'
                } rounded-xl p-8 border`}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Key className="w-8 h-8 text-white" />
                    </div>
                    <h2 className={`text-3xl font-bold mb-3 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      הגדרות Gemini AI
                    </h2>
                    <p className={`text-lg ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      הגדר את מפתח ה-API שלך כדי להתחיל לשוחח עם Gemini AI
                    </p>
                  </div>

                  {/* Settings Form */}
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        מפתח API של Gemini
                      </label>
                      <input
                        type="password"
                        id="apiKey"
                        placeholder="הכנס את מפתח ה-API שלך כאן..."
                        className={`w-full px-4 py-3 rounded-lg border-2 focus:border-purple-500 transition-colors ${
                          theme === 'dark' 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
                        }`}
                        style={{ textAlign: 'right', direction: 'rtl' }}
                      />
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        className="flex-1 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 justify-center"
                      >
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <Key className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-medium">שמור ובדוק</div>
                          <div className="text-xs opacity-80">שמירת מפתח API</div>
                        </div>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="h-14 px-8 border-2 hover:border-red-500 transition-all duration-200 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-xl">🗑️</span>
                        </div>
                        <div>
                          <div className="font-medium">נקה</div>
                          <div className="text-xs opacity-80">מחיקת מפתח</div>
                        </div>
                      </Button>
                    </div>

                    <div className="text-center">
                      <Button 
                        variant="outline"
                        onClick={() => setCurrentPage('chat')}
                        className="px-8 py-4 border-2 hover:border-purple-500 transition-all duration-200 flex items-center gap-3 mx-auto"
                      >
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-xl">←</span>
                        </div>
                        <div>
                          <div className="font-medium">חזרה לצ'אט</div>
                          <div className="text-xs opacity-80">חזרה לשיחה</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Always Visible */}
        <div className={`w-72 border-l shadow-xl ${
          theme === 'dark' 
            ? 'bg-gradient-to-b from-gray-900 to-gray-800 border-gray-700' 
            : 'bg-gradient-to-b from-white to-gray-50 border-gray-200'
        }`}>
          {/* Sidebar Header */}
          <div className={`p-6 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                הגדרות מהירות
              </h3>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">⚙️</span>
              </div>
            </div>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              ניהול ערכת נושא והגדרות מערכת
            </p>
          </div>

          {/* Sidebar Content */}
          <div className="p-4 space-y-4">
            {/* New Chat Button - Top Priority */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={handleNewChat}
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-green-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">צ'אט חדש</div>
                  <div className="text-xs text-gray-400">התחלת שיחה חדשה</div>
                </div>
              </Button>
            </div>

            {/* Audio Processing Tools */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-blue-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Music className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">כלי עיבוד אודיו</div>
                  <div className="text-xs text-gray-400">עריכה והשפעות מתקדמות</div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-red-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">חיתוך אודיו</div>
                  <div className="text-xs text-gray-400">בחירת קטעים וזמנים</div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-indigo-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <FileAudio className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">המרת פורמט</div>
                  <div className="text-xs text-gray-400">שינוי סוג קובץ ואיכות</div>
                </div>
              </Button>
            </div>

            {/* Theme Toggle */}
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-purple-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                {theme === 'dark' ? (
                  <>
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <Sun className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">ערכת נושא בהירה</div>
                      <div className="text-xs text-gray-400">מעבר לעיצוב בהיר</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Moon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">ערכת נושא כהה</div>
                      <div className="text-xs text-gray-400">מעבר לעיצוב כהה</div>
                    </div>
                  </>
                )}
              </Button>
            </div>

            {/* Settings Button */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage('settings')}
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-purple-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">הגדרות Gemini AI</div>
                  <div className="text-xs text-gray-400">ניהול מפתחות API</div>
                </div>
              </Button>
            </div>

            {/* System Settings */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-blue-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">הגדרות מערכת</div>
                  <div className="text-xs text-gray-400">הגדרות כלליות</div>
                </div>
              </Button>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  WaveQ Chat v1.0
                </p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
                  Powered by Gemini AI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
