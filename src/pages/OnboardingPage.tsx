import { useState } from 'react'
import { MosaicBackground } from '@/components/MosaicBackground'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { gdriveAdapter, fsAdapter, isFileSystemAccessSupported } from '@/lib/storage'
import {
  BookOpen, MessageSquare, Shield, Pencil, Download,
  ArrowRight, Cloud, HardDrive, FolderOpen, Loader2,
} from 'lucide-react'
import type { StoragePreference } from '@/types'

const steps = [
  {
    icon: BookOpen,
    title: 'Üdvözlünk az Emlékkönyvben!',
    description: 'Ez az alkalmazás segít felépíteni és megőrizni a személyes élettörténetedet. Egy empatikus AI beszélgetőtárs kérdez, hallgat, és közben automatikusan összeállítja az emlékkönyvedet.',
  },
  {
    icon: MessageSquare,
    title: 'Hogyan működik?',
    description: 'Az AI kérdéseket tesz fel az életedről — gyerekkorodról, családodról, munkádról, fontos emlékeidről. Te mesélsz szöveggel vagy akár hanggal, az AI pedig automatikusan rendszerezi az információkat.',
  },
  {
    icon: Shield,
    title: 'Az adataid biztonságban vannak',
    description: 'Az AI empatikus és türelmes — nem siettet, és bármilyen részletességgel mesélhetsz. Nem kell pontos dátumokat tudnod, a rendszer kezeli a bizonytalanságokat is.',
  },
  {
    icon: Pencil,
    title: 'Te irányítasz',
    description: 'Az összegyűjtött életutat bármikor megtekintheted, szerkesztheted, pontosíthatod. Az AI csak javasol, a végső szó mindig a tiéd.',
  },
  {
    icon: Download,
    title: 'Mentés és export',
    description: 'Az életutadat bármikor letöltheted PDF, Word vagy JSON formátumban. Készíthetsz biztonsági mentést is, amelyet másik eszközön visszaállíthatsz.',
  },
]

const STORAGE_STEP_INDEX = steps.length // 5 → the 6th step

type StorageChoice = StoragePreference | null
type SubChoice = 'gdrive' | 'fs_local' | null

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const { updateProfile } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Top-level: cloud / own-database / null
  const [topChoice, setTopChoice] = useState<'cloud' | 'own' | null>('cloud')
  // Sub-choice (only when topChoice === 'own'): gdrive / fs_local
  const [subChoice, setSubChoice] = useState<SubChoice>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectedFor, setConnectedFor] = useState<SubChoice>(null)

  const fsSupported = isFileSystemAccessSupported()

  const isStorageStep = step === STORAGE_STEP_INDEX
  const totalSteps = steps.length + 1

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    }
  }

  const finalChoice: StorageChoice =
    topChoice === 'cloud' ? 'cloud'
    : topChoice === 'own' && connectedFor ? connectedFor
    : null

  const canFinish = finalChoice !== null && !connecting

  // ── Connect handlers ──────────────────────────────────────────────

  const handleConnectGDrive = async () => {
    setError(null)
    setConnecting(true)
    try {
      await gdriveAdapter.connectAndCreateFolder()
      setSubChoice('gdrive')
      setConnectedFor('gdrive')
    } catch (err) {
      setError((err as Error).message || 'Google Drive csatlakozás sikertelen.')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnectFs = async () => {
    setError(null)
    setConnecting(true)
    try {
      await fsAdapter.connectAndPickFolder()
      setSubChoice('fs_local')
      setConnectedFor('fs_local')
    } catch (err) {
      // User cancellation throws AbortError — silent.
      const e = err as Error
      if (e.name !== 'AbortError') {
        setError(e.message || 'Mappa kiválasztása sikertelen.')
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleFinish = async () => {
    if (!finalChoice) return
    setSaving(true)
    await updateProfile({
      storage_preference: finalChoice,
      onboarding_completed: true,
      privacy_accepted_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  const currentStep = !isStorageStep ? steps[step] : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f4ee] relative p-4">
      <MosaicBackground opacity={0.35} />
      <Card className="w-full max-w-lg relative z-10 bg-[#faf7f2]/90 backdrop-blur-md shadow-xl shadow-amber-900/10 border-amber-200/50">
        {!isStorageStep && currentStep ? (
          <>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <currentStep.icon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-8">{currentStep.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
                  ))}
                </div>
                <Button onClick={handleNext}>
                  Tovább <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Hol tároljuk az életutadat?</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Ezt később NEM tudod módosítani, válassz figyelmesen.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {/* Cloud option */}
                <button
                  type="button"
                  onClick={() => { setTopChoice('cloud'); setSubChoice(null); setConnectedFor(null); setError(null) }}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                    topChoice === 'cloud'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      topChoice === 'cloud' ? 'bg-primary/15' : 'bg-muted'
                    }`}>
                      <Cloud className={`w-5 h-5 ${topChoice === 'cloud' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Felhő (ajánlott)</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Biztonságos, automatikus backup. Bárhonnan elérheted, megoszthatod másokkal, együttműködhetsz családdal, barátokkal.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Own database option */}
                <button
                  type="button"
                  onClick={() => { setTopChoice('own'); setError(null) }}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                    topChoice === 'own'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      topChoice === 'own' ? 'bg-primary/15' : 'bg-muted'
                    }`}>
                      <HardDrive className={`w-5 h-5 ${topChoice === 'own' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Saját adatbázis</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Te választod a tárolás helyét — Google Drive-od vagy a saját géped. Mi sosem látjuk az adatokat. Megosztás és együttműködés ebben a módban nem elérhető.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Sub-choice when "own" is selected */}
                {topChoice === 'own' && (
                  <div className="ml-4 pl-4 border-l-2 border-primary/30 space-y-2">
                    {/* Google Drive */}
                    <div className={`rounded-lg border p-3 ${
                      connectedFor === 'gdrive' ? 'border-green-500 bg-green-50' : 'border-border bg-background'
                    }`}>
                      <div className="flex items-start gap-3">
                        <Cloud className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Google Drive mappa</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            A saját Drive-odon létrehozunk egy <strong>Emlékkönyv</strong> mappát. Cross-device, mobil + desktop.
                          </p>
                          {connectedFor === 'gdrive' ? (
                            <p className="text-xs text-green-700 mt-1.5 font-medium">✓ Drive mappa létrehozva</p>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={handleConnectGDrive}
                              disabled={connecting}
                            >
                              {connecting && subChoice !== 'fs_local' ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Csatlakozás…</>
                              ) : (
                                'Bejelentkezés Google-be'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* File System Access — desktop only */}
                    {fsSupported && (
                      <div className={`rounded-lg border p-3 ${
                        connectedFor === 'fs_local' ? 'border-green-500 bg-green-50' : 'border-border bg-background'
                      }`}>
                        <div className="flex items-start gap-3">
                          <FolderOpen className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Saját mappa a gépemen</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Egy mappát választasz a saját gépeden — JSON fájlokba mentünk. Tényleg helyi, nincs cloud. <strong>Csak desktop böngészőben</strong>.
                            </p>
                            {connectedFor === 'fs_local' ? (
                              <p className="text-xs text-green-700 mt-1.5 font-medium">✓ Mappa kiválasztva</p>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={handleConnectFs}
                                disabled={connecting}
                              >
                                {connecting && subChoice !== 'gdrive' ? (
                                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Megnyitás…</>
                                ) : (
                                  'Mappa kiválasztása'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!fsSupported && (
                      <p className="text-xs text-muted-foreground italic px-1">
                        A "Saját mappa" opció csak desktop Chrome / Edge böngészőben elérhető.
                      </p>
                    )}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                    ⚠️ {error}
                  </div>
                )}

                {topChoice === 'own' && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    Az AI-segítséghez a beszélgetéseid áthaladnak a szerverünkön (de nem tároljuk őket — közvetlenül a választott helyedre kerülnek).
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
                  ))}
                </div>
                <Button onClick={handleFinish} disabled={saving || !canFinish}>
                  {saving ? 'Indítás...' : 'Kezdjük el!'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
