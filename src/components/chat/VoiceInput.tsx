import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Mic } from 'lucide-react'

interface VoiceInputProps {
  onVoiceText: (text: string) => void
  disabled?: boolean
}

// Extend Window for webkit prefixed API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event & { error: string }) => void) | null
  onend: (() => void) | null
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionInstance)
    | null
}

export function VoiceInput({ onVoiceText, disabled }: VoiceInputProps) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onVoiceTextRef = useRef(onVoiceText)

  // Keep callback ref in sync without re-creating the recognition instance
  useEffect(() => {
    onVoiceTextRef.current = onVoiceText
  }, [onVoiceText])

  useEffect(() => {
    setSupported(getSpeechRecognitionConstructor() !== null)
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'hu-HU'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript) {
        onVoiceTextRef.current(transcript)
      }
    }

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error)
      // 'not-allowed' = mic permission denied, 'no-speech' = silence timeout
      setListening(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      // In continuous mode, the browser may stop on its own (e.g. silence).
      // We just clean up state.
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [])

  const toggle = useCallback(() => {
    if (listening) {
      stop()
    } else {
      start()
    }
  }, [listening, start, stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  if (!supported) return null

  return (
    <div className="relative flex items-end">
      <Button
        type="button"
        variant={listening ? 'destructive' : 'outline'}
        size="icon"
        onClick={toggle}
        disabled={disabled}
        className={`flex-shrink-0 h-[44px] w-[44px] ${
          listening ? 'animate-pulse' : ''
        }`}
        title={listening ? 'Leállítás' : 'Hangbevitel'}
      >
        <Mic className="w-4 h-4" />
      </Button>
      {listening && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-red-500 whitespace-nowrap font-medium">
          Hallgatom...
        </span>
      )}
    </div>
  )
}
