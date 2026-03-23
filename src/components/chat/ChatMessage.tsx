import { useState, useEffect } from 'react'
import type { Message } from '@/types'
import { BookOpen, User, Volume2, VolumeX } from 'lucide-react'
import { speakText, stopSpeaking, isSpeaking } from '@/lib/tts-service'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      if (!isSpeaking()) {
        setPlaying(false)
      }
    }, 300)
    return () => clearInterval(interval)
  }, [playing])

  const handleToggleTts = () => {
    if (playing) {
      stopSpeaking()
      setPlaying(false)
    } else {
      speakText(message.content)
      setPlaying(true)
    }
  }

  if (message.is_user) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <button
          onClick={handleToggleTts}
          title={playing ? 'Felolvasás leállítása' : 'Felolvasás'}
          className="mt-2 p-1 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          {playing ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
