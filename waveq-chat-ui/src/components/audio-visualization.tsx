'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Activity, Zap, Play, Pause } from 'lucide-react'

interface AudioVisualizationProps {
  audioFile: File
  theme?: 'dark' | 'light'
}

interface AudioAnalysisData {
  waveform: number[]
  spectrum: number[]
  rmsLevels: number[]
  peakLevels: number[]
  duration: number
  sampleRate: number
}

export function AudioVisualization({ audioFile, theme = 'light' }: AudioVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const rmsCanvasRef = useRef<HTMLCanvasElement>(null)
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentView, setCurrentView] = useState<'waveform' | 'spectrum' | 'levels'>('waveform')

  useEffect(() => {
    analyzeAudioFile()
  }, [audioFile])

  const analyzeAudioFile = async () => {
    if (!audioFile) return
    
    setIsAnalyzing(true)
    try {
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const channelData = audioBuffer.getChannelData(0)
      const sampleRate = audioBuffer.sampleRate
      const duration = audioBuffer.duration
      
      // Generate waveform data (downsampled for visualization)
      const waveformLength = 1000
      const stepSize = Math.floor(channelData.length / waveformLength)
      const waveform: number[] = []
      
      for (let i = 0; i < waveformLength; i++) {
        let sum = 0
        const start = i * stepSize
        const end = Math.min(start + stepSize, channelData.length)
        
        for (let j = start; j < end; j++) {
          sum += Math.abs(channelData[j])
        }
        waveform.push(sum / (end - start))
      }
      
      // Generate spectrum data using FFT simulation
      const spectrum: number[] = []
      const spectrumLength = 256
      for (let i = 0; i < spectrumLength; i++) {
        // Simulate frequency analysis (in real app, use actual FFT)
        const frequency = (i / spectrumLength) * (sampleRate / 2)
        let magnitude = 0
        
        // Sample some data points for frequency analysis
        const sampleSize = Math.min(1024, channelData.length)
        for (let j = 0; j < sampleSize; j++) {
          const sample = channelData[j]
          magnitude += Math.abs(sample * Math.cos(2 * Math.PI * frequency * j / sampleRate))
        }
        spectrum.push(magnitude / sampleSize)
      }
      
      // Generate RMS levels over time
      const rmsLength = 100
      const rmsStepSize = Math.floor(channelData.length / rmsLength)
      const rmsLevels: number[] = []
      const peakLevels: number[] = []
      
      for (let i = 0; i < rmsLength; i++) {
        const start = i * rmsStepSize
        const end = Math.min(start + rmsStepSize, channelData.length)
        
        let rms = 0
        let peak = 0
        for (let j = start; j < end; j++) {
          const sample = Math.abs(channelData[j])
          rms += sample * sample
          if (sample > peak) peak = sample
        }
        rms = Math.sqrt(rms / (end - start))
        
        rmsLevels.push(rms)
        peakLevels.push(peak)
      }
      
      setAnalysisData({
        waveform,
        spectrum,
        rmsLevels,
        peakLevels,
        duration,
        sampleRate
      })
      
      audioContext.close()
    } catch (error) {
      console.error('Error analyzing audio:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const drawWaveform = () => {
    const canvas = canvasRef.current
    if (!canvas || !analysisData) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    
    // Set colors based on theme
    const lineColor = theme === 'dark' ? '#60a5fa' : '#3b82f6'
    const backgroundColor = theme === 'dark' ? '#1f2937' : '#f8fafc'
    const gridColor = theme === 'dark' ? '#374151' : '#e2e8f0'
    
    // Draw background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    // Draw grid
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = (i / 10) * height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Draw waveform
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 2
    ctx.beginPath()
    
    const { waveform } = analysisData
    const xStep = width / waveform.length
    
    for (let i = 0; i < waveform.length; i++) {
      const x = i * xStep
      const y = height / 2 - (waveform[i] * height / 2)
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    
    // Draw center line
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  }

  const drawSpectrum = () => {
    const canvas = spectrumCanvasRef.current
    if (!canvas || !analysisData) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    
    const barColor = theme === 'dark' ? '#10b981' : '#059669'
    const backgroundColor = theme === 'dark' ? '#1f2937' : '#f8fafc'
    
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    const { spectrum } = analysisData
    const barWidth = width / spectrum.length
    
    ctx.fillStyle = barColor
    for (let i = 0; i < spectrum.length; i++) {
      const barHeight = spectrum[i] * height
      const x = i * barWidth
      const y = height - barHeight
      
      ctx.fillRect(x, y, barWidth - 1, barHeight)
    }
  }

  const drawLevels = () => {
    const canvas = rmsCanvasRef.current
    if (!canvas || !analysisData) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    
    const rmsColor = theme === 'dark' ? '#f59e0b' : '#d97706'
    const peakColor = theme === 'dark' ? '#ef4444' : '#dc2626'
    const backgroundColor = theme === 'dark' ? '#1f2937' : '#f8fafc'
    
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)
    
    const { rmsLevels, peakLevels } = analysisData
    const xStep = width / rmsLevels.length
    
    // Draw RMS levels
    ctx.strokeStyle = rmsColor
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let i = 0; i < rmsLevels.length; i++) {
      const x = i * xStep
      const y = height - (rmsLevels[i] * height)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    
    // Draw peak levels
    ctx.strokeStyle = peakColor
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < peakLevels.length; i++) {
      const x = i * xStep
      const y = height - (peakLevels[i] * height)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  useEffect(() => {
    if (analysisData) {
      drawWaveform()
      drawSpectrum()
      drawLevels()
    }
  }, [analysisData, theme])

  if (isAnalyzing) {
    return (
      <Card className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className={`${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              מנתח את הקובץ ויוצר ויזואליזציה...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ניתוח ויזואלי של הקובץ
          </CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={currentView === 'waveform' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('waveform')}
              className="flex items-center space-x-2"
            >
              <Activity className="w-4 h-4" />
              <span>צורת גל</span>
            </Button>
            <Button
              variant={currentView === 'spectrum' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('spectrum')}
              className="flex items-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>ספקטרום</span>
            </Button>
            <Button
              variant={currentView === 'levels' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentView('levels')}
              className="flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>רמות</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {currentView === 'waveform' && (
            <div>
              <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                צורת הגל - תצוגת עוצמה לאורך זמן
              </h4>
              <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full border rounded-lg"
                style={{ maxHeight: '200px' }}
              />
            </div>
          )}
          
          {currentView === 'spectrum' && (
            <div>
              <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                ניתוח ספקטרום - רמת תדרים
              </h4>
              <canvas
                ref={spectrumCanvasRef}
                width={800}
                height={200}
                className="w-full border rounded-lg"
                style={{ maxHeight: '200px' }}
              />
            </div>
          )}
          
          {currentView === 'levels' && (
            <div>
              <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                רמות RMS ושיאים לאורך זמן
              </h4>
              <canvas
                ref={rmsCanvasRef}
                width={800}
                height={200}
                className="w-full border rounded-lg"
                style={{ maxHeight: '200px' }}
              />
              <div className="flex items-center space-x-6 mt-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-amber-500' : 'bg-amber-600'}`}></div>
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>רמת RMS (עוצמה ממוצעת)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-red-500' : 'bg-red-600'}`}></div>
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>רמות שיא</span>
                </div>
              </div>
            </div>
          )}
          
          {analysisData && (
            <div className={`text-xs space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <p><strong>משך הקובץ:</strong> {Math.round(analysisData.duration * 10) / 10} שניות</p>
              <p><strong>תדר דגימה:</strong> {analysisData.sampleRate.toLocaleString()} Hz</p>
              <p><strong>נקודות נתונים:</strong> {analysisData.waveform.length.toLocaleString()} (מדגם)</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
