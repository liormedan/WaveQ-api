'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Volume2, 
  Scissors, 
  RotateCcw, 
  Play, 
  Pause, 
  Download,
  Waves,
  Mic,
  Music,
  Zap
} from 'lucide-react'

interface AudioProcessorProps {
  audioFile: File | null
  theme: 'dark' | 'light'
  onProcessedAudio: (processedAudio: Blob) => void
}

export function AudioProcessor({ audioFile, theme, onProcessedAudio }: AudioProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [tempo, setTempo] = useState(1)
  const [reverb, setReverb] = useState(0)
  const [bass, setBass] = useState(0)
  const [treble, setTreble] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const filterNodeRef = useRef<BiquadFilterNode | null>(null)

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.addEventListener('loadedmetadata', () => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration)
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

  const initializeAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  const playAudio = async () => {
    if (!audioFile || !audioContextRef.current) return

    try {
      setIsProcessing(true)
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      
      // Create audio nodes
      sourceNodeRef.current = audioContextRef.current.createBufferSource()
      gainNodeRef.current = audioContextRef.current.createGain()
      filterNodeRef.current = audioContextRef.current.createBiquadFilter()
      
      // Configure nodes
      sourceNodeRef.current.buffer = audioBuffer
      gainNodeRef.current.gain.value = volume
      filterNodeRef.current.type = 'lowpass'
      filterNodeRef.current.frequency.value = 1000 + (bass * 500)
      
      // Connect nodes
      sourceNodeRef.current.connect(gainNodeRef.current)
      gainNodeRef.current.connect(filterNodeRef.current)
      filterNodeRef.current.connect(audioContextRef.current.destination)
      
      // Play
      sourceNodeRef.current.start(0)
      setIsPlaying(true)
      setIsProcessing(false)
      
      // Handle end
      sourceNodeRef.current.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      setIsProcessing(false)
    }
  }

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      setIsPlaying(false)
    }
  }

  const processAudio = async () => {
    if (!audioFile || !audioContextRef.current) return

    try {
      setIsProcessing(true)
      
      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        audioContextRef.current.sampleRate,
        audioContextRef.current.sampleRate * duration
      )
      
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer)
      
      // Create and configure nodes
      const source = offlineContext.createBufferSource()
      const gain = offlineContext.createGain()
      const filter = offlineContext.createBiquadFilter()
      const reverbNode = offlineContext.createConvolver()
      
      source.buffer = audioBuffer
      gain.gain.value = volume
      filter.type = 'lowpass'
      filter.frequency.value = 1000 + (bass * 500)
      
      // Connect nodes
      source.connect(gain)
      gain.connect(filter)
      filter.connect(offlineContext.destination)
      
      // Start processing
      source.start(0)
      
      // Render processed audio
      const renderedBuffer = await offlineContext.startRendering()
      
      // Convert to blob
      const processedAudio = new Blob([renderedBuffer], { type: 'audio/wav' })
      onProcessedAudio(processedAudio)
      
      setIsProcessing(false)
    } catch (error) {
      console.error('Error processing audio:', error)
      setIsProcessing(false)
    }
  }

  const resetSettings = () => {
    setVolume(1)
    setPitch(1)
    setTempo(1)
    setReverb(0)
    setBass(0)
    setTreble(0)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!audioFile) return null

  return (
    <Card className={`shadow-xl border-0 ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      <CardHeader className={`bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg`}>
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Waves className="w-6 h-6" />
          </div>
          <div>
            <div>עיבוד אודיו מתקדם</div>
            <div className="text-sm font-normal opacity-90">עריכה והשפעות אודיו</div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Audio Player */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={isPlaying ? stopAudio : playAudio}
              disabled={isProcessing}
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
          
          <audio ref={audioRef} className="hidden" />
        </div>

        {/* Audio Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volume Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-purple-500" />
              <span className="font-medium">עוצמה</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([value]) => setVolume(value)}
              max={2}
              min={0}
              step={0.1}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">
              {Math.round(volume * 100)}%
            </div>
          </div>

          {/* Bass Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-blue-500" />
              <span className="font-medium">באס</span>
            </div>
            <Slider
              value={[bass]}
              onValueChange={([value]) => setBass(value)}
              max={1}
              min={-1}
              step={0.1}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">
              {bass > 0 ? `+${Math.round(bass * 100)}%` : `${Math.round(bass * 100)}%`}
            </div>
          </div>

          {/* Treble Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">טרבל</span>
            </div>
            <Slider
              value={[treble]}
              onValueChange={([value]) => setTreble(value)}
              max={1}
              min={-1}
              step={0.1}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">
              {treble > 0 ? `+${Math.round(treble * 100)}%` : `${Math.round(treble * 100)}%`}
            </div>
          </div>

          {/* Reverb Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-green-500" />
              <span className="font-medium">הד</span>
            </div>
            <Slider
              value={[reverb]}
              onValueChange={([value]) => setReverb(value)}
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
            <div className="text-sm text-gray-500 text-center">
              {Math.round(reverb * 100)}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            onClick={processAudio}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl h-14 flex items-center gap-3 justify-center"
          >
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Waves className="w-6 h-6" />
                </div>
            <div>
              <div className="font-medium">{isProcessing ? 'מעבד...' : 'עבד אודיו'}</div>
              <div className="text-xs opacity-80">החל השפעות</div>
            </div>
          </Button>

          <Button
            onClick={resetSettings}
            variant="outline"
            className="h-14 px-8 border-2 hover:border-purple-500 transition-all duration-200 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <div className="font-medium">אפס</div>
              <div className="text-xs opacity-80">הגדרות ברירת מחדל</div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
