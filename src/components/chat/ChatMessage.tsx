import type { Message } from '@/types'
import { BookOpen, User } from 'lucide-react'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
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
      </div>
    </div>
  )
}
