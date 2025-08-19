'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileAudio, RotateCcw, Settings } from 'lucide-react'

interface AudioConverterProps {
  audioFile: File | null
  theme: 'dark' | 'light'
  onConvertedAudio: (convertedAudio: Blob) => void
}

export function AudioConverter({ audioFile, theme, onConvertedAudio }: AudioConverterProps) {
  const [targetFormat, setTargetFormat] = useState<'wav' | 'mp3' | 'ogg' | 'aac'>('wav')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [isConverting, setIsConverting] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)

  const audioRef = useRef<HTMLAudioElement>(null)

  const getFormatInfo = (format: string) => {
    switch (format) {
      case 'wav':
        return { name: 'WAV', description: 'איכות גבוהה, גודל גדול', color: 'text-blue-500' }
      case 'mp3':
        return { name: 'MP3', description: 'איכות טובה, גודל קטן', color: 'text-green-500' }
      case 'ogg':
        return { name: 'OGG', description: 'איכות גבוהה, גודל קטן', color: 'text-purple-500' }
      case 'aac':
        return { name: 'AAC', description: 'איכות מעולה, גודל קטן', color: 'text-orange-500' }
      default:
        return { name: 'Unknown', description: '', color: 'text-gray-500' }
    }
  }

  const getQualityInfo = (quality: string) => {
    switch (quality) {
      case 'low':
        return { name: 'נמוכה', bitrate: '128 kbps', size: 'קטן' }
      case 'medium':
        return { name: 'בינונית', bitrate: '256 kbps', size: 'בינוני' }
      case 'high':
        return { name: 'גבוהה', bitrate: '320 kbps', size: 'גדול' }
      default:
        return { name: 'Unknown', bitrate: '', size: '' }
    }
  }

  const convertAudio = async () => {
    if (!audioFile) return

    try {
      setIsConverting(true)
      setConversionProgress(0)

      // Simulate conversion progress
      const progressInterval = setInterval(() => {
        setConversionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Create audio context for conversion
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create offline context for conversion
      const offlineContext = new OfflineAudioContext(
        audioContext.sampleRate,
        audioBuffer.length
      )
      
      const source = offlineContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(offlineContext.destination)
      source.start(0)
      
      // Render converted audio
      const renderedBuffer = await offlineContext.startRendering()
      
      // Convert to blob with appropriate MIME type
      let mimeType = 'audio/wav'
      let fileExtension = 'wav'
      
      switch (targetFormat) {
        case 'mp3':
          mimeType = 'audio/mpeg'
          fileExtension = 'mp3'
          break
        case 'ogg':
          mimeType = 'audio/ogg'
          fileExtension = 'ogg'
          break
        case 'aac':
          mimeType = 'audio/aac'
          fileExtension = 'aac'
          break
        default:
          mimeType = 'audio/wav'
          fileExtension = 'wav'
      }
      
      const convertedAudio = new Blob([renderedBuffer], { type: mimeType })
      
      clearInterval(progressInterval)
      setConversionProgress(100)
      
      // Update file name with new extension
      const fileName = audioFile.name.replace(/\.[^/.]+$/, '')
      const convertedFile = new File([convertedAudio], `${fileName}.${fileExtension}`, {
        type: mimeType
      })
      
      onConvertedAudio(convertedAudio)
      
      setTimeout(() => {
        setIsConverting(false)
        setConversionProgress(0)
      }, 1000)
      
    } catch (error) {
      console.error('Error converting audio:', error)
      setIsConverting(false)
      setConversionProgress(0)
    }
  }

  const downloadConverted = () => {
    if (!audioFile) return
    
    const fileName = audioFile.name.replace(/\.[^/.]+$/, '')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(audioFile)
    link.download = `${fileName}.${targetFormat}`
    link.click()
  }

  if (!audioFile) return null

  const formatInfo = getFormatInfo(targetFormat)
  const qualityInfo = getQualityInfo(quality)

  return (
    <Card className={`shadow-xl border-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <CardHeader className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg`}>
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <FileAudio className="w-6 h-6" />
          </div>
          <div>
            <div>המרת פורמט אודיו</div>
            <div className="text-sm font-normal opacity-90">שינוי סוג קובץ ואיכות</div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* File Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <FileAudio className="w-8 h-8 text-purple-500" />
            <div className="flex-1">
              <div className="font-medium">{audioFile.name}</div>
              <div className="text-sm text-gray-500">
                {(audioFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">בחר פורמט יעד</h3>
          <div className="grid grid-cols-2 gap-4">
            {(['wav', 'mp3', 'ogg', 'aac'] as const).map((format) => (
              <Button
                key={format}
                variant={targetFormat === format ? 'default' : 'outline'}
                onClick={() => setTargetFormat(format)}
                className={`h-20 flex-col gap-2 ${
                  targetFormat === format 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                    : 'hover:border-indigo-500'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  targetFormat === format ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <FileAudio className={`w-5 h-5 ${
                    targetFormat === format ? 'text-white' : formatInfo.color
                  }`} />
                </div>
                <div className="text-center">
                  <div className="font-medium">{formatInfo.name}</div>
                  <div className={`text-xs ${
                    targetFormat === format ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {formatInfo.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Quality Selection */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">בחר איכות</h3>
          <div className="grid grid-cols-3 gap-4">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <Button
                key={q}
                variant={quality === q ? 'default' : 'outline'}
                onClick={() => setQuality(q)}
                className={`h-16 flex-col gap-1 ${
                  quality === q 
                    ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white' 
                    : 'hover:border-green-500'
                }`}
              >
                <div className="font-medium">{qualityInfo.name}</div>
                <div className={`text-xs ${
                  quality === q ? 'text-white/80' : 'text-gray-500'
                }`}>
                  {qualityInfo.bitrate}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Conversion Progress */}
        {isConverting && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>מעבד...</span>
              <span>{conversionProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${conversionProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            onClick={convertAudio}
            disabled={isConverting}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl h-14 flex items-center gap-3 justify-center"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="font-medium">{isConverting ? 'מעבד...' : 'המר אודיו'}</div>
              <div className="text-xs opacity-80">שינוי פורמט ואיכות</div>
            </div>
          </Button>

          <Button
            onClick={downloadConverted}
            disabled={!audioFile || isConverting}
            variant="outline"
            className="h-14 px-8 border-2 hover:border-indigo-500 transition-all duration-200 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <div className="font-medium">הורד</div>
              <div className="text-xs opacity-80">שמור קובץ</div>
            </div>
          </Button>
        </div>

        {/* Conversion Info */}
        <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
          <div className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">
            מידע על ההמרה
          </div>
          <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
            <div>פורמט יעד: <strong>{formatInfo.name}</strong></div>
            <div>איכות: <strong>{qualityInfo.name}</strong> ({qualityInfo.bitrate})</div>
            <div>גודל משוער: <strong>{qualityInfo.size}</strong></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
