import { useState } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { testAIConnection, type AITestResult } from '@/lib/ai-service'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, CheckCircle2, XCircle, Zap, FolderOpen, Cloud, HardDrive, Info } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SettingsViewProps {
  onBack: () => void
}

export function SettingsView({ onBack: _onBack }: SettingsViewProps) {
  const settings = useSettingsStore()
  const { profile } = useAuthStore()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<AITestResult | null>(null)

  const handleTestAI = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testAIConnection(settings.aiModel)
      setTestResult(result)
    } catch (err) {
      setTestResult({
        test: true,
        success: false,
        model: settings.aiModel,
        provider: settings.aiModel.startsWith('claude-') ? 'Anthropic' : 'OpenAI',
        error: `Váratlan hiba: ${(err as Error).message}`,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center gap-2">
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
            </div>
          </div>
          {profile?.storage_preference === 'gdrive' ? (
            <>
              <div className="rounded-lg border border-blue-300 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Cloud className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Adattárolás: Saját Google Drive</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Az adataid a saját Drive-odon, az <strong>Emlékkönyv</strong> mappában vannak. Mi nem látjuk őket — csak te és a Google.
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      Megosztás és együttműködés ebben a módban nem elérhető.
                    </p>
                  </div>
                </div>
              </div>
              <AiTransparencyCard />
            </>
          ) : profile?.storage_preference === 'fs_local' ? (
            <>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <FolderOpen className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">Adattárolás: Saját mappa a gépeden</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Az adataid egy mappában vannak a saját gépeden. Mi nem látjuk őket — csak te és az operációs rendszered.
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      Készíts másolatot a mappáról rendszeresen biztonsági mentés gyanánt. Megosztás és együttműködés ebben a módban nem elérhető.
                    </p>
                  </div>
                </div>
              </div>
              <AiTransparencyCard />
            </>
          ) : (
            <div className="rounded-lg border border-green-300 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <HardDrive className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Adattárolás: Felhő (szinkronizált)</p>
                  <p className="text-sm text-green-800 mt-1">
                    Az adataid biztonságosan a felhőben vannak, bármelyik eszközről elérheted.
                  </p>
                </div>
              </div>
            </div>
          )}
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-3">AI beállítások</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>AI modell</Label>
                <select
                  value={settings.aiModel}
                  onChange={e => {
                    settings.updateSettings({ aiModel: e.target.value })
                    setTestResult(null) // Reset test when model changes
                  }}
                  className="text-sm border rounded-md px-2 py-1"
                >
                  <optgroup label="OpenAI">
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-5.4-mini">GPT-5.4 Mini</option>
                  </optgroup>
                  <optgroup label="Anthropic (Claude)">
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  </optgroup>
                </select>
              </div>

              {/* API Test Button */}
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-xs font-medium">API Kapcsolat Teszt</Label>
                    <p className="text-xs text-muted-foreground">
                      Ellenőrzi, hogy a kiválasztott modell elérhető-e
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestAI}
                    disabled={testing}
                    className="gap-1.5"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Tesztelés...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Teszt
                      </>
                    )}
                  </Button>
                </div>

                {testResult && (
                  <div className={`rounded-md p-2.5 text-xs space-y-1 ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200'
                      : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                  }`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      {testResult.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                      {testResult.success ? 'Sikeres kapcsolat!' : 'Hiba történt!'}
                    </div>
                    <div><strong>Modell:</strong> {testResult.model}</div>
                    <div><strong>Provider:</strong> {testResult.provider}</div>
                    {testResult.success && testResult.response && (
                      <div><strong>AI válasz:</strong> "{testResult.response}"</div>
                    )}
                    {!testResult.success && testResult.error && (
                      <div><strong>Hiba:</strong> {testResult.error}</div>
                    )}
                    {!testResult.success && testResult.details && (
                      <details className="mt-1">
                        <summary className="cursor-pointer font-medium">Részletes hibaüzenet</summary>
                        <pre className="mt-1 whitespace-pre-wrap break-all text-[10px] bg-white/50 dark:bg-black/20 p-1.5 rounded">
                          {testResult.details}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <Label>AI válaszok felolvasása</Label>
                  <p className="text-xs text-muted-foreground">Minden AI válasz automatikus felolvasása</p>
                </div>
                <button
                  onClick={() => settings.updateSettings({ ttsEnabled: !settings.ttsEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings.ttsEnabled ? 'bg-primary' : 'bg-input'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.ttsEnabled ? 'translate-x-5' : ''}`} />
                </button>
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

function AiTransparencyCard() {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="font-medium text-foreground">Hogyan kezeljük az adataidat?</p>
          <p className="text-xs text-muted-foreground">
            A naplóid, személyeid, helyszíneid és emlékeid <strong>kizárólag a kiválasztott helyen</strong> vannak tárolva.
            Mi a szerverünkön nem őrzünk meg semmit ebből.
          </p>
          <p className="text-xs text-muted-foreground">
            <strong>AI segítség:</strong> amikor az AI-val beszélgetsz, a kérdés és a válasz <strong>áthalad</strong> a szerverünkön
            (mert onnan hívjuk az AI-modellt), de <strong>nem tároljuk</strong> — közvetlenül a választott helyedre íródik.
          </p>
        </div>
      </div>
    </div>
  )
}
