import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { VoiceInput } from './VoiceInput'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  pendingMessage?: string | null
  onPendingConsumed?: () => void
}

export function ChatInput({ onSend, disabled, pendingMessage, onPendingConsumed }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (pendingMessage) {
      setValue(pendingMessage)
      onPendingConsumed?.()
      textareaRef.current?.focus()
    }
  }, [pendingMessage, onPendingConsumed])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleVoiceText = useCallback((text: string) => {
    setValue(prev => {
      const needsSpace = prev.length > 0 && !prev.endsWith(' ')
      return prev + (needsSpace ? ' ' : '') + text
    })
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-3xl mx-auto flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Írj egy üzenetet..."
          className="min-h-[44px] max-h-[150px] resize-none"
          rows={1}
          disabled={disabled}
        />
        <VoiceInput onVoiceText={handleVoiceText} disabled={disabled} />
        <Button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          size="icon"
          className="flex-shrink-0 h-[44px] w-[44px]"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
