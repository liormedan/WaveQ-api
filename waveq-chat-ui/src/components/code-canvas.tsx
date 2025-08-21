'use client'


interface CodeCanvasProps {
  code: string
  theme?: 'dark' | 'light'
}

export function CodeCanvas({ code, theme = 'light' }: CodeCanvasProps) {
  const baseClasses =
    theme === 'dark'
      ? 'bg-gray-800 text-gray-100'
      : 'bg-gray-100 text-gray-800'
  return (
    <pre className={`p-4 rounded-md overflow-auto font-mono text-sm ${baseClasses}`}>
      {code}
    </pre>
  )
}
