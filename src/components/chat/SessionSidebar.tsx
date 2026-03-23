import { useState, useRef } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react'
import type { SessionMode } from '@/types'

interface SessionSidebarProps {
  onClose?: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)

  if (diffDays === 0) return 'Ma'
  if (diffDays === 1) return 'Tegnap'
  if (diffDays < 7) {
    const days = ['vasárnap', 'hétfőn', 'kedden', 'szerdán', 'csütörtökön', 'pénteken', 'szombaton']
    return days[d.getDay()]
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return year === now.getFullYear()
    ? `${month}.${day}.`
    : `${year}.${month}.${day}.`
}

export function SessionSidebar({ onClose }: SessionSidebarProps) {
  const { sessions, currentSession, createSession, selectSession, deleteSession, updateSessionTitle } = useChatStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleNewSession = async () => {
    await createSession('free' as SessionMode, null)
    onClose?.()
  }

  const handleSelect = async (id: string) => {
    if (editingId) return
    await selectSession(id)
    onClose?.()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('Biztosan törölni szeretnéd ezt a beszélgetést?')) {
      await deleteSession(id)
    }
  }

  const startEdit = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation()
    setEditingId(id)
    setEditValue(currentTitle)
    setTimeout(() => inputRef.current?.select(), 50)
  }

  const commitEdit = async () => {
    if (editingId && editValue.trim()) {
      await updateSessionTitle(editingId, editValue)
    }
    setEditingId(null)
  }

  const cancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') cancelEdit()
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
              className={`w-full text-left px-3 py-2 rounded-md flex items-start gap-2 group transition-colors ${
                currentSession?.id === session.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              }`}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {editingId === session.id ? (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={commitEdit}
                      className="flex-1 text-sm bg-background border border-border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary min-w-0"
                      autoFocus
                    />
                    <button
                      onMouseDown={e => { e.preventDefault(); commitEdit() }}
                      className="p-0.5 hover:text-primary flex-shrink-0"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onMouseDown={e => { e.preventDefault(); cancelEdit(e) }}
                      className="p-0.5 hover:text-destructive flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-sm truncate block">{session.title}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDate(session.created_at)}
                </span>
              </div>
              {editingId !== session.id && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={e => startEdit(e, session.id, session.title)}
                    className="p-1 hover:text-primary"
                    title="Átnevezés"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="p-1 hover:text-destructive"
                    title="Törlés"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
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
