'use client'


import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Trash2 } from 'lucide-react'

const LANGUAGES = ['python', 'javascript', 'bash']

export function CodeCanvas() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')

  const handleCopy = async () => {
    if (code.trim()) {
      await navigator.clipboard.writeText(code)
    }
  }

  const handleClear = () => setCode('')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!code.trim()}
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!code}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      <Textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Write code here..."
        className="font-mono h-48"
      />
    </div>
  )
}

