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
  const storagePref = profile?.storage_preference
  const isCloud = storagePref === 'cloud'
  const isGDrive = storagePref === 'gdrive'
  const isFsLocal = storagePref === 'fs_local'
  const isOwnDb = isGDrive || isFsLocal // "saját adatbázis" — disables sharing features
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
    <header className="h-14 border-b border-amber-200/50 flex items-center px-3 gap-1 bg-[#f8f4ee]/90 backdrop-blur sticky top-0 z-50 shrink-0">
      {/* Logo — always visible, never scrolls away */}
      <button
        onClick={onGoHome}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0 mr-1"
      >
        <BookOpen className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm hidden xs:inline">Emlékkönyv</span>
      </button>

      {/* Nav icons — horizontally scrollable on mobile so right side is always reachable */}
      <div className="flex items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0 flex-1">
        {/* Chat icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="shrink-0">
              <MessageSquare className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Beszélgetések</TooltipContent>
        </Tooltip>

        {/* Life story icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowLifeStory} className="shrink-0">
              <FileText className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Emlékkönyv</TooltipContent>
        </Tooltip>

        {/* Timeline icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowTimeline} className="shrink-0">
              <Clock className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Idővonal</TooltipContent>
        </Tooltip>

        {/* Map icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowMap} className="shrink-0">
              <MapPin className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Helyszínek</TooltipContent>
        </Tooltip>

        {/* Relationships icon */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowRelationships} className="shrink-0">
              <Users className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Kapcsolatok</TooltipContent>
        </Tooltip>

        {/* "Mások élete" — dropdown for shared stories */}
        {!isOwnDb && incomingShares.length > 0 && (
          <div className="relative shrink-0" ref={sharesRef}>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-8"
                  onClick={() => setSharesOpen(!sharesOpen)}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Mások élete</span>
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

      {/* RIGHT side — always visible, never pushed off-screen */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Invitations with badge */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              onClick={isOwnDb ? undefined : onShowInvitations}
              disabled={isOwnDb}
              className={`relative ${isOwnDb ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <UserPlus className="w-4 h-4" />
              {!isOwnDb && totalAlerts > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                >
                  {totalAlerts}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isOwnDb ? 'Csak felhő módban érhető el' : 'Meghívók & Megosztás'}</TooltipContent>
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
              <div className={`w-2 h-2 rounded-full ${
                isGDrive ? 'bg-blue-500'
                : isFsLocal ? 'bg-amber-700'
                : statusColor(storageStatus)
              }`} />
              <span className="text-xs text-muted-foreground">{
                isGDrive ? 'Drive'
                : isFsLocal ? 'Helyi'
                : 'Tárolás'
              }</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isGDrive
              ? 'Adatok a Google Drive-odon (Emlékkönyv mappa)'
              : isFsLocal
              ? 'Adatok egy saját mappában a gépeden'
              : isCloud
              ? (storageStatus === 'ok' ? 'Szinkronban (felhő)' : 'Szinkronizációs hiba')
              : 'Tárolás'}
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
