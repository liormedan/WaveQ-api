'use client'

import Editor from '@monaco-editor/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CodeCanvasProps {
  code: string
  language: string
  onChange: (value: string | undefined) => void
  title?: string
}

export function CodeCanvas({ code, language, onChange, title }: CodeCanvasProps) {
  return (
    <Card className="w-full h-full">
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Editor
          height="400px"
          defaultLanguage={language}
          language={language}
          value={code}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14 }}
          onChange={onChange}
        />
      </CardContent>
    </Card>
  )
}

export default CodeCanvas
