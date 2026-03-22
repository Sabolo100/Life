import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth-store'
import { BookOpen, Settings, LogOut, Menu, FileText, Clock } from 'lucide-react'

interface HeaderProps {
  onToggleSidebar: () => void
  onShowLifeStory: () => void
  onShowTimeline: () => void
  onShowSettings: () => void
  aiStatus: 'ok' | 'unknown' | 'error'
  storageStatus: 'ok' | 'error'
}

export function Header({ onToggleSidebar, onShowLifeStory, onShowTimeline, onShowSettings, aiStatus, storageStatus }: HeaderProps) {
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
          <span className="font-semibold text-sm">Életút AI</span>
        </div>
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
        <Button variant="ghost" size="icon" onClick={onShowLifeStory}>
          <FileText className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShowTimeline}>
          <Clock className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onShowSettings}>
          <Settings className="w-4 h-4" />
        </Button>
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
