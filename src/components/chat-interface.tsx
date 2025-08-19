'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Send, Mic, FileAudio, MessageCircle } from 'lucide-react'

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
  audioFile?: string
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'שלום! אני כאן כדי לעזור לך עם עיבוד אודיו. איזה קובץ אודיו תרצה לשלוח?',
      sender: 'assistant',
      timestamp: new Date()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSendMessage = async () => {
    if (!inputText.trim() && !audioFile) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      audioFile: audioFile?.name
    }

    setMessages(prev => [...prev, newMessage])
    setInputText('')
    setAudioFile(null)
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: audioFile 
          ? `קיבלתי את קובץ האודיו "${audioFile.name}" ואני מעבד אותו כעת. מה תרצה שאעשה איתו?`
          : 'אני כאן כדי לעזור! האם יש לך שאלה נוספת?',
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            צ'אט עיבוד אודיו
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={message.sender === 'user' ? '/user-avatar.png' : '/ai-avatar.png'} />
                  <AvatarFallback className={message.sender === 'user' ? 'bg-blue-500' : 'bg-purple-500'}>
                    {message.sender === 'user' ? 'U' : 'AI'}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`max-w-[70%] ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}>
                  <div className={`inline-block p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.audioFile && (
                      <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
                        <FileAudio className="w-4 h-4" />
                        {message.audioFile}
                      </div>
                    )}
                    <p>{message.text}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString('he-IL')}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-purple-500">AI</AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File Upload Area */}
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">העלאת קובץ אודיו</span>
            </div>
            
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <FileAudio className="w-4 h-4" />
                בחר קובץ אודיו
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {audioFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-md">
                  <FileAudio className="w-4 h-4" />
                  <span className="text-sm">{audioFile.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="כתוב הודעה כאן..."
                className="flex-1 resize-none"
                rows={2}
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && !audioFile) || isLoading}
                className="px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
