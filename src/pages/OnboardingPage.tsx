import { useState } from 'react'
import { MosaicBackground } from '@/components/MosaicBackground'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { gdriveAdapter, fsAdapter, isFileSystemAccessSupported } from '@/lib/storage'
import {
  BookOpen, MessageSquare, Shield, Pencil, Download,
  ArrowRight, Cloud, FolderOpen, Loader2, CheckCircle2,
  Users, AlertTriangle, Monitor, Smartphone, Globe,
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

const STORAGE_STEP_INDEX = steps.length
type StorageChoice = StoragePreference | null

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const { updateProfile } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<StorageChoice>('cloud')
  const [connecting, setConnecting] = useState(false)
  const [connectedFor, setConnectedFor] = useState<StorageChoice>(null)

  const fsSupported = isFileSystemAccessSupported()
  const isStorageStep = step === STORAGE_STEP_INDEX
  const totalSteps = steps.length + 1

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1)
  }

  // "cloud" doesn't need a connect step — always ready
  const canFinish =
    choice === 'cloud'
      ? true
      : choice !== null && connectedFor === choice && !connecting

  // ── Connect handlers ──────────────────────────────────────────────

  const handleConnectGDrive = async () => {
    setError(null)
    setConnecting(true)
    try {
      await gdriveAdapter.connectAndCreateFolder()
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
      setConnectedFor('fs_local')
    } catch (err) {
      const e = err as Error
      if (e.name !== 'AbortError') {
        setError(e.message || 'Mappa kiválasztása sikertelen.')
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleFinish = async () => {
    if (!choice) return
    setSaving(true)
    await updateProfile({
      storage_preference: choice,
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
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-xl">Hol tároljuk az életutadat?</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Ezt később nem tudod módosítani — válassz figyelmesen.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-5">

                {/* ── 1. Emlékkönyv felhő ── */}
                <StorageCard
                  selected={choice === 'cloud'}
                  onClick={() => { setChoice('cloud'); setError(null) }}
                  icon={<Cloud className="w-5 h-5 text-primary" />}
                  iconBg={choice === 'cloud' ? 'bg-primary/15' : 'bg-muted'}
                  badge="Ajánlott"
                  badgeColor="bg-primary/10 text-primary"
                  title="Emlékkönyv felhő"
                  description="Biztonságos, titkosított tárolás a mi szerverünkön. Automatikus mentés, minden eszközödről elérhető."
                >
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <FeatureRow icon={<CheckCircle2 className="w-3 h-3 text-green-600" />} label="Minden eszközön működik" />
                    <FeatureRow icon={<CheckCircle2 className="w-3 h-3 text-green-600" />} label="Automatikus backup" />
                    <FeatureRow icon={<Users className="w-3 h-3 text-green-600" />} label="Megosztás, együttműködés" />
                    <FeatureRow icon={<CheckCircle2 className="w-3 h-3 text-green-600" />} label="Adatvesztés kockázata: nincs" />
                  </div>
                </StorageCard>

                {/* ── 2. Google Drive ── */}
                <StorageCard
                  selected={choice === 'gdrive'}
                  onClick={() => { setChoice('gdrive'); setError(null) }}
                  icon={
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path d="M4.5 19.5L8 13.5H20.5L17 19.5H4.5Z" fill="#34A853"/>
                      <path d="M8 13.5L12 6H14L18 13.5H8Z" fill="#4285F4"/>
                      <path d="M2 19.5L6 13.5L9 6H12L8 13.5L4.5 19.5H2Z" fill="#FBBC04"/>
                    </svg>
                  }
                  iconBg="bg-white border border-border"
                  title="Saját Google Drive"
                  description="Az adataid a saját Google Drive-fiókodban tárolódnak — mi sosem férünk hozzá."
                >
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <FeatureRow icon={<CheckCircle2 className="w-3 h-3 text-green-600" />} label="iPhone, Android, Mac, PC" />
                    <FeatureRow icon={<CheckCircle2 className="w-3 h-3 text-green-600" />} label="Minden böngészőben" />
                    <FeatureRow icon={<Globe className="w-3 h-3 text-blue-500" />} label="Mi nem látjuk az adatot" />
                    <FeatureRow icon={<AlertTriangle className="w-3 h-3 text-amber-500" />} label="Megosztás nem elérhető" />
                  </div>

                  {choice === 'gdrive' && (
                    <div className="mt-3">
                      {connectedFor === 'gdrive' ? (
                        <p className="text-xs font-medium text-green-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Drive mappa létrehozva
                        </p>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleConnectGDrive}
                          disabled={connecting}
                          className="h-8 text-xs"
                        >
                          {connecting ? (
                            <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Csatlakozás…</>
                          ) : (
                            'Bejelentkezés Google-fiókba →'
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </StorageCard>

                {/* ── 3. Lokális tárolás ── */}
                {fsSupported && (
                  <StorageCard
                    selected={choice === 'fs_local'}
                    onClick={() => { setChoice('fs_local'); setError(null) }}
                    icon={<FolderOpen className="w-5 h-5 text-amber-700" />}
                    iconBg={choice === 'fs_local' ? 'bg-amber-100' : 'bg-muted'}
                    title="Lokális tárolás"
                    description="Az adatok kizárólag a saját gépeden, egy általad választott mappában maradnak. Nincs internet, nincs cloud."
                  >
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <FeatureRow icon={<CheckCircle2 className="w-3 h-3 text-green-600" />} label="Windows PC — Chrome, Edge" />
                      <FeatureRow icon={<CheckCircle2 className="w-3 h-3 text-green-600" />} label="Mac — Chrome, Edge" />
                      <FeatureRow icon={<Monitor className="w-3 h-3 text-muted-foreground" />} label="Csak asztali böngészőben" />
                      <FeatureRow icon={<Smartphone className="w-3 h-3 text-red-400" />} label="iPhone, Android: nem működik" />
                    </div>
                    <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                      <strong>Kockázat:</strong> ha törlöd a mappát, más böngészőbe vált, vagy Safari-t használsz, az adataid elveszhetnek. Rendszeres exportálást ajánlunk.
                    </div>

                    {choice === 'fs_local' && (
                      <div className="mt-3">
                        {connectedFor === 'fs_local' ? (
                          <p className="text-xs font-medium text-green-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mappa kiválasztva
                          </p>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleConnectFs}
                            disabled={connecting}
                            className="h-8 text-xs"
                          >
                            {connecting ? (
                              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Megnyitás…</>
                            ) : (
                              'Mappa kiválasztása →'
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </StorageCard>
                )}

                {error && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                    ⚠️ {error}
                  </div>
                )}

                {(choice === 'gdrive' || choice === 'fs_local') && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                    <strong>AI-feldolgozás:</strong> A beszélgetéseid szövege áthalad a szerverünkön (mert onnan hívjuk az AI modellt), de nem tároljuk — közvetlenül a választott helyedre íródik.
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

// ── Sub-components ─────────────────────────────────────────────────

function StorageCard({
  selected,
  onClick,
  icon,
  iconBg,
  badge,
  badgeColor,
  title,
  description,
  children,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  iconBg: string
  badge?: string
  badgeColor?: string
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-background hover:border-primary/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{title}</p>
            {badge && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
          {children}
        </div>
      </div>
    </button>
  )
}

function FeatureRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span>{label}</span>
    </div>
  )
}
