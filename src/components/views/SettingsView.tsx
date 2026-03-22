import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SettingsViewProps {
  onBack: () => void
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const settings = useSettingsStore()
  const { profile } = useAuthStore()

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold">Beállítások</h2>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Profil</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Név</Label>
                <span className="text-sm text-muted-foreground">{profile?.display_name || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <Label>Adattárolás</Label>
                <span className="text-sm text-muted-foreground capitalize">{profile?.storage_preference || 'cloud'}</span>
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-3">AI beállítások</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>AI modell</Label>
                <select
                  value={settings.aiModel}
                  onChange={e => settings.updateSettings({ aiModel: e.target.value })}
                  className="text-sm border rounded-md px-2 py-1"
                >
                  <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4.1">GPT-4.1</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-5.4-mini">GPT-5.4 Mini</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <Label>Témajavaslatok</Label>
                  <p className="text-xs text-muted-foreground">Javaslat-chipek a válaszok után</p>
                </div>
                <button
                  onClick={() => settings.updateSettings({ topicHints: !settings.topicHints })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.topicHints ? 'bg-primary' : 'bg-input'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.topicHints ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <Label>Érzelmi réteg rögzítése</Label>
                  <p className="text-xs text-muted-foreground">Érzelmek és fontosság rögzítése</p>
                </div>
                <button
                  onClick={() => settings.updateSettings({ emotionalLayer: !settings.emotionalLayer })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.emotionalLayer ? 'bg-primary' : 'bg-input'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.emotionalLayer ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
