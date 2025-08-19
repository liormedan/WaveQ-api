import { ChatInterface } from '@/components/chat-interface'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎵 WaveQ Chat + Gemini AI
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            מערכת צ'אט מתקדמת לעיבוד אודיו עם בינה מלאכותית של Google
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
            <span>Powered by</span>
            <span className="font-semibold text-blue-600">Google Gemini AI</span>
          </div>
          <div className="flex justify-center">
            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                הגדרות Gemini AI
              </Button>
            </Link>
          </div>
        </div>
        <ChatInterface />
      </div>
    </main>
  )
}
