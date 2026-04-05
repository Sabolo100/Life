import { useState } from 'react'
import { MosaicBackground } from '@/components/MosaicBackground'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { BookOpen, MessageSquare, Shield, Pencil, Download, ArrowRight, Cloud, Monitor } from 'lucide-react'
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

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [storageChoice, setStorageChoice] = useState<StoragePreference>('cloud')
  const { updateProfile } = useAuthStore()
  const [saving, setSaving] = useState(false)

  const isStorageStep = step === steps.length
  const isLastStep = step === steps.length

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    await updateProfile({
      storage_preference: storageChoice,
      onboarding_completed: true,
      privacy_accepted_at: new Date().toISOString(),
    })
    setSaving(false)
  }

  if (isStorageStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f4ee] relative p-4">
        <MosaicBackground opacity={0.35} />
        <Card className="w-full max-w-lg relative z-10 bg-[#faf7f2]/90 backdrop-blur-md shadow-xl shadow-amber-900/10 border-amber-200/50">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Hol tároljuk az adataidat?</CardTitle>
            <CardDescription>Ezt később bármikor megváltoztathatod a beállításokban.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => setStorageChoice('cloud')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                storageChoice === 'cloud' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <Cloud className="w-6 h-6 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Felhő (ajánlott)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bármely eszközödön elérheted az adataidat. Automatikus biztonsági mentés. Biztonságosan titkosítva.
                  </p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setStorageChoice('local')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                storageChoice === 'local' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <Monitor className="w-6 h-6 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Lokális (csak ezen az eszközön)</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Minden adat a böngésződben marad. Más eszközön export/import szükséges. Maximális adatvédelem.
                  </p>
                </div>
              </div>
            </button>
            <Button onClick={handleFinish} className="w-full mt-6" size="lg" disabled={saving}>
              {saving ? 'Mentés...' : 'Kezdjük el!'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStep = steps[step]

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f4ee] relative p-4">
      <MosaicBackground opacity={0.35} />
      <Card className="w-full max-w-lg relative z-10 bg-[#faf7f2]/90 backdrop-blur-md shadow-xl shadow-amber-900/10 border-amber-200/50">
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
              {steps.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
              ))}
              <div className={`w-2 h-2 rounded-full ${isLastStep ? 'bg-primary' : 'bg-border'}`} />
            </div>
            <Button onClick={handleNext}>
              Tovább <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
