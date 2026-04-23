import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth-store'
import { BookOpen, Settings, LogOut, FileText, Clock, MapPin, Users, UserPlus, Eye, ChevronDown, MessageSquare, AlertCircle } from 'lucide-react'
import type { LifeStoryShare } from '@/types'

interface HeaderProps {
  onToggleSidebar: () => void
  onGoHome: () => void
  onShowLifeStory: () => void
  onShowTimeline: () => void
  onShowMap: () => void
  onShowRelationships: () => void
  onShowSettings: () => void
  onShowInvitations: () => void
  onShowShared: (share: LifeStoryShare) => void
  aiStatus: 'ok' | 'unknown' | 'error'
  storageStatus: 'ok' | 'error'
  pendingContribCount?: number
  pendingReceivedInvites?: number
  incomingShares?: LifeStoryShare[]
  hasNewShares?: boolean
}

export function Header({
  onToggleSidebar, onGoHome, onShowLifeStory, onShowTimeline, onShowMap,
  onShowRelationships, onShowSettings, onShowInvitations, onShowShared,
  aiStatus, storageStatus, pendingContribCount = 0, pendingReceivedInvites = 0,
  incomingShares = [], hasNewShares = false,
}: HeaderProps) {
  const { profile, signOut } = useAuthStore()
  const [sharesOpen, setSharesOpen] = useState(false)
  const sharesRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!sharesOpen) return
    const handleClick = (e: MouseEvent) => {
      if (sharesRef.current && !sharesRef.current.contains(e.target as Node)) {
        setSharesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [sharesOpen])

  const statusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-green-500'
      case 'error': return 'bg-red-500 animate-pulse'
      default: return 'bg-gray-400'
    }
  }

  const totalAlerts = pendingContribCount + pendingReceivedInvites

  return (
    <header className="h-14 border-b border-amber-200/50 flex items-center px-4 gap-1 bg-[#f8f4ee]/90 backdrop-blur sticky top-0 z-50">
      {/* LEFT side */}
      <div className="flex items-center gap-1">
        {/* Logo — acts as home button */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-1"
        >
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Emlékkönyv</span>
        </button>

        {/* Chat icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
              <MessageSquare className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Beszélgetések</TooltipContent>
        </Tooltip>

        {/* Life story icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowLifeStory}>
              <FileText className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Emlékkönyv</TooltipContent>
        </Tooltip>

        {/* Timeline icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowTimeline}>
              <Clock className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Idővonal</TooltipContent>
        </Tooltip>

        {/* Map icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowMap}>
              <MapPin className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Helyszínek</TooltipContent>
        </Tooltip>

        {/* Relationships icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowRelationships}>
              <Users className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kapcsolatok</TooltipContent>
        </Tooltip>

        {/* "Mások élete" — dropdown for shared stories */}
        {incomingShares.length > 0 && (
          <div className="relative" ref={sharesRef}>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-8"
                  onClick={() => setSharesOpen(!sharesOpen)}
                >
                  <Eye className="w-4 h-4" />
                  <span>Mások élete</span>
                  {hasNewShares && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Megosztott emlékkönyvek</TooltipContent>
            </Tooltip>
            {sharesOpen && (
              <div className="absolute left-0 top-full mt-1 w-60 bg-background border rounded-xl shadow-xl z-50 py-1">
                <p className="px-3 py-1.5 text-[10px] uppercase text-muted-foreground font-medium">
                  Megosztva velem
                </p>
                {incomingShares.map(share => (
                  <button
                    key={share.id}
                    onClick={() => {
                      onShowShared(share)
                      setSharesOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                      {(share.owner_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{share.owner_name || 'Valaki'}</p>
                      <p className="text-[10px] text-muted-foreground">emlékkönyve</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT side */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Invitations with badge */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowInvitations} className="relative">
              <UserPlus className="w-4 h-4" />
              {totalAlerts > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                >
                  {totalAlerts}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Meghívók & Megosztás</TooltipContent>
        </Tooltip>

        {/* AI status */}
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5 px-1 cursor-default">
              <div className={`w-2 h-2 rounded-full ${statusColor(aiStatus)}`} />
              <span className="text-xs text-muted-foreground">AI</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {aiStatus === 'ok' ? 'AI elérhető' : aiStatus === 'error' ? 'AI nem elérhető' : 'AI ellenőrzés…'}
          </TooltipContent>
        </Tooltip>

        {/* Storage status — desktop only */}
        <Tooltip>
          <TooltipTrigger>
            <div className="hidden sm:flex items-center gap-1.5 px-1 cursor-default">
              <div className={`w-2 h-2 rounded-full ${statusColor(storageStatus)}`} />
              <span className="text-xs text-muted-foreground">Tárolás</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {storageStatus === 'ok' ? 'Szinkronban' : 'Szinkronizációs hiba'}
          </TooltipContent>
        </Tooltip>

        {/* Settings */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowSettings}>
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Beállítások</TooltipContent>
        </Tooltip>

        {/* Profile name */}
        {profile && (
          <span className="text-sm text-muted-foreground hidden sm:inline">{profile.display_name}</span>
        )}

        {/* Logout */}
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
