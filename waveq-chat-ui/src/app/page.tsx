'use client'

import React, { useState, useEffect } from 'react'
import { ChatInterface } from '@/components/chat-interface'
import { Button } from '@/components/ui/button'
import { Settings, Sun, Moon, Key, Bot, Download, FileText, Calendar, Clock, FileAudio, Trash2, Upload } from 'lucide-react'
import { UploadsSection } from '@/components/uploads-section'
import { useTranslation } from '@/components/language-provider'

// Types for exported files
interface ExportedFile {
  id: string
  name: string
  originalName: string
  processedAt: Date
  size: number
  downloadUrl: string
  operations: string[]
  status: string
}

// ExportsSection Component
function ExportsSection({ theme }: { theme: 'dark' | 'light' }) {
  const [exportedFiles, setExportedFiles] = useState<ExportedFile[]>([])

  const saveToCache = (files: ExportedFile[]) => {
    const serialized = files.map(f => ({ ...f, processedAt: f.processedAt.toISOString() }))
    localStorage.setItem('WAVEQ_EXPORTED_FILES', JSON.stringify(serialized))
  }

  useEffect(() => {
    const loadFromCache = () => {
      const stored = localStorage.getItem('WAVEQ_EXPORTED_FILES')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          const withDates = parsed.map((file: any) => ({
            ...file,
            processedAt: new Date(file.processedAt)
          }))
          setExportedFiles(withDates)
        } catch (error) {
          console.error('Error loading cached exports:', error)
          setExportedFiles([])
        }
      }
    }

    const fetchRequests = async () => {
      try {
        const res = await fetch('/api/audio/requests?status=completed')
        if (!res.ok) throw new Error('Failed to fetch requests')
        const data = await res.json()
        const requests = data.requests || []

        const files: ExportedFile[] = await Promise.all(
          requests.map(async (req: any) => {
            let operations: string[] = []
            let processedAt = req.submitted_at ? new Date(req.submitted_at) : new Date()
            let size = 0
            try {
              const statusRes = await fetch(`/api/audio/status/${req.request_id}`)
              if (statusRes.ok) {
                const statusData = await statusRes.json()
                operations =
                  statusData.result?.operations?.map((op: any) => op.operation || op) || []
                processedAt = statusData.timestamp
                  ? new Date(statusData.timestamp)
                  : processedAt
                size = statusData.result?.file_size || size
              }
            } catch (err) {
              console.error('Error loading request details:', err)
            }

            const name = req.file_path ? req.file_path.split('/').pop() : `request_${req.request_id}`
            return {
              id: req.request_id,
              name,
              originalName: name,
              processedAt,
              size,
              downloadUrl: `/api/audio/download/${req.request_id}`,
              operations,
              status: req.status || 'unknown'
            }
          })
        )

        setExportedFiles(files)
        saveToCache(files)
      } catch (error) {
        console.error('Error fetching exported files:', error)
      }
    }

    loadFromCache()
    fetchRequests()
  }, [])

  const handleDeleteFile = async (fileId: string) => {
    try {
      await fetch(`/api/audio/requests/${fileId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Error deleting request:', error)
    }
    const updatedFiles = exportedFiles.filter(file => file.id !== fileId)
    setExportedFiles(updatedFiles)
    saveToCache(updatedFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (exportedFiles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <FileText className={`w-12 h-12 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
        </div>
        <h3 className={`text-xl font-semibold mb-2 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          אין קבצים מיוצאים עדיין
        </h3>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          קבצים שתעבד יופיעו כאן לאחר העיבוד
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {exportedFiles.map((file) => (
        <div
          key={file.id}
          className={`p-6 rounded-xl border transition-all duration-200 hover:shadow-lg ${
            theme === 'dark'
              ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
              }`}>
                <FileAudio className={`w-6 h-6 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`} />
              </div>
              
              <div className="flex-1">
                <h4 className={`font-semibold text-lg mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {file.name}
                </h4>
                <div className="flex items-center gap-4 text-sm">
                  <div className={`flex items-center gap-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    {file.processedAt.toLocaleDateString('he-IL')}
                  </div>
                  <div className={`flex items-center gap-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <Clock className="w-4 h-4" />
                    {file.processedAt.toLocaleTimeString('he-IL')}
                  </div>
                  <div className={`${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {formatFileSize(file.size)}
                  </div>
                </div>
                <div className={`mt-2 text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  סטטוס: {file.status}
                </div>
                {file.operations.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {file.operations.map((operation, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs ${
                            theme === 'dark'
                              ? 'bg-blue-900/30 text-blue-300'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {operation}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                asChild
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
              >
                <a href={file.downloadUrl} download={file.name}>
                  <Download className="w-4 h-4 mr-2" />
                  הורד
                </a>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteFile(file.id)}
                className="text-red-500 hover:text-red-700 hover:border-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const { lang, setLang } = useTranslation()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [currentPage, setCurrentPage] = useState<'chat' | 'settings' | 'exports' | 'uploads'>('chat')
  const [apiKey, setApiKey] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [apiKeyMessage, setApiKeyMessage] = useState('')

  // Load saved theme preference and API key
  useEffect(() => {
    const savedTheme = localStorage.getItem('WAVEQ_THEME')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    }
    
    const savedApiKey = localStorage.getItem('GEMINI_API_KEY')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
  }, [])

  // Save theme preference
  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    console.log('Changing theme from', theme, 'to', newTheme)
    setTheme(newTheme)
    localStorage.setItem('WAVEQ_THEME', newTheme)
  }

  // Handle API key save and validation
  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyStatus('error')
      setApiKeyMessage('אנא הכנס מפתח API')
      return
    }

    setApiKeyStatus('saving')
    setApiKeyMessage('בודק מפתח API...')

    try {
      // Test the API key with a simple request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey.trim()
        },
        body: JSON.stringify({
          message: 'Test API key',
          chatHistory: []
        })
      })

      if (response.ok) {
        setApiKeyStatus('success')
        setApiKeyMessage('מפתח API תקין ונשמר בהצלחה!')
        localStorage.setItem('GEMINI_API_KEY', apiKey.trim())
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setApiKeyMessage('')
          setApiKeyStatus('idle')
        }, 3000)
      } else {
        setApiKeyStatus('error')
        setApiKeyMessage('מפתח API לא תקין. אנא בדוק ונסה שוב.')
      }
    } catch (error) {
      setApiKeyStatus('error')
      setApiKeyMessage('שגיאה בבדיקת מפתח API. אנא נסה שוב.')
    }
  }

  // Handle API key clear
  const handleClearApiKey = () => {
    setApiKey('')
    setApiKeyStatus('idle')
    setApiKeyMessage('')
    localStorage.removeItem('GEMINI_API_KEY')
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
            ) : currentPage === 'settings' ? (
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
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
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
                        onClick={handleSaveApiKey}
                        disabled={apiKeyStatus === 'saving'}
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
                        onClick={handleClearApiKey}
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

                    {/* Status Message */}
                    {apiKeyMessage && (
                      <div className={`p-4 rounded-lg text-center ${
                        apiKeyStatus === 'success' 
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : apiKeyStatus === 'error'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {apiKeyMessage}
                      </div>
                    )}

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
            ) : currentPage === 'exports' ? (
              /* Exports Page */
              <div className="max-w-6xl mx-auto">
                <div className={`${
                  theme === 'dark' 
                    ? 'bg-gray-800/60 backdrop-blur-sm border-gray-600' 
                    : 'bg-white/60 backdrop-blur-sm border-gray-200'
                } rounded-xl p-8 border`}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Download className="w-8 h-8 text-white" />
                    </div>
                    <h2 className={`text-3xl font-bold mb-3 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      קובצי ייצוא
                    </h2>
                    <p className={`text-lg ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      כל הקבצים שעובדו ומוכנים להורדה
                    </p>
                  </div>

                  {/* Exports List */}
                  <ExportsSection theme={theme} />

                  <div className="text-center mt-8">
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
            ) : currentPage === 'uploads' ? (
              <div className="flex-1 p-8">
                <div className={`max-w-6xl mx-auto ${
                  theme === 'dark' 
                    ? 'bg-gray-800 text-white' 
                    : 'bg-white text-gray-900'
                } rounded-xl p-8 border`}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h2 className={`text-3xl font-bold mb-3 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      קבצים שהועלו
                    </h2>
                    <p className={`text-lg ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      היסטוריית כל הקבצים שהועלו למערכת
                    </p>
                  </div>

                  {/* Uploads List */}
                  <UploadsSection theme={theme} />

                  <div className="text-center mt-8">
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
            ) : null}
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

            {/* Language Toggle */}
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-teal-500 transition-all duration-200 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
                  <span className="font-semibold">
                    {lang === 'he' ? 'EN' : 'HE'}
                  </span>
                </div>
                <div className="text-left">
                  <div className="font-medium">
                    {lang === 'he' ? 'English' : 'עברית'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {lang === 'he' ? 'Change language' : 'החלפת שפה'}
                  </div>
                </div>
              </Button>
            </div>

            {/* Uploads Button */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage('uploads')}
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-orange-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">קבצים שהועלו</div>
                  <div className="text-xs text-gray-400">היסטוריית העלאות</div>
                </div>
              </Button>
            </div>

            {/* Exports Button */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => setCurrentPage('exports')}
                className={`w-full justify-start gap-3 h-12 text-left border-2 hover:border-green-500 transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 hover:bg-gray-700' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Download className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium">קובצי ייצוא</div>
                  <div className="text-xs text-gray-400">קבצים מעובדים להורדה</div>
                </div>
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
