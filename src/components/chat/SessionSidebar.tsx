import { useChatStore } from '@/stores/chat-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, MessageSquare, Trash2 } from 'lucide-react'
import type { SessionMode } from '@/types'

interface SessionSidebarProps {
  onClose?: () => void
}

export function SessionSidebar({ onClose }: SessionSidebarProps) {
  const { sessions, currentSession, createSession, selectSession, deleteSession } = useChatStore()

  const handleNewSession = async () => {
    await createSession('free' as SessionMode, null)
    onClose?.()
  }

  const handleSelect = async (id: string) => {
    await selectSession(id)
    onClose?.()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Biztosan törölni szeretnéd ezt a beszélgetést?')) {
      await deleteSession(id)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button onClick={handleNewSession} className="w-full" variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Új beszélgetés
        </Button>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => handleSelect(session.id)}
              className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 group transition-colors ${
                currentSession?.id === session.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate flex-1">{session.title}</span>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Még nincs beszélgetésed
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
