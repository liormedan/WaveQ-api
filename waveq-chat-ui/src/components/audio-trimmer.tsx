'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scissors, Play, Pause, RotateCcw } from 'lucide-react'

interface AudioTrimmerProps {
  audioFile: File | null
  theme: 'dark' | 'light'
  onTrimmedAudio: (trimmedAudio: Blob) => void
}

export function AudioTrimmer({ audioFile, theme, onTrimmedAudio }: AudioTrimmerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            const dur = audioRef.current.duration
            setDuration(dur)
            setEndTime(dur)
            drawWaveform()
          }
        })
        audioRef.current.addEventListener('timeupdate', () => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime)
          }
        })
      }
    }
  }, [audioFile])

  const drawWaveform = () => {
    if (!canvasRef.current || !audioFile) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Simple waveform visualization
    const width = canvas.width
    const height = canvas.height
    
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = theme === 'dark' ? '#8b5cf6' : '#7c3aed'
    ctx.lineWidth = 2
    
    ctx.beginPath()
    for (let x = 0; x < width; x++) {
      const time = (x / width) * duration
      const y = height / 2 + Math.sin(time * 10) * 20
      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()

    // Draw trim markers
    const startX = (startTime / duration) * width
    const endX = (endTime / duration) * width
    
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX, height)
    ctx.moveTo(endX, 0)
    ctx.lineTo(endX, height)
    ctx.stroke()
  }

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const trimAudio = async () => {
    if (!audioFile || startTime >= endTime) return

    try {
      // Create audio context for trimming
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Calculate sample positions
      const startSample = Math.floor(startTime * audioContext.sampleRate)
      const endSample = Math.floor(endTime * audioContext.sampleRate)
      const length = endSample - startSample
      
      // Create new buffer with trimmed audio
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        length,
        audioContext.sampleRate
      )
      
      // Copy trimmed data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        const trimmedData = trimmedBuffer.getChannelData(channel)
        trimmedData.set(channelData.subarray(startSample, endSample))
      }
      
      // Convert to blob
      const offlineContext = new OfflineAudioContext(
        audioContext.sampleRate,
        length
      )
      const source = offlineContext.createBufferSource()
      source.buffer = trimmedBuffer
      source.connect(offlineContext.destination)
      source.start(0)
      
      const renderedBuffer = await offlineContext.startRendering()
      const trimmedAudio = new Blob([renderedBuffer], { type: 'audio/wav' })
      onTrimmedAudio(trimmedAudio)
      
    } catch (error) {
      console.error('Error trimming audio:', error)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!audioFile) return null

  return (
    <Card className={`shadow-xl border-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <CardHeader className={`bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-lg`}>
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <div>חיתוך אודיו</div>
            <div className="text-sm font-normal opacity-90">בחירת קטעים וזמנים</div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Waveform Display */}
        <div className="space-y-4">
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            className={`w-full border-2 rounded-lg ${
              theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
            }`}
            style={{ cursor: 'crosshair' }}
          />
          
          <div className="flex justify-between text-sm text-gray-500">
            <span>{formatTime(startTime)}</span>
            <span>{formatTime(endTime)}</span>
          </div>
        </div>

        {/* Time Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="font-medium">זמן התחלה</label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={startTime}
              onChange={(e) => {
                const newStart = parseFloat(e.target.value)
                setStartTime(newStart)
                if (newStart >= endTime) {
                  setEndTime(Math.min(newStart + 1, duration))
                }
                drawWaveform()
              }}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">
              {formatTime(startTime)}
            </div>
          </div>

          <div className="space-y-3">
            <label className="font-medium">זמן סיום</label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={endTime}
              onChange={(e) => {
                const newEnd = parseFloat(e.target.value)
                setEndTime(newEnd)
                if (newEnd <= startTime) {
                  setStartTime(Math.max(newEnd - 1, 0))
                }
                drawWaveform()
              }}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">
              {formatTime(endTime)}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <Button
            onClick={isPlaying ? pauseAudio : playAudio}
            className="w-12 h-12 p-0 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
          
          <div className="flex-1">
            <div className="text-sm font-medium mb-2">
              {audioFile.name}
            </div>
            <div className="text-xs text-gray-500">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            onClick={trimAudio}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-xl h-14 flex items-center gap-3 justify-center"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <div className="font-medium">חתוך אודיו</div>
              <div className="text-xs opacity-80">שמור את הקטע הנבחר</div>
            </div>
          </Button>

          <Button
            onClick={() => {
              setStartTime(0)
              setEndTime(duration)
              drawWaveform()
            }}
            variant="outline"
            className="h-14 px-8 border-2 hover:border-red-500 transition-all duration-200 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="font-medium">אפס</div>
              <div className="text-xs opacity-80">כל הקובץ</div>
            </div>
          </Button>
        </div>

        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
