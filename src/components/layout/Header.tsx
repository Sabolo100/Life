import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth-store'
import { BookOpen, Settings, LogOut, Menu, FileText, Clock, MapPin, Users, UserPlus, Eye } from 'lucide-react'
import type { LifeStoryShare } from '@/types'

interface HeaderProps {
  onToggleSidebar: () => void
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
  incomingShares?: LifeStoryShare[]
}

export function Header({
  onToggleSidebar, onShowLifeStory, onShowTimeline, onShowMap,
  onShowRelationships, onShowSettings, onShowInvitations, onShowShared,
  aiStatus, storageStatus, pendingContribCount = 0, incomingShares = [],
}: HeaderProps) {
  const { profile, signOut } = useAuthStore()

  const statusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-green-500'
      case 'error': return 'bg-red-500 animate-pulse'
      default: return 'bg-gray-400'
    }
  }

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Emlékkönyv</span>
        </div>

        {/* Shared life stories — prominent in header */}
        {incomingShares.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 ml-3 border-l pl-3">
            {incomingShares.map(share => (
              <Tooltip key={share.id}>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => onShowShared(share)}
                  >
                    <Eye className="w-3 h-3" />
                    {share.owner_name || 'Valaki'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{share.owner_name || 'Valaki'} emlékkönyve</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
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
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" onClick={onShowInvitations} className="relative">
              <UserPlus className="w-4 h-4" />
              {pendingContribCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                >
                  {pendingContribCount}
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
