import { ChatInterface } from '@/components/chat-interface'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎵 WaveQ Chat
          </h1>
          <p className="text-lg text-gray-600">
            מערכת צ'אט מתקדמת לעיבוד אודיו
          </p>
        </div>
        <ChatInterface />
      </div>
    </main>
  )
}
