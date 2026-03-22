import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chat-store'
import type { SessionMode, SessionGoal } from '@/types'
import { MessageSquare, ClipboardList, Clock, Users, Briefcase } from 'lucide-react'

interface NewSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const modes: { value: SessionMode; label: string; description: string; icon: typeof MessageSquare }[] = [
  { value: 'free', label: 'Szabad mesélés', description: 'Szabadon mesélsz, az AI hallgat és kérdez', icon: MessageSquare },
  { value: 'interview', label: 'Célzott interjú', description: 'Strukturált kérdéssor egy adott témáról', icon: ClipboardList },
  { value: 'timeline', label: 'Idővonal-építés', description: 'Kronologikus haladás az élet mentén', icon: Clock },
  { value: 'family', label: 'Családi kapcsolatok', description: 'Családtagok, rokoni kapcsolatok feltárása', icon: Users },
  { value: 'career', label: 'Karrierinterjú', description: 'Munkahelyek, szakmai fejlődés', icon: Briefcase },
]

const goals: { value: SessionGoal; label: string }[] = [
  { value: 'childhood', label: 'Gyerekkor' },
  { value: 'family', label: 'Család' },
  { value: 'career', label: 'Munka és karrier' },
  { value: 'education', label: 'Iskolák, tanulmányok' },
  { value: 'relationships', label: 'Kapcsolatok' },
  { value: 'travel', label: 'Utazások' },
  { value: 'hardships', label: 'Nehéz időszakok' },
  { value: 'fond_memories', label: 'Kedves emlékek' },
  { value: 'turning_points', label: 'Fordulópontok' },
  { value: 'free', label: 'Szabad (nincs cél)' },
]

export function NewSessionDialog({ open, onOpenChange }: NewSessionDialogProps) {
  const [selectedMode, setSelectedMode] = useState<SessionMode>('free')
  const [selectedGoal, setSelectedGoal] = useState<SessionGoal>('free')
  const { createSession } = useChatStore()

  const handleStart = async () => {
    await createSession(selectedMode, selectedGoal === 'free' ? null : selectedGoal)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új beszélgetés</DialogTitle>
          <DialogDescription>Válaszd ki, milyen stílusban és miről szeretnél beszélgetni.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-4">
          <div>
            <h3 className="text-sm font-medium mb-3">Beszélgetés módja</h3>
            <div className="space-y-2">
              {modes.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => setSelectedMode(mode.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start gap-3 ${
                    selectedMode === mode.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <mode.icon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{mode.label}</p>
                    <p className="text-xs text-muted-foreground">{mode.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-3">Fókusz téma (opcionális)</h3>
            <div className="flex flex-wrap gap-2">
              {goals.map(goal => (
                <button
                  key={goal.value}
                  onClick={() => setSelectedGoal(goal.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedGoal === goal.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {goal.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleStart} className="w-full">
            Beszélgetés indítása
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
