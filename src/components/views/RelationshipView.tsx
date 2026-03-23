import { useState, useMemo } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, X } from 'lucide-react'
import type { Person, LifeEvent } from '@/types'

interface RelationshipViewProps {
  onBack: () => void
}

// Relationship type → circle tier + display config
const RELATIONSHIP_CONFIG: Record<string, { tier: number; label: string; color: string; bg: string; border: string; stroke: string }> = {
  // Inner circle - family (exact + ragozott alakok)
  család:       { tier: 1, label: 'Család',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  szülő:        { tier: 1, label: 'Szülő',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  anya:         { tier: 1, label: 'Anya',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  anyám:        { tier: 1, label: 'Anya',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  édesanya:     { tier: 1, label: 'Anya',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  édesanyám:    { tier: 1, label: 'Anya',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  apa:          { tier: 1, label: 'Apa',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  apám:         { tier: 1, label: 'Apa',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  édesapa:      { tier: 1, label: 'Apa',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  édesapám:     { tier: 1, label: 'Apa',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  testvér:      { tier: 1, label: 'Testvér',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  fivér:        { tier: 1, label: 'Fivér',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  bátyám:       { tier: 1, label: 'Fivér',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  öcsém:        { tier: 1, label: 'Fivér',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nővér:        { tier: 1, label: 'Nővér',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  húgom:        { tier: 1, label: 'Nővér',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  gyerek:       { tier: 1, label: 'Gyerek',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  gyermek:      { tier: 1, label: 'Gyermek',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  fiam:         { tier: 1, label: 'Gyerek',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  lányom:       { tier: 1, label: 'Gyerek',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  házastárs:    { tier: 1, label: 'Házastárs', color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  férj:         { tier: 1, label: 'Férj',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  férjem:       { tier: 1, label: 'Férj',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  feleség:      { tier: 1, label: 'Feleség',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  feleségem:    { tier: 1, label: 'Feleség',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  partner:      { tier: 1, label: 'Partner',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagyszülő:    { tier: 1, label: 'Nagyszülő', color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagyapa:      { tier: 1, label: 'Nagyapa',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagyapám:     { tier: 1, label: 'Nagyapa',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagyanya:     { tier: 1, label: 'Nagyanya',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagyanyám:    { tier: 1, label: 'Nagyanya',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagymama:     { tier: 1, label: 'Nagyanya',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  unoka:        { tier: 1, label: 'Unoka',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  rokon:        { tier: 1, label: 'Rokon',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagybácsi:    { tier: 1, label: 'Rokon',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagynéni:     { tier: 1, label: 'Rokon',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  unokaöcs:     { tier: 1, label: 'Rokon',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  unokahúg:     { tier: 1, label: 'Rokon',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  family:       { tier: 1, label: 'Család',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  parent:       { tier: 1, label: 'Szülő',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  mother:       { tier: 1, label: 'Anya',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  father:       { tier: 1, label: 'Apa',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  sibling:      { tier: 1, label: 'Testvér',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  child:        { tier: 1, label: 'Gyerek',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  spouse:       { tier: 1, label: 'Házastárs', color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  // Middle circle - friends, colleagues
  barát:        { tier: 2, label: 'Barát',     color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/40',   border: 'border-blue-400', stroke: '#3b82f6' },
  barátnő:      { tier: 2, label: 'Barátnő',  color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/40',   border: 'border-blue-400', stroke: '#3b82f6' },
  barátom:      { tier: 2, label: 'Barát',     color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/40',   border: 'border-blue-400', stroke: '#3b82f6' },
  barátnőm:     { tier: 2, label: 'Barátnő',  color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/40',   border: 'border-blue-400', stroke: '#3b82f6' },
  friend:       { tier: 2, label: 'Barát',     color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-100 dark:bg-blue-900/40',   border: 'border-blue-400', stroke: '#3b82f6' },
  kolléga:      { tier: 2, label: 'Kolléga',   color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400', stroke: '#22c55e' },
  kollégám:     { tier: 2, label: 'Kolléga',   color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400', stroke: '#22c55e' },
  colleague:    { tier: 2, label: 'Kolléga',   color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400', stroke: '#22c55e' },
  tanár:        { tier: 2, label: 'Tanár',     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' },
  tanárnő:      { tier: 2, label: 'Tanár',     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' },
  tanárom:      { tier: 2, label: 'Tanár',     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' },
  osztályfőnök: { tier: 2, label: 'Tanár',     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' },
  osztályfőnököm: { tier: 2, label: 'Tanár',   color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' },
  teacher:      { tier: 2, label: 'Tanár',     color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' },
  mentor:       { tier: 2, label: 'Mentor',    color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' },
  főnök:        { tier: 2, label: 'Főnök',     color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400', stroke: '#22c55e' },
  főnököm:      { tier: 2, label: 'Főnök',     color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400', stroke: '#22c55e' },
  boss:         { tier: 2, label: 'Főnök',     color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400', stroke: '#22c55e' },
  orvos:        { tier: 2, label: 'Orvos',     color: 'text-teal-700 dark:text-teal-300',   bg: 'bg-teal-100 dark:bg-teal-900/40',   border: 'border-teal-400', stroke: '#14b8a6' },
  orvosom:      { tier: 2, label: 'Orvos',     color: 'text-teal-700 dark:text-teal-300',   bg: 'bg-teal-100 dark:bg-teal-900/40',   border: 'border-teal-400', stroke: '#14b8a6' },
  doctor:       { tier: 2, label: 'Orvos',     color: 'text-teal-700 dark:text-teal-300',   bg: 'bg-teal-100 dark:bg-teal-900/40',   border: 'border-teal-400', stroke: '#14b8a6' },
  // Outer circle - acquaintances
  ismerős:      { tier: 3, label: 'Ismerős',   color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', stroke: '#f59e0b' },
  ismerősöm:    { tier: 3, label: 'Ismerős',   color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', stroke: '#f59e0b' },
  szomszéd:     { tier: 3, label: 'Szomszéd',  color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', stroke: '#f59e0b' },
  szomszédom:   { tier: 3, label: 'Szomszéd',  color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', stroke: '#f59e0b' },
  acquaintance: { tier: 3, label: 'Ismerős',   color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', stroke: '#f59e0b' },
  neighbor:     { tier: 3, label: 'Szomszéd',  color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', stroke: '#f59e0b' },
}

const DEFAULT_REL = { tier: 3, label: 'Egyéb', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900/40', border: 'border-gray-400', stroke: '#9ca3af' }

// Keyword-based fallback: ha az exact match nem talál, kulcsszavak alapján dönt
function getRelConfig(type: string) {
  if (!type) return DEFAULT_REL
  const t = type.toLowerCase().trim()

  // Exact match
  if (RELATIONSHIP_CONFIG[t]) return RELATIONSHIP_CONFIG[t]

  // Kulcsszó-alapú fallback (ragozott/összetett alakokra)
  const familyKeywords = ['anya', 'apa', 'szülő', 'testvér', 'fivér', 'nővér', 'gyerek', 'gyermek', 'házastárs', 'férj', 'feleség', 'partner', 'nagyszülő', 'nagyapa', 'nagyanya', 'nagymama', 'unoka', 'rokon', 'nagybácsi', 'nagynéni', 'édesanya', 'édesapa', 'família', 'family']
  const friendKeywords = ['barát', 'barátnő', 'friend']
  const colleagueKeywords = ['kolléga', 'colleague', 'munkatárs', 'főnök', 'boss', 'beosztott']
  const teacherKeywords = ['tanár', 'tanárnő', 'teacher', 'mentor', 'osztályfőnök', 'professzor', 'edző']
  const doctorKeywords = ['orvos', 'doctor', 'doktor', 'szakorvos']
  const acquaintanceKeywords = ['ismerős', 'szomszéd', 'neighbor', 'acquaintance']

  const ROSE = { color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-400', stroke: '#f43f5e' }
  const BLUE = { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-400', stroke: '#3b82f6' }
  const GREEN = { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-green-400', stroke: '#22c55e' }
  const PURPLE = { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/40', border: 'border-purple-400', stroke: '#a855f7' }
  const TEAL = { color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-100 dark:bg-teal-900/40', border: 'border-teal-400', stroke: '#14b8a6' }
  const AMBER = { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', border: 'border-amber-400', stroke: '#f59e0b' }

  if (familyKeywords.some(k => t.includes(k))) return { tier: 1, label: 'Család', ...ROSE }
  if (friendKeywords.some(k => t.includes(k))) return { tier: 2, label: 'Barát', ...BLUE }
  if (teacherKeywords.some(k => t.includes(k))) return { tier: 2, label: 'Tanár', ...PURPLE }
  if (doctorKeywords.some(k => t.includes(k))) return { tier: 2, label: 'Orvos', ...TEAL }
  if (colleagueKeywords.some(k => t.includes(k))) return { tier: 2, label: 'Kolléga', ...GREEN }
  if (acquaintanceKeywords.some(k => t.includes(k))) return { tier: 3, label: 'Ismerős', ...AMBER }

  return DEFAULT_REL
}

const TIER_LABELS = ['', 'Család', 'Barátok & Kollégák', 'Ismerősök']

interface PersonPosition {
  person: Person
  x: number
  y: number
  config: typeof DEFAULT_REL
}

export function RelationshipView({ onBack }: RelationshipViewProps) {
  const { persons, events } = useLifeStoryStore()
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  // Build shared-event connections between persons
  const sharedEventConnections = useMemo(() => {
    const connections: { from: string; to: string }[] = []
    for (const event of events) {
      const pids = event.person_ids || []
      for (let i = 0; i < pids.length; i++) {
        for (let j = i + 1; j < pids.length; j++) {
          connections.push({ from: pids[i], to: pids[j] })
        }
      }
    }
    // Also check related_event_ids overlap
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        const shared = (persons[i].related_event_ids || []).filter(
          eid => (persons[j].related_event_ids || []).includes(eid)
        )
        if (shared.length > 0) {
          const exists = connections.some(
            c => (c.from === persons[i].id && c.to === persons[j].id) ||
                 (c.from === persons[j].id && c.to === persons[i].id)
          )
          if (!exists) connections.push({ from: persons[i].id, to: persons[j].id })
        }
      }
    }
    return connections
  }, [persons, events])

  // Get events linked to a person
  const getLinkedEvents = (person: Person): LifeEvent[] => {
    return events.filter(e =>
      (e.person_ids || []).includes(person.id) ||
      (person.related_event_ids || []).includes(e.id)
    )
  }

  // Calculate positions for radial layout
  const positions = useMemo((): PersonPosition[] => {
    const tiers: Person[][] = [[], [], [], []]
    persons.forEach(p => {
      const cfg = getRelConfig(p.relationship_type)
      tiers[cfg.tier].push(p)
    })

    const result: PersonPosition[] = []
    const cx = 50 // center percentage
    const cy = 50
    const radii = [0, 22, 36, 48] // tier radii in percentage

    for (let tier = 1; tier <= 3; tier++) {
      const tierPersons = tiers[tier]
      if (tierPersons.length === 0) continue
      const r = radii[tier]
      tierPersons.forEach((person, idx) => {
        const angle = (2 * Math.PI * idx) / tierPersons.length - Math.PI / 2
        result.push({
          person,
          x: cx + r * Math.cos(angle),
          y: cy + r * Math.sin(angle),
          config: getRelConfig(person.relationship_type),
        })
      })
    }
    return result
  }, [persons])

  // Group persons by tier for list view
  const groupedPersons = useMemo(() => {
    const groups: Record<number, Person[]> = { 1: [], 2: [], 3: [] }
    persons.forEach(p => {
      const cfg = getRelConfig(p.relationship_type)
      groups[cfg.tier].push(p)
    })
    return groups
  }, [persons])

  if (persons.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">Kapcsolati halo</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground">Meg nincsenek szemelyek</h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              Meseld el az elettorteneteidet a chatben, es az AI automatikusan felismeri
              es rogziti az emlitett szemelyeket.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const posMap = new Map(positions.map(p => [p.person.id, p]))

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold">Kapcsolati halo</h2>
        <Badge variant="secondary" className="ml-auto">{persons.length} szemely</Badge>
      </div>

      {/* Radial layout - hidden on mobile */}
      <div className="flex-1 overflow-hidden relative hidden md:block">
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Concentric circle guides */}
          <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" className="text-border" strokeWidth="0.15" strokeDasharray="1 0.5" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" className="text-border" strokeWidth="0.15" strokeDasharray="1 0.5" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" className="text-border" strokeWidth="0.15" strokeDasharray="1 0.5" />

          {/* Shared event connections (subtle) */}
          {sharedEventConnections.map((conn, i) => {
            const a = posMap.get(conn.from)
            const b = posMap.get(conn.to)
            if (!a || !b) return null
            return (
              <line
                key={`shared-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="currentColor"
                className="text-muted-foreground/20"
                strokeWidth="0.2"
                strokeDasharray="0.5 0.5"
              />
            )
          })}

          {/* Connection lines from center to each person */}
          {positions.map(({ person, x, y, config }) => (
            <line
              key={`line-${person.id}`}
              x1={50}
              y1={50}
              x2={x}
              y2={y}
              stroke={config.stroke}
              strokeWidth="0.25"
              opacity={selectedPerson && selectedPerson.id !== person.id ? 0.15 : 0.5}
            />
          ))}

          {/* Center node - "Én" */}
          <circle cx="50" cy="50" r="3.5" className="fill-primary" />
          <text x="50" y="50.4" textAnchor="middle" dominantBaseline="middle" className="fill-primary-foreground" fontSize="2" fontWeight="bold">
            En
          </text>

          {/* Person nodes */}
          {positions.map(({ person, x, y, config }) => {
            const isSelected = selectedPerson?.id === person.id
            const dimmed = selectedPerson && !isSelected
            return (
              <g
                key={person.id}
                className="cursor-pointer"
                onClick={() => setSelectedPerson(isSelected ? null : person)}
                opacity={dimmed ? 0.3 : 1}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 3.2 : 2.8}
                  fill={config.stroke}
                  opacity={0.15}
                  stroke={config.stroke}
                  strokeWidth={isSelected ? 0.4 : 0.2}
                />
                <circle
                  cx={x}
                  cy={y}
                  r="1.2"
                  fill={config.stroke}
                  opacity={0.8}
                />
                {/* Name label */}
                <text
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fontSize="1.5"
                  className="fill-foreground"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                >
                  {person.nickname || person.name}
                </text>
                {/* Relationship type label */}
                <text
                  x={x}
                  y={y + 4.5}
                  textAnchor="middle"
                  fontSize="1"
                  fill={config.stroke}
                  opacity={0.8}
                >
                  {config.label}
                </text>
                {/* Period label */}
                {person.related_period && (
                  <text
                    x={x}
                    y={y + 5.8}
                    textAnchor="middle"
                    fontSize="0.9"
                    className="fill-muted-foreground"
                    opacity={0.7}
                  >
                    {person.related_period}
                  </text>
                )}
              </g>
            )
          })}

          {/* Tier labels */}
          <text x="50" y="28" textAnchor="middle" fontSize="1.2" className="fill-muted-foreground" opacity="0.5">{TIER_LABELS[1]}</text>
          <text x="50" y="14" textAnchor="middle" fontSize="1.2" className="fill-muted-foreground" opacity="0.5">{TIER_LABELS[2]}</text>
          <text x="50" y="2.5" textAnchor="middle" fontSize="1.2" className="fill-muted-foreground" opacity="0.5">{TIER_LABELS[3]}</text>
        </svg>

        {/* Detail panel (desktop) */}
        {selectedPerson && (
          <div className="absolute top-4 right-4 w-72 bg-card border rounded-lg shadow-lg p-4 space-y-3 z-10">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">{selectedPerson.name}</h3>
                {selectedPerson.nickname && (
                  <p className="text-sm text-muted-foreground">({selectedPerson.nickname})</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1" onClick={() => setSelectedPerson(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Kapcsolat:</span>
                <Badge variant="outline" className={`${getRelConfig(selectedPerson.relationship_type).bg} ${getRelConfig(selectedPerson.relationship_type).color} border-0 text-xs`}>
                  {getRelConfig(selectedPerson.relationship_type).label}
                </Badge>
              </div>

              {selectedPerson.related_period && (
                <div>
                  <span className="text-muted-foreground">Idoszak: </span>
                  <span>{selectedPerson.related_period}</span>
                </div>
              )}

              {selectedPerson.notes && (
                <div>
                  <span className="text-muted-foreground block mb-0.5">Jegyzetek:</span>
                  <p className="text-xs bg-muted/50 rounded p-2">{selectedPerson.notes}</p>
                </div>
              )}

              {selectedPerson.uncertainty && (
                <div>
                  <span className="text-muted-foreground block mb-0.5">Bizonytalansag:</span>
                  <p className="text-xs bg-amber-50 dark:bg-amber-900/20 rounded p-2 text-amber-700 dark:text-amber-300">{selectedPerson.uncertainty}</p>
                </div>
              )}

              {/* Linked events */}
              {(() => {
                const linked = getLinkedEvents(selectedPerson)
                if (linked.length === 0) return null
                return (
                  <div>
                    <span className="text-muted-foreground block mb-1">Kapcsolodo esemenyek:</span>
                    <div className="space-y-1">
                      {linked.map(ev => (
                        <div key={ev.id} className="text-xs bg-muted/50 rounded px-2 py-1">
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Mobile list view */}
      <div className="flex-1 overflow-y-auto md:hidden p-4 space-y-6">
        {[1, 2, 3].map(tier => {
          const tierPersons = groupedPersons[tier]
          if (tierPersons.length === 0) return null
          return (
            <div key={tier}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{TIER_LABELS[tier]}</h3>
              <div className="space-y-2">
                {tierPersons.map(person => {
                  const cfg = getRelConfig(person.relationship_type)
                  const isSelected = selectedPerson?.id === person.id
                  const linked = getLinkedEvents(person)
                  return (
                    <div
                      key={person.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
                      onClick={() => setSelectedPerson(isSelected ? null : person)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: cfg.stroke }}>
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{person.name}</span>
                            {person.nickname && (
                              <span className="text-xs text-muted-foreground truncate">({person.nickname})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 text-[10px] px-1.5 py-0`}>
                              {cfg.label}
                            </Badge>
                            {person.related_period && (
                              <span className="text-[10px] text-muted-foreground">{person.related_period}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                          {person.notes && (
                            <div>
                              <span className="text-muted-foreground text-xs block mb-0.5">Jegyzetek:</span>
                              <p className="text-xs bg-muted/50 rounded p-2">{person.notes}</p>
                            </div>
                          )}
                          {person.uncertainty && (
                            <div>
                              <span className="text-muted-foreground text-xs block mb-0.5">Bizonytalansag:</span>
                              <p className="text-xs bg-amber-50 dark:bg-amber-900/20 rounded p-2 text-amber-700 dark:text-amber-300">{person.uncertainty}</p>
                            </div>
                          )}
                          {linked.length > 0 && (
                            <div>
                              <span className="text-muted-foreground text-xs block mb-1">Kapcsolodo esemenyek:</span>
                              <div className="space-y-1">
                                {linked.map(ev => (
                                  <div key={ev.id} className="text-xs bg-muted/50 rounded px-2 py-1">
                                    {ev.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
