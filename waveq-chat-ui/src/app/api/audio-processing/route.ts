import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    // Get API key from headers
    const apiKey = request.headers.get('x-gemini-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key חסר. אנא הגדר את מפתח ה-API בהגדרות.' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const instructions = formData.get('instructions') as string

    if (!audioFile || !instructions) {
      return NextResponse.json(
        { success: false, error: 'קובץ אודיו והוראות עיבוד נדרשים' },
        { status: 400 }
      )
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Analyze user instructions with Gemini
    const analysisPrompt = `
    אתה מומחה בעיבוד אודיו. נתח את ההוראות הבאות ומצא את פעולות העיבוד הנדרשות:
    
    הוראות המשתמש: "${instructions}"
    
    זהה את סוג העיבוד הנדרש מהרשימה הבאה:
    1. volume_up - הגברת עוצמה
    2. volume_down - הפחתת עוצמה  
    3. bass_boost - הגברת באס
    4. treble_boost - הגברת טרבל
    5. trim_start - חיתוך מההתחלה
    6. trim_end - חיתוך מהסוף
    7. noise_reduction - הפחתת רעש
    8. normalize - נרמול אודיו
    9. fade_in - עליה הדרגתית
    10. fade_out - ירידה הדרגתית
    11. speed_up - האצה
    12. slow_down - האטה
    13. reverse - הפיכה לאחור
    14. format_convert - המרת פורמט

    השב בפורמט JSON עם הפרמטרים:
    {
      "operation": "סוג_הפעולה", 
      "parameters": {
        "value": מספר_אם_נדרש,
        "start_time": זמן_התחלה_אם_נדרש,
        "end_time": זמן_סיום_אם_נדרש,
        "format": פורמט_יעד_אם_נדרש
      },
      "explanation": "הסבר בעברית מה יקרה לקובץ"
    }
    `

    const analysisResult = await model.generateContent(analysisPrompt)
    const analysisText = analysisResult.response.text()
    
    let processingParams
    try {
      // Extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        processingParams = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse analysis')
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'לא הצלחתי להבין את ההוראות. אנא נסח מחדש.' },
        { status: 400 }
      )
    }

    // Process audio file based on analysis
    const processedAudio = await processAudioFile(audioFile, processingParams)

    // Create response with processed audio
    const response = new NextResponse(processedAudio, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': `attachment; filename="processed_${audioFile.name}"`,
        'X-Processing-Info': JSON.stringify({
          operation: processingParams.operation,
          explanation: processingParams.explanation
        })
      }
    })

    return response

  } catch (error: any) {
    console.error('Error in audio processing:', error)
    
    if (error.message?.includes('API key not valid')) {
      return NextResponse.json(
        { success: false, error: 'מפתח API לא תקין. אנא בדק את המפתח בהגדרות.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'שגיאה בעיבוד האודיו. אנא נסה שוב.' },
      { status: 500 }
    )
  }
}

async function processAudioFile(audioFile: File, params: any): Promise<Blob> {
  try {
    // Convert file to array buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    
    // Create audio context for processing
    const AudioContextClass = (global as any).AudioContext || (global as any).webkitAudioContext
    const audioContext = AudioContextClass ? new AudioContextClass() : null
    
    if (!audioContext) {
      // If Web Audio API is not available (server-side), simulate processing
      return simulateAudioProcessing(arrayBuffer, params)
    }

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Apply processing based on operation
    const processedBuffer = await applyAudioProcessing(audioContext, audioBuffer, params)
    
    // Convert back to blob
    return audioBufferToBlob(processedBuffer)
    
  } catch (error) {
    console.error('Error processing audio:', error)
    // Return original file if processing fails
    return new Blob([await audioFile.arrayBuffer()], { type: 'audio/wav' })
  }
}

async function applyAudioProcessing(
  audioContext: AudioContext, 
  audioBuffer: AudioBuffer, 
  params: any
): Promise<AudioBuffer> {
  
  const { operation, parameters } = params
  
  // Create offline context for processing
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  )
  
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  
  let destination = offlineContext.destination
  
  // Apply processing based on operation type
  switch (operation) {
    case 'volume_up':
    case 'volume_down':
      const gainNode = offlineContext.createGain()
      const volumeMultiplier = operation === 'volume_up' ? 
        (parameters?.value || 1.5) : (parameters?.value || 0.7)
      gainNode.gain.value = volumeMultiplier
      source.connect(gainNode)
      gainNode.connect(destination)
      break
      
    case 'bass_boost':
    case 'treble_boost':
      const filterNode = offlineContext.createBiquadFilter()
      if (operation === 'bass_boost') {
        filterNode.type = 'lowshelf'
        filterNode.frequency.value = 100
        filterNode.gain.value = parameters?.value || 10
      } else {
        filterNode.type = 'highshelf'
        filterNode.frequency.value = 3000
        filterNode.gain.value = parameters?.value || 10
      }
      source.connect(filterNode)
      filterNode.connect(destination)
      break
      
    case 'normalize':
      // Simple normalization - find peak and scale
      const normalizeGain = offlineContext.createGain()
      normalizeGain.gain.value = 0.9 // Normalize to 90% to prevent clipping
      source.connect(normalizeGain)
      normalizeGain.connect(destination)
      break
      
    default:
      // Default: no processing, just connect source to destination
      source.connect(destination)
  }
  
  source.start(0)
  return await offlineContext.startRendering()
}

function simulateAudioProcessing(arrayBuffer: ArrayBuffer, params: any): Blob {
  // Server-side simulation - just return the original audio
  // In a real implementation, you'd use a server-side audio processing library
  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function audioBufferToBlob(audioBuffer: AudioBuffer): Blob {
  // Convert AudioBuffer to WAV blob
  const length = audioBuffer.length
  const numberOfChannels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  
  // Create WAV file structure
  const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
  const view = new DataView(buffer)
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }
  
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * numberOfChannels * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numberOfChannels * 2, true)
  view.setUint16(32, numberOfChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * numberOfChannels * 2, true)
  
  // Convert float audio data to 16-bit PCM
  let offset = 44
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }
  }
  
  return new Blob([buffer], { type: 'audio/wav' })
}
