import { useState, useMemo, useRef, useEffect } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, X, ZoomIn, ZoomOut, Maximize2, Network, GitBranchPlus } from 'lucide-react'
import type { Person, LifeEvent } from '@/types'
import { supabase } from '@/lib/supabase'
import { FamilyTreeView } from './FamilyTreeView'

type ViewMode = 'network' | 'familyTree'
type FilterMode = 'all' | 'family' | 'friends'

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
  bátyám:       { tier: 1, label: 'Báty',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nővér:        { tier: 1, label: 'Nővér',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
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
  // testvérek
  báty:         { tier: 1, label: 'Báty',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  bátya:        { tier: 1, label: 'Báty',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  öcs:          { tier: 1, label: 'Öcs',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  öccs:         { tier: 1, label: 'Öcs',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  öcsém:        { tier: 1, label: 'Öcs',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  húg:          { tier: 1, label: 'Húg',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  // nagyszülők informális
  mama:         { tier: 1, label: 'Nagyanya',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  papa:         { tier: 1, label: 'Nagyapa',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagypapa:     { tier: 1, label: 'Nagyapa',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  tata:         { tier: 1, label: 'Apa',       color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  // dédszülők
  dédapa:       { tier: 1, label: 'Dédapa',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  dédanya:      { tier: 1, label: 'Dédanya',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  dédmama:      { tier: 1, label: 'Dédanya',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  dédpapa:      { tier: 1, label: 'Dédapa',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  dédi:         { tier: 1, label: 'Dédszülő',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  ükapa:        { tier: 1, label: 'Ükapa',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  ükanya:       { tier: 1, label: 'Ükanya',    color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  // sógorság / após-anyós
  sógor:        { tier: 1, label: 'Sógor',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  sógorom:      { tier: 1, label: 'Sógor',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  sógornő:      { tier: 1, label: 'Sógornő',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  sógornőm:     { tier: 1, label: 'Sógornő',   color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  após:         { tier: 1, label: 'Após',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  apósom:       { tier: 1, label: 'Após',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  anyós:        { tier: 1, label: 'Anyós',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  anyósom:      { tier: 1, label: 'Anyós',     color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  vejém:        { tier: 1, label: 'Vő',        color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  menyem:       { tier: 1, label: 'Meny',      color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  // egyéb rokonok
  nagybácsi:    { tier: 1, label: 'Nagybácsi', color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagybátyám:   { tier: 1, label: 'Nagybácsi', color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagynéni:     { tier: 1, label: 'Nagynéni',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  nagynénim:    { tier: 1, label: 'Nagynéni',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  unokatestvér: { tier: 1, label: 'Unokatestvér', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-900/40', border: 'border-rose-400', stroke: '#f43f5e' },
  unokaöcs:     { tier: 1, label: 'Unokaöcs',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  unokahúg:     { tier: 1, label: 'Unokahúg',  color: 'text-rose-700 dark:text-rose-300',   bg: 'bg-rose-100 dark:bg-rose-900/40',   border: 'border-rose-400', stroke: '#f43f5e' },
  // angol
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
  if (RELATIONSHIP_CONFIG[t]) return RELATIONSHIP_CONFIG[t]

  const familyKeywords = [
    'anya', 'édesanya', 'apa', 'édesapa', 'mama', 'papa', 'tata', 'szülő',
    'nagyanya', 'nagyapa', 'nagyszülő', 'nagymama', 'nagypapa', 'déd', 'ük',
    'testvér', 'fivér', 'nővér', 'báty', 'öcs', 'húg',
    'gyerek', 'gyermek', 'fiam', 'lányom', 'fia', 'lánya',
    'unoka', 'rokon', 'nagybácsi', 'nagynéni',
    'sógor', 'após', 'anyós', 'meny', 'vőm', 'vejém',
    'házastárs', 'férj', 'feleség', 'partner',
    'family', 'família', 'parent', 'mother', 'father', 'sibling',
    'brother', 'sister', 'child', 'spouse', 'grandma', 'grandpa', 'grandmother', 'grandfather',
  ]
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
// Canonical relationship_type for tier moves
const TIER_CANONICAL: Record<number, string> = { 1: 'rokon', 2: 'barát', 3: 'ismerős' }
// Tier ring bounds in SVG units (center 50,50)
const TIER_BOUNDS = [null, { inner: 5, outer: 21 }, { inner: 23, outer: 35 }, { inner: 37, outer: 47 }]
// Minimum distance between dot centers before collision push
const MIN_DOT_DIST = 8

interface PersonPosition {
  person: Person
  x: number
  y: number
  config: typeof DEFAULT_REL
}

// Deterministic jitter from person id + index so positions are stable across re-renders
function deterministicJitter(id: string, idx: number, scale = 1): number {
  let h = idx * 2654435761
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761)
  return ((h >>> 0) / 0xffffffff - 0.5) * scale
}

// Project (x,y) back into the annular tier area
function projectToTier(x: number, y: number, cx: number, cy: number, innerR: number, outerR: number) {
  const dx = x - cx
  const dy = y - cy
  let r = Math.sqrt(dx * dx + dy * dy)
  if (r < 0.001) return { x: cx + (innerR + outerR) / 2, y: cy }
  const angle = Math.atan2(dy, dx)
  r = Math.max(innerR, Math.min(outerR, r))
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

interface ContextMenuState {
  screenX: number
  screenY: number
  person: Person
  currentTier: number
}

export function RelationshipView({ onBack }: RelationshipViewProps) {
  const { persons, events, loadAll } = useLifeStoryStore()
  const { profile } = useAuthStore()
  const [viewMode, setViewMode] = useState<ViewMode>('network')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [hoveredPerson, setHoveredPerson] = useState<Person | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [tierOverrides, setTierOverrides] = useState<Record<string, number>>({})
  // Zoom / pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [contextMenu])

  // Wheel zoom — passive:false to allow preventDefault
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width
      const ny = (e.clientY - rect.top) / rect.height
      const vbW = 100 / zoom
      const vbH = 100 / zoom
      const vbX = 50 - 50 / zoom + pan.x
      const vbY = 50 - 50 / zoom + pan.y
      const svgX = vbX + nx * vbW
      const svgY = vbY + ny * vbH
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const newZoom = Math.max(1, Math.min(5, zoom * factor))
      const newVbW = 100 / newZoom
      const newVbH = 100 / newZoom
      const newVbX = svgX - nx * newVbW
      const newVbY = svgY - ny * newVbH
      const newPanX = newVbX - (50 - 50 / newZoom)
      const newPanY = newVbY - (50 - 50 / newZoom)
      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoom, pan])

  // Pan via mouse drag
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    isPanning.current = true
    panStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.style.cursor = 'grabbing'
  }
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return
    const rect = svgRef.current!.getBoundingClientRect()
    const svgScale = 100 / zoom / rect.width // screen px → SVG units
    const dx = (e.clientX - panStart.current.mouseX) * svgScale
    const dy = (e.clientY - panStart.current.mouseY) * svgScale
    setPan({ x: panStart.current.panX - dx, y: panStart.current.panY - dy })
  }
  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    isPanning.current = false
    e.currentTarget.style.cursor = 'grab'
  }

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // Move person to target tier: update DB relationship_type
  const movePerson = async (person: Person, targetTier: number) => {
    const newType = TIER_CANONICAL[targetTier]
    setTierOverrides(prev => ({ ...prev, [person.id]: targetTier }))
    setContextMenu(null)
    await supabase.from('persons').update({ relationship_type: newType }).eq('id', person.id)
    await loadAll()
    setTierOverrides(prev => { const n = { ...prev }; delete n[person.id]; return n })
  }

  // Build shared-event connections
  const sharedEventConnections = useMemo(() => {
    const connections: { from: string; to: string }[] = []
    for (const event of events) {
      const pids = event.person_ids || []
      for (let i = 0; i < pids.length; i++) {
        for (let j = i + 1; j < pids.length; j++) connections.push({ from: pids[i], to: pids[j] })
      }
    }
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

  const getLinkedEvents = (person: Person): LifeEvent[] =>
    events.filter(e => (e.person_ids || []).includes(person.id) || (person.related_event_ids || []).includes(e.id))

  // Filter persons based on filter mode
  const filteredPersons = useMemo(() => {
    if (filter === 'all') return persons
    if (filter === 'family') return persons.filter(p => (tierOverrides[p.id] ?? getRelConfig(p.relationship_type).tier) === 1)
    if (filter === 'friends') return persons.filter(p => (tierOverrides[p.id] ?? getRelConfig(p.relationship_type).tier) === 2)
    return persons
  }, [persons, filter, tierOverrides])

  // Calculate positions with collision detection
  const positions = useMemo((): PersonPosition[] => {
    const cx = 50
    const cy = 50

    const tiers: Person[][] = [[], [], [], []]
    filteredPersons.forEach(p => {
      const tier = tierOverrides[p.id] ?? getRelConfig(p.relationship_type).tier
      tiers[tier].push(p)
    })

    const result: PersonPosition[] = []

    for (let tier = 1; tier <= 3; tier++) {
      const tierPersons = tiers[tier]
      if (tierPersons.length === 0) continue
      const bounds = TIER_BOUNDS[tier]!
      const midR = (bounds.inner + bounds.outer) / 2

      tierPersons.forEach((person, idx) => {
        const angle = (2 * Math.PI * idx) / tierPersons.length - Math.PI / 2
        // Start at mid-radius with small deterministic jitter
        const jR = midR + deterministicJitter(person.id, idx, (bounds.outer - bounds.inner) * 0.3)
        const clampedR = Math.max(bounds.inner, Math.min(bounds.outer, jR))
        result.push({
          person,
          x: cx + clampedR * Math.cos(angle) + deterministicJitter(person.id, idx + 1000, 0.5),
          y: cy + clampedR * Math.sin(angle) + deterministicJitter(person.id, idx + 2000, 0.5),
          config: getRelConfig(person.relationship_type),
        })
      })
    }

    // Collision detection: push apart dots that are too close (same tier only)
    for (let iter = 0; iter < 80; iter++) {
      let anyMoved = false
      for (let i = 0; i < result.length; i++) {
        for (let j = i + 1; j < result.length; j++) {
          const tierI = tierOverrides[result[i].person.id] ?? getRelConfig(result[i].person.relationship_type).tier
          const tierJ = tierOverrides[result[j].person.id] ?? getRelConfig(result[j].person.relationship_type).tier
          if (tierI !== tierJ) continue // only push within same tier

          const dx = result[j].x - result[i].x
          const dy = result[j].y - result[i].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MIN_DOT_DIST && dist > 0.001) {
            const push = (MIN_DOT_DIST - dist) / 2
            const nx = dx / dist
            const ny = dy / dist
            result[i].x -= nx * push
            result[i].y -= ny * push
            result[j].x += nx * push
            result[j].y += ny * push

            // Project back into tier bounds
            const boundsI = TIER_BOUNDS[tierI]!
            const projI = projectToTier(result[i].x, result[i].y, cx, cy, boundsI.inner, boundsI.outer)
            result[i].x = projI.x; result[i].y = projI.y

            const boundsJ = TIER_BOUNDS[tierJ]!
            const projJ = projectToTier(result[j].x, result[j].y, cx, cy, boundsJ.inner, boundsJ.outer)
            result[j].x = projJ.x; result[j].y = projJ.y

            anyMoved = true
          }
        }
      }
      if (!anyMoved) break
    }

    return result
  }, [filteredPersons, tierOverrides])

  // Group persons by tier for list view
  const groupedPersons = useMemo(() => {
    const groups: Record<number, Person[]> = { 1: [], 2: [], 3: [] }
    filteredPersons.forEach(p => {
      const tier = tierOverrides[p.id] ?? getRelConfig(p.relationship_type).tier
      groups[tier].push(p)
    })
    return groups
  }, [persons, tierOverrides])

  if (persons.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold">Személyek</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground">Még nincsenek személyek</h3>
            <p className="text-sm text-muted-foreground/70 max-w-sm">
              Meséld el az élettörténeteidet a chatben, és az AI automatikusan felismeri és rögzíti az említett személyeket.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const posMap = new Map(positions.map(p => [p.person.id, p]))
  const vbX = 50 - 50 / zoom + pan.x
  const vbY = 50 - 50 / zoom + pan.y
  const vbSize = 100 / zoom

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <h2 className="font-semibold">Személyek</h2>
        <Badge variant="secondary" className="text-xs">{persons.length}</Badge>

        {/* View mode tabs */}
        <div className="flex items-center gap-0.5 ml-auto bg-muted rounded-lg p-0.5">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'network' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setViewMode('network')}
          >
            <Network className="w-3.5 h-3.5" /> Háló
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'familyTree' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setViewMode('familyTree')}
          >
            <GitBranchPlus className="w-3.5 h-3.5" /> Családfa
          </button>
        </div>

        {/* Zoom controls (only for network view) */}
        {viewMode === 'network' && (
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              const newZoom = Math.min(5, zoom * 1.3)
              setZoom(newZoom)
            }}><ZoomIn className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
              const newZoom = Math.max(1, zoom / 1.3)
              setZoom(newZoom)
              if (newZoom <= 1) setPan({ x: 0, y: 0 })
            }}><ZoomOut className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}><Maximize2 className="w-3.5 h-3.5" /></Button>
          </div>
        )}
      </div>

      {/* Filter pills - only for network view */}
      {viewMode === 'network' && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b shrink-0">
          {([['all', 'Mind'], ['family', 'Család'], ['friends', 'Barátok']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Family tree view */}
      {viewMode === 'familyTree' ? (
        <FamilyTreeView selfName={profile?.display_name || 'Én'} />
      ) : (
        <>

      {/* Radial layout - hidden on mobile */}
      <div className="flex-1 overflow-hidden relative hidden md:block">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${vbX} ${vbY} ${vbSize} ${vbSize}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ cursor: 'grab', userSelect: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Concentric circle guides */}
          <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" className="text-border" strokeWidth="0.15" strokeDasharray="1 0.5" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" className="text-border" strokeWidth="0.15" strokeDasharray="1 0.5" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" className="text-border" strokeWidth="0.15" strokeDasharray="1 0.5" />

          {/* Shared event connections */}
          {sharedEventConnections.map((conn, i) => {
            const a = posMap.get(conn.from)
            const b = posMap.get(conn.to)
            if (!a || !b) return null
            return (
              <line key={`shared-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="currentColor" className="text-muted-foreground/20"
                strokeWidth="0.2" strokeDasharray="0.5 0.5" />
            )
          })}

          {/* Connection lines from center */}
          {positions.map(({ person, x, y, config }) => (
            <line key={`line-${person.id}`} x1={50} y1={50} x2={x} y2={y}
              stroke={config.stroke} strokeWidth="0.25"
              opacity={selectedPerson && selectedPerson.id !== person.id ? 0.15 : 0.5} />
          ))}

          {/* Center node */}
          <circle cx="50" cy="50" r="3.5" className="fill-primary" />
          <text x="50" y="50.4" textAnchor="middle" dominantBaseline="middle" className="fill-primary-foreground" fontSize="2" fontWeight="bold">En</text>

          {/* Idle pulse animation */}
          <defs>
            <style>{`
              @keyframes dotPulse {
                0%, 100% { transform: scale(1); opacity: 0.7; }
                50% { transform: scale(1.7); opacity: 1; }
              }
              .dot-idle { animation: dotPulse 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
            `}</style>
          </defs>

          {/* Person nodes */}
          {positions.map(({ person, x, y, config }, idx) => {
            const isSelected = selectedPerson?.id === person.id
            const dimmed = selectedPerson && !isSelected
            return (
              <g
                key={person.id}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setSelectedPerson(isSelected ? null : person) }}
                onMouseEnter={(e) => {
                  setHoveredPerson(person)
                  const svgEl = (e.target as SVGElement).ownerSVGElement
                  if (svgEl) {
                    const rect = svgEl.getBoundingClientRect()
                    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
                  }
                }}
                onMouseLeave={() => { setHoveredPerson(null); setHoverPos(null) }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const tier = tierOverrides[person.id] ?? getRelConfig(person.relationship_type).tier
                  setContextMenu({ screenX: e.clientX, screenY: e.clientY, person, currentTier: tier })
                }}
                opacity={dimmed ? 0.3 : 1}
              >
                <circle cx={x} cy={y} r={isSelected ? 3.2 : 2.8} fill={config.stroke} opacity={0.15}
                  stroke={config.stroke} strokeWidth={isSelected ? 0.4 : 0.2} />
                <circle cx={x} cy={y} r="1.2" fill={config.stroke} opacity={0.8}
                  className="dot-idle" style={{ animationDelay: `${idx * 0.4}s` }} />
                <text x={x} y={y + 3} textAnchor="middle" fontSize="1.5" className="fill-foreground"
                  fontWeight={isSelected ? 'bold' : 'normal'} style={{ pointerEvents: 'none' }}>
                  {person.nickname || person.name}
                </text>
              </g>
            )
          })}

          {/* Tier labels */}
          <text x="50" y="28" textAnchor="middle" fontSize="1.2" className="fill-muted-foreground" opacity="0.5">{TIER_LABELS[1]}</text>
          <text x="50" y="14" textAnchor="middle" fontSize="1.2" className="fill-muted-foreground" opacity="0.5">{TIER_LABELS[2]}</text>
          <text x="50" y="2.5" textAnchor="middle" fontSize="1.2" className="fill-muted-foreground" opacity="0.5">{TIER_LABELS[3]}</text>
        </svg>

        {/* Context menu (right-click) */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-40"
            style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium border-b mb-1">
              {contextMenu.person.nickname || contextMenu.person.name}
            </div>
            <div className="px-3 py-1 text-xs text-muted-foreground">Áthelyezés:</div>
            {[1, 2, 3].map(tier => (
              <button
                key={tier}
                disabled={contextMenu.currentTier === tier}
                onClick={() => movePerson(contextMenu.person, tier)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 disabled:opacity-40 disabled:cursor-default`}
              >
                <span className={`w-2 h-2 rounded-full ${tier === 1 ? 'bg-rose-500' : tier === 2 ? 'bg-blue-500' : 'bg-amber-500'}`} />
                {TIER_LABELS[tier]}
                {contextMenu.currentTier === tier && <span className="ml-auto text-xs text-muted-foreground">jelenlegi</span>}
              </button>
            ))}
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredPerson && hoverPos && !contextMenu && (
          <div
            className="absolute z-40 pointer-events-none"
            style={{
              left: Math.min(hoverPos.x + 12, (typeof window !== 'undefined' ? window.innerWidth - 240 : 400)),
              top: hoverPos.y - 10,
            }}
          >
            <div className="bg-card border rounded-lg shadow-lg p-2.5 w-[200px]">
              <div className="font-semibold text-xs">{hoveredPerson.name}</div>
              {hoveredPerson.nickname && <div className="text-[10px] text-muted-foreground">({hoveredPerson.nickname})</div>}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getRelConfig(hoveredPerson.relationship_type).stroke }} />
                <span className="text-[11px]" style={{ color: getRelConfig(hoveredPerson.relationship_type).stroke }}>
                  {getRelConfig(hoveredPerson.relationship_type).label}
                </span>
              </div>
              {hoveredPerson.related_period && (
                <div className="text-[10px] text-muted-foreground mt-0.5">{hoveredPerson.related_period}</div>
              )}
              {hoveredPerson.notes && (
                <div className="text-[10px] text-foreground/70 mt-1 line-clamp-2">{hoveredPerson.notes}</div>
              )}
            </div>
          </div>
        )}

        {/* Detail panel */}
        {selectedPerson && (
          <div className="absolute top-4 right-4 w-72 bg-card border rounded-lg shadow-lg p-4 space-y-3 z-10">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">{selectedPerson.name}</h3>
                {selectedPerson.nickname && <p className="text-sm text-muted-foreground">({selectedPerson.nickname})</p>}
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
                <div><span className="text-muted-foreground">Idoszak: </span><span>{selectedPerson.related_period}</span></div>
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
              {(() => {
                const linked = getLinkedEvents(selectedPerson)
                if (linked.length === 0) return null
                return (
                  <div>
                    <span className="text-muted-foreground block mb-1">Kapcsolodo esemenyek:</span>
                    <div className="space-y-1">
                      {linked.map(ev => <div key={ev.id} className="text-xs bg-muted/50 rounded px-2 py-1">{ev.title}</div>)}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Zoom hint */}
        {zoom === 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50 pointer-events-none">
            Scroll = zoom · Drag = mozgás · Jobb klikk = áthelyezés
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
                    <div key={person.id}
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
                            {person.nickname && <span className="text-xs text-muted-foreground truncate">({person.nickname})</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 text-[10px] px-1.5 py-0`}>{cfg.label}</Badge>
                            {person.related_period && <span className="text-[10px] text-muted-foreground">{person.related_period}</span>}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                          {person.notes && (
                            <div>
                              <span className="text-muted-foreground text-xs block mb-0.5">Jegyzetek:</span>
                              <p className="text-xs bg-muted/50 rounded p-2">{person.notes}</p>
                            </div>
                          )}
                          {linked.length > 0 && (
                            <div>
                              <span className="text-muted-foreground text-xs block mb-1">Kapcsolodo esemenyek:</span>
                              <div className="space-y-1">
                                {linked.map(ev => <div key={ev.id} className="text-xs bg-muted/50 rounded px-2 py-1">{ev.title}</div>)}
                              </div>
                            </div>
                          )}
                          {/* Mobile tier move */}
                          <div className="pt-1 border-t">
                            <span className="text-muted-foreground text-xs block mb-1">Áthelyezés:</span>
                            <div className="flex gap-1.5">
                              {[1, 2, 3].map(t => (
                                <button key={t} disabled={tier === t}
                                  onClick={e => { e.stopPropagation(); movePerson(person, t) }}
                                  className={`text-xs px-2 py-1 rounded border disabled:opacity-40 ${t === 1 ? 'border-rose-400 text-rose-600' : t === 2 ? 'border-blue-400 text-blue-600' : 'border-amber-400 text-amber-600'}`}>
                                  {TIER_LABELS[t]}
                                </button>
                              ))}
                            </div>
                          </div>
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
      </>
      )}
    </div>
  )
}
