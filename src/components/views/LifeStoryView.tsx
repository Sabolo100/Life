import { useState, useMemo } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText, FileJson } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { exportAsJSON, exportAsPDF, exportAsDOCX } from '@/lib/export-service'

// Translation map for English relationship types from AI extraction
export const RELATIONSHIP_LABELS: Record<string, string> = {
  parent: 'Szülő', mother: 'Anya', father: 'Apa',
  sibling: 'Testvér', brother: 'Fivér', sister: 'Nővér',
  child: 'Gyerek', son: 'Fia', daughter: 'Lánya',
  spouse: 'Házastárs', husband: 'Férj', wife: 'Feleség',
  partner: 'Partner', friend: 'Barát', colleague: 'Kolléga',
  teacher: 'Tanár', mentor: 'Mentor', boss: 'Főnök',
  doctor: 'Orvos', neighbor: 'Szomszéd', acquaintance: 'Ismerős',
  grandparent: 'Nagyszülő', grandmother: 'Nagyanya', grandfather: 'Nagyapa',
  grandchild: 'Unoka', uncle: 'Nagybácsi', aunt: 'Nagynéni',
  cousin: 'Unokatestvér', family: 'Család', relative: 'Rokon',
  ex_spouse: 'Volt házastárs', ex: 'Volt partner',
}

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  residence: 'Lakóhely', home: 'Otthon', school: 'Iskola',
  workplace: 'Munkahely', hospital: 'Kórház', church: 'Templom',
  city: 'Város', town: 'Város', village: 'Falu',
  country: 'Ország', region: 'Régió', park: 'Park',
  office: 'Iroda', university: 'Egyetem', other: 'Egyéb',
  birth_place: 'Születési hely', vacation: 'Nyaralóhely',
}

export function translateLabel(value: string, map: Record<string, string>): string {
  if (!value) return value
  const lower = value.toLowerCase().trim()
  return map[lower] || value
}

export const CATEGORY_OPTIONS = [
  { value: 'career', label: 'Munkahely' },
  { value: 'education', label: 'Tanulmányok' },
  { value: 'relationship', label: 'Kapcsolat' },
  { value: 'family', label: 'Család' },
  { value: 'residence', label: 'Lakóhely' },
  { value: 'travel', label: 'Utazás' },
  { value: 'health', label: 'Egészség' },
  { value: 'sport', label: 'Sport' },
  { value: 'entertainment', label: 'Szórakozás' },
  { value: 'childhood', label: 'Gyermekkor' },
  { value: 'other', label: 'Egyéb' },
]

interface LifeStoryViewProps {
  onBack: () => void
}

export function sortEventsByTime(events: { exact_date?: string | null; estimated_year?: number | null; life_phase?: string | null; created_at?: string }[]) {
  return [...events].sort((a, b) => {
    const yearA = a.estimated_year ?? (a.exact_date ? new Date(a.exact_date).getFullYear() : 9999)
    const yearB = b.estimated_year ?? (b.exact_date ? new Date(b.exact_date).getFullYear() : 9999)
    if (yearA !== yearB) return yearA - yearB
    if (a.exact_date && b.exact_date) return a.exact_date.localeCompare(b.exact_date)
    return 0
  })
}

export function LifeStoryView({ onBack }: LifeStoryViewProps) {
  const { lifeStory, events, locations, timePeriods, emotions, openQuestions, persons } = useLifeStoryStore()
  const { profile } = useAuthStore()
  const [showExportMenu, setShowExportMenu] = useState(false)

  const exportData = {
    lifeStory, persons, events, locations, timePeriods, emotions, openQuestions,
    displayName: profile?.display_name || undefined,
  }

  // Build narrative text from event records
  const narrativeText = useMemo(() => {
    const sorted = sortEventsByTime(events) as typeof events
    const paragraphs: string[] = []

    for (const event of sorted) {
      const text = event.narrative_text || event.description
      if (text) {
        paragraphs.push(text)
      }
    }

    return paragraphs.join('\n\n')
  }, [events])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold">Életutam</h2>
        </div>
        <div className="relative">
          <Button variant="outline" size="sm" onClick={() => setShowExportMenu(!showExportMenu)}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg py-1 z-50 w-48">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                onClick={() => { exportAsPDF(exportData); setShowExportMenu(false) }}
              >
                <FileText className="w-4 h-4" /> PDF letöltés
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                onClick={() => { exportAsDOCX(exportData); setShowExportMenu(false) }}
              >
                <FileText className="w-4 h-4" /> Word (DOCX) letöltés
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                onClick={() => { exportAsJSON(exportData); setShowExportMenu(false) }}
              >
                <FileJson className="w-4 h-4" /> JSON letöltés
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {narrativeText ? (
            <div className="prose prose-sm max-w-none">
              {narrativeText.split('\n').map((line, i) => (
                <p key={i} className={line.trim() === '' ? 'h-4' : ''}>{line}</p>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <p>Az életutad még üres. Kezdj el beszélgetni az AI-val, és automatikusan összeáll!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
