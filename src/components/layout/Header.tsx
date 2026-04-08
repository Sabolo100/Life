import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth-store'
import { BookOpen, Settings, LogOut, Menu, FileText, Clock, MapPin, Users, UserPlus, Eye, ChevronDown } from 'lucide-react'
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
}

export function Header({
  onToggleSidebar, onGoHome, onShowLifeStory, onShowTimeline, onShowMap,
  onShowRelationships, onShowSettings, onShowInvitations, onShowShared,
  aiStatus, storageStatus, pendingContribCount = 0, pendingReceivedInvites = 0,
  incomingShares = [],
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
    <header className="h-14 border-b border-amber-200/50 flex items-center justify-between px-4 bg-[#f8f4ee]/90 backdrop-blur sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        {/* Logo — acts as home button */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Emlékkönyv</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-3 mr-4">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusColor(aiStatus)}`} />
                <span className="text-xs text-muted-foreground">AI</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {aiStatus === 'ok' ? 'AI elérhető' : aiStatus === 'error' ? 'AI nem elérhető' : 'Nem tesztelt'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusColor(storageStatus)}`} />
                <span className="text-xs text-muted-foreground">Tárolás</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {storageStatus === 'ok' ? 'Szinkronban' : 'Szinkronizációs hiba'}
            </TooltipContent>
          </Tooltip>
        </div>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowLifeStory}>
              <FileText className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Emlékkönyv</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowTimeline}>
              <Clock className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Idővonal</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowMap}>
              <MapPin className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Térkép</TooltipContent>
        </Tooltip>
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
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs h-9 px-2.5"
                  onClick={() => setSharesOpen(!sharesOpen)}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Mások élete</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Megosztott emlékkönyvek</TooltipContent>
            </Tooltip>
            {sharesOpen && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-background border rounded-xl shadow-xl z-50 py-1">
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
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowSettings}>
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Beállítások</TooltipContent>
        </Tooltip>
        {profile && (
          <span className="text-sm text-muted-foreground hidden sm:inline">{profile.display_name}</span>
        )}
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
