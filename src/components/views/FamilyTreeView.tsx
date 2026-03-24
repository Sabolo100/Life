import { useState, useMemo, useRef, useEffect } from 'react'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus, ZoomIn, ZoomOut, Maximize2, Trash2, Users } from 'lucide-react'
import type { Person, FamilyRelationship, FamilyRelType } from '@/types'

// ── Constants ──────────────────────────────────────────────────────────────

const NODE_W = 130
const NODE_H = 55
const H_GAP = 35
const V_GAP = 95
const SPOUSE_GAP = 12
const CONNECTOR_Y_OFFSET = 22 // vertical space for the T-connector between generations

const REL_TYPE_LABELS: Record<FamilyRelType, string> = {
  parent: 'Szülő',
  child: 'Gyerek',
  spouse: 'Házastárs',
  sibling: 'Testvér',
}

const INVERSE_REL: Record<FamilyRelType, FamilyRelType> = {
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  sibling: 'sibling',
}

// ── Types ──────────────────────────────────────────────────────────────────

type NodeId = string // person.id or 'self'

interface TreeNode {
  id: NodeId
  person: Person | null // null for self
  name: string
  relLabel: string
  generation: number
  x: number
  y: number
}

interface TreeEdge {
  type: 'parent-child' | 'spouse'
  fromId: NodeId
  toId: NodeId
}

// ── Layout algorithm ───────────────────────────────────────────────────────

function buildAdjacency(relationships: FamilyRelationship[]) {
  const adj = new Map<NodeId, { parents: NodeId[]; children: NodeId[]; spouses: NodeId[]; siblings: NodeId[] }>()

  const ensure = (id: NodeId) => {
    if (!adj.has(id)) adj.set(id, { parents: [], children: [], spouses: [], siblings: [] })
    return adj.get(id)!
  }

  ensure('self')

  for (const rel of relationships) {
    const fromId: NodeId = rel.from_person_id ?? 'self'
    const toId: NodeId = rel.to_person_id ?? 'self'
    const fromAdj = ensure(fromId)
    const toAdj = ensure(toId)

    switch (rel.relationship_type) {
      case 'parent':
        // "to" is parent of "from"
        if (!fromAdj.parents.includes(toId)) fromAdj.parents.push(toId)
        if (!toAdj.children.includes(fromId)) toAdj.children.push(fromId)
        break
      case 'child':
        // "to" is child of "from"
        if (!fromAdj.children.includes(toId)) fromAdj.children.push(toId)
        if (!toAdj.parents.includes(fromId)) toAdj.parents.push(fromId)
        break
      case 'spouse':
        if (!fromAdj.spouses.includes(toId)) fromAdj.spouses.push(toId)
        if (!toAdj.spouses.includes(fromId)) toAdj.spouses.push(fromId)
        break
      case 'sibling':
        if (!fromAdj.siblings.includes(toId)) fromAdj.siblings.push(toId)
        if (!toAdj.siblings.includes(fromId)) toAdj.siblings.push(fromId)
        break
    }
  }

  return adj
}

function assignGenerations(adj: ReturnType<typeof buildAdjacency>): Map<NodeId, number> {
  const gen = new Map<NodeId, number>()
  gen.set('self', 0)
  const queue: NodeId[] = ['self']

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const g = gen.get(nodeId)!
    const neighbors = adj.get(nodeId)
    if (!neighbors) continue

    for (const p of neighbors.parents) {
      if (!gen.has(p)) { gen.set(p, g - 1); queue.push(p) }
    }
    for (const c of neighbors.children) {
      if (!gen.has(c)) { gen.set(c, g + 1); queue.push(c) }
    }
    for (const s of neighbors.spouses) {
      if (!gen.has(s)) { gen.set(s, g); queue.push(s) }
    }
    for (const sib of neighbors.siblings) {
      if (!gen.has(sib)) { gen.set(sib, g); queue.push(sib) }
    }
  }

  return gen
}

function layoutTree(
  adj: ReturnType<typeof buildAdjacency>,
  generations: Map<NodeId, number>,
  personsMap: Map<string, Person>,
  selfName: string,
): { nodes: TreeNode[]; edges: TreeEdge[] } {
  // Group by generation
  const genGroups = new Map<number, NodeId[]>()
  for (const [id, g] of generations) {
    if (!genGroups.has(g)) genGroups.set(g, [])
    genGroups.get(g)!.push(id)
  }

  const sortedGens = [...genGroups.keys()].sort((a, b) => a - b)
  const minGen = sortedGens[0] ?? 0

  // Position nodes per generation
  const nodePositions = new Map<NodeId, { x: number; y: number }>()

  for (const g of sortedGens) {
    const nodeIds = genGroups.get(g)!
    // Group spouses together
    const placed = new Set<NodeId>()
    const units: NodeId[][] = []

    for (const nodeId of nodeIds) {
      if (placed.has(nodeId)) continue
      placed.add(nodeId)
      const unit = [nodeId]
      const spouses = adj.get(nodeId)?.spouses || []
      for (const s of spouses) {
        if (generations.get(s) === g && !placed.has(s)) {
          unit.push(s)
          placed.add(s)
        }
      }
      units.push(unit)
    }

    // Position units left to right
    let x = 0
    for (const unit of units) {
      for (let i = 0; i < unit.length; i++) {
        nodePositions.set(unit[i], {
          x: x + i * (NODE_W + SPOUSE_GAP),
          y: (g - minGen) * (NODE_H + V_GAP),
        })
      }
      x += unit.length * NODE_W + (unit.length - 1) * SPOUSE_GAP + H_GAP
    }

    // Center the generation at x=0
    const allXs = nodeIds.map(id => nodePositions.get(id)!.x)
    const totalWidth = Math.max(...allXs) + NODE_W - Math.min(...allXs)
    const offset = -totalWidth / 2
    for (const id of nodeIds) {
      nodePositions.get(id)!.x += offset
    }
  }

  // Centering pass: center children under their parents
  for (const g of sortedGens) {
    const nodeIds = genGroups.get(g)!
    for (const nodeId of nodeIds) {
      const children = adj.get(nodeId)?.children || []
      const positionedChildren = children.filter(c => nodePositions.has(c))
      if (positionedChildren.length === 0) continue

      // Find center of children
      const childXs = positionedChildren.map(c => nodePositions.get(c)!.x + NODE_W / 2)
      const childCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2

      // Find parent center (including spouse)
      const parentPos = nodePositions.get(nodeId)!
      const spouses = (adj.get(nodeId)?.spouses || []).filter(s => generations.get(s) === g)
      let parentCenter: number
      if (spouses.length > 0 && nodePositions.has(spouses[0])) {
        const spousePos = nodePositions.get(spouses[0])!
        parentCenter = (Math.min(parentPos.x, spousePos.x) + Math.max(parentPos.x, spousePos.x) + NODE_W) / 2
      } else {
        parentCenter = parentPos.x + NODE_W / 2
      }

      // Shift children to center under parents
      const shift = parentCenter - childCenter
      for (const c of positionedChildren) {
        nodePositions.get(c)!.x += shift
        // Also shift the children's spouses
        const cSpouses = (adj.get(c)?.spouses || []).filter(s => generations.get(s) === generations.get(c))
        for (const cs of cSpouses) {
          if (nodePositions.has(cs)) nodePositions.get(cs)!.x += shift
        }
      }
    }
  }

  // Build nodes
  const getRelLabel = (id: NodeId): string => {
    if (id === 'self') return ''
    const person = personsMap.get(id)
    return person?.relationship_type || ''
  }

  const nodes: TreeNode[] = []
  for (const [id, pos] of nodePositions) {
    const person = id === 'self' ? null : personsMap.get(id) ?? null
    nodes.push({
      id,
      person,
      name: id === 'self' ? selfName : (person?.name || '?'),
      relLabel: getRelLabel(id),
      generation: generations.get(id) ?? 0,
      x: pos.x,
      y: pos.y,
    })
  }

  // Build edges
  const edges: TreeEdge[] = []
  const edgeSet = new Set<string>()

  for (const [nodeId, neighbors] of adj) {
    if (!nodePositions.has(nodeId)) continue

    for (const childId of neighbors.children) {
      if (!nodePositions.has(childId)) continue
      const key = `pc:${nodeId}:${childId}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        edges.push({ type: 'parent-child', fromId: nodeId, toId: childId })
      }
    }

    for (const spouseId of neighbors.spouses) {
      if (!nodePositions.has(spouseId)) continue
      const key1 = `sp:${nodeId}:${spouseId}`
      const key2 = `sp:${spouseId}:${nodeId}`
      if (!edgeSet.has(key1) && !edgeSet.has(key2)) {
        edgeSet.add(key1)
        edges.push({ type: 'spouse', fromId: nodeId, toId: spouseId })
      }
    }
  }

  return { nodes, edges }
}

// ── Auto-import helper ─────────────────────────────────────────────────────

/**
 * Maps a person's relationship_type string to a FamilyRelType + direction.
 * Returns null if the type is not a direct family relationship.
 * Direction: 'to_is_person' means from=self(null), to=person.id
 *            'from_is_person' means from=person.id, to=self(null)
 */
function inferFamilyRelFromType(relType: string): {
  type: FamilyRelType
  direction: 'to_is_person' | 'from_is_person'
} | null {
  const t = relType.toLowerCase().trim()

  // Parents (person is parent of self → "to" is parent of "from=self")
  const parentKeywords = ['anya', 'édesanya', 'apa', 'édesapa', 'mostohaanya', 'mostohaapa',
    'nevelőanya', 'nevelőapa', 'mama', 'papa', 'tata', 'anyám', 'apám']
  if (parentKeywords.some(k => t === k || t.includes(k))) {
    return { type: 'parent', direction: 'to_is_person' }
  }

  // Children (person is child of self)
  const childKeywords = ['gyerek', 'gyermek', 'fiam', 'lányom', 'fiú', 'leány']
  if (childKeywords.some(k => t === k || t.includes(k))) {
    return { type: 'child', direction: 'to_is_person' }
  }

  // Spouse
  const spouseKeywords = ['házastárs', 'feleség', 'férj', 'élettárs', 'pár', 'menyasszony', 'vőlegény']
  if (spouseKeywords.some(k => t === k || t.includes(k))) {
    return { type: 'spouse', direction: 'to_is_person' }
  }

  // Siblings
  const siblingKeywords = ['testvér', 'nővér', 'báty', 'bátya', 'öcs', 'öcsém', 'húg', 'hugom', 'fivér', 'nénjem']
  if (siblingKeywords.some(k => t === k || t.includes(k))) {
    return { type: 'sibling', direction: 'to_is_person' }
  }

  return null
}

// ── Component ──────────────────────────────────────────────────────────────

interface FamilyTreeViewProps {
  selfName: string
}

export function FamilyTreeView({ selfName }: FamilyTreeViewProps) {
  const { persons, familyRelationships, addFamilyRelationship, batchAddFamilyRelationships, removeFamilyRelationship } = useLifeStoryStore()

  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null)
  const [addingRel, setAddingRel] = useState(false)
  const [newRelType, setNewRelType] = useState<FamilyRelType>('parent')
  const [newRelPersonId, setNewRelPersonId] = useState<string>('')
  const [importing, setImporting] = useState(false)

  // Detect persons that can be auto-imported
  const importCandidates = useMemo(() => {
    if (familyRelationships.length > 0) return []
    return persons
      .map(p => {
        const inferred = inferFamilyRelFromType(p.relationship_type)
        if (!inferred) return null
        return { person: p, ...inferred }
      })
      .filter(Boolean) as Array<{ person: Person; type: FamilyRelType; direction: 'to_is_person' | 'from_is_person' }>
  }, [persons, familyRelationships])

  const handleAutoImport = async () => {
    if (importCandidates.length === 0) return
    setImporting(true)
    const entries = importCandidates.map(c => ({
      fromPersonId: c.direction === 'from_is_person' ? c.person.id : null,
      toPersonId: c.direction === 'to_is_person' ? c.person.id : null,
      type: c.type,
    }))
    await batchAddFamilyRelationships(entries)
    setImporting(false)
  }

  // Zoom / pan
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  const personsMap = useMemo(() => {
    const m = new Map<string, Person>()
    for (const p of persons) m.set(p.id, p)
    return m
  }, [persons])

  // Build tree layout
  const { nodes, edges } = useMemo(() => {
    if (familyRelationships.length === 0) {
      return { nodes: [], edges: [] }
    }
    const adj = buildAdjacency(familyRelationships)
    const generations = assignGenerations(adj)
    return layoutTree(adj, generations, personsMap, selfName || 'Én')
  }, [familyRelationships, personsMap, selfName])

  // Compute viewBox from nodes
  const viewBoxData = useMemo(() => {
    if (nodes.length === 0) return { minX: -200, minY: -50, width: 400, height: 300 }
    const padding = 60
    const xs = nodes.map(n => n.x)
    const ys = nodes.map(n => n.y)
    const minX = Math.min(...xs) - padding
    const minY = Math.min(...ys) - padding
    const maxX = Math.max(...xs) + NODE_W + padding
    const maxY = Math.max(...ys) + NODE_H + padding
    return { minX, minY, width: maxX - minX, height: maxY - minY }
  }, [nodes])

  // Apply zoom/pan to viewBox
  const vbW = viewBoxData.width / zoom
  const vbH = viewBoxData.height / zoom
  const vbCenterX = viewBoxData.minX + viewBoxData.width / 2
  const vbCenterY = viewBoxData.minY + viewBoxData.height / 2
  const vbX = vbCenterX - vbW / 2 + pan.x
  const vbY = vbCenterY - vbH / 2 + pan.y

  // Wheel zoom
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setZoom(z => Math.max(0.3, Math.min(5, z * factor)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Pan via drag
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    isPanning.current = true
    panStart.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y }
    e.currentTarget.style.cursor = 'grabbing'
  }
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgScaleX = vbW / rect.width
    const svgScaleY = vbH / rect.height
    const dx = (e.clientX - panStart.current.mouseX) * svgScaleX
    const dy = (e.clientY - panStart.current.mouseY) * svgScaleY
    setPan({ x: panStart.current.panX - dx, y: panStart.current.panY - dy })
  }
  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    isPanning.current = false
    e.currentTarget.style.cursor = 'grab'
  }

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  // Selected node
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  // Get relationships for a node
  const getNodeRelationships = (nodeId: NodeId): (FamilyRelationship & { otherName: string })[] => {
    return familyRelationships
      .filter(r => {
        const fromId = r.from_person_id ?? 'self'
        const toId = r.to_person_id ?? 'self'
        return fromId === nodeId || toId === nodeId
      })
      .map(r => {
        const fromId = r.from_person_id ?? 'self'
        const toId = r.to_person_id ?? 'self'
        const otherId = fromId === nodeId ? toId : fromId
        const otherPerson = otherId === 'self' ? null : personsMap.get(otherId)
        const otherName = otherId === 'self' ? (selfName || 'Én') : (otherPerson?.name || '?')
        // Invert type if viewing from the "to" side
        const displayType = toId === nodeId ? INVERSE_REL[r.relationship_type] : r.relationship_type
        return { ...r, otherName, relationship_type: displayType }
      })
  }

  // Add relationship handler
  const handleAddRelationship = async () => {
    if (!selectedNodeId || !newRelPersonId) return
    const fromId = selectedNodeId === 'self' ? null : selectedNodeId
    const toId = newRelPersonId === 'self' ? null : newRelPersonId
    await addFamilyRelationship(fromId, toId, newRelType)
    setAddingRel(false)
    setNewRelPersonId('')
  }

  // Available persons for relationship (exclude already connected and self-reference)
  const availablePersons = useMemo(() => {
    if (!selectedNodeId) return []
    const existing = new Set(
      familyRelationships
        .filter(r => (r.from_person_id ?? 'self') === selectedNodeId || (r.to_person_id ?? 'self') === selectedNodeId)
        .map(r => {
          const fromId = r.from_person_id ?? 'self'
          const toId = r.to_person_id ?? 'self'
          return fromId === selectedNodeId ? toId : fromId
        })
    )
    const result: { id: string; name: string }[] = []
    // Add "Én" option if not self
    if (selectedNodeId !== 'self' && !existing.has('self')) {
      result.push({ id: 'self', name: selfName || 'Én' })
    }
    // Add other persons
    for (const p of persons) {
      if (p.id === selectedNodeId || existing.has(p.id)) continue
      result.push({ id: p.id, name: p.name })
    }
    return result
  }, [selectedNodeId, persons, familyRelationships, selfName])

  // ── Render ─────────────────────────────────────────────────────────────

  if (familyRelationships.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto space-y-5">
          <div className="text-center space-y-2">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-lg font-semibold">A családfád még üres</h3>
            <p className="text-sm text-muted-foreground">
              Kapcsolati hálóból a következő személyek importálhatók automatikusan:
            </p>
          </div>

          {importCandidates.length > 0 ? (
            <>
              <div className="border rounded-xl divide-y overflow-hidden">
                {importCandidates.map(({ person, type }) => (
                  <div key={person.id} className="flex items-center justify-between px-4 py-3 bg-card">
                    <div>
                      <span className="text-sm font-medium">{person.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({person.relationship_type})</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {REL_TYPE_LABELS[type]}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button
                className="w-full gap-2"
                disabled={importing}
                onClick={handleAutoImport}
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Importálás...
                  </span>
                ) : (
                  <><Plus className="w-4 h-4" /> {importCandidates.length} személy importálása</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Nagyszülők, sógorok és egyéb távolabbi rokonok a fa megnyitása után adhatók hozzá kézzel.
              </p>
            </>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Még nincsenek felismert közvetlen hozzátartozók.
              </p>
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => { setSelectedNodeId('self'); setAddingRel(true) }}
            >
              <Plus className="w-4 h-4" /> Kapcsolat kézi hozzáadása
            </Button>

            {/* Inline add panel when triggered from empty state */}
            {selectedNodeId === 'self' && addingRel && (
              <div className="border rounded-xl p-4 space-y-2 bg-card">
                <p className="text-xs font-medium text-muted-foreground">Én kapcsolata:</p>
                <div className="flex gap-2">
                  <select
                    value={newRelType}
                    onChange={e => setNewRelType(e.target.value as FamilyRelType)}
                    className="flex-1 text-sm border rounded px-2 py-1.5 bg-background"
                  >
                    <option value="parent">Szülőm</option>
                    <option value="child">Gyerekem</option>
                    <option value="spouse">Házastársam</option>
                    <option value="sibling">Testvérem</option>
                  </select>
                </div>
                <select
                  value={newRelPersonId}
                  onChange={e => setNewRelPersonId(e.target.value)}
                  className="w-full text-sm border rounded px-2 py-1.5 bg-background"
                >
                  <option value="">Válassz személyt...</option>
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.relationship_type})</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs" disabled={!newRelPersonId} onClick={handleAddRelationship}>
                    Hozzáadás
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setAddingRel(false); setSelectedNodeId(null) }}>
                    Mégse
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Build node lookup for edges
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Zoom controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-background/80 border rounded-lg px-1 py-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(5, z * 1.3))}>
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
          setZoom(z => { const nz = Math.max(0.3, z / 1.3); if (nz <= 1) setPan({ x: 0, y: 0 }); return nz })
        }}>
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}>
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Add new connection button */}
      <div className="absolute top-3 right-3 z-10">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 bg-background/80"
          onClick={() => { setSelectedNodeId('self'); setAddingRel(true) }}
        >
          <Plus className="w-3.5 h-3.5" /> Kapcsolat
        </Button>
      </div>

      {/* SVG tree */}
      <svg
        ref={svgRef}
        className="flex-1 w-full"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ cursor: 'grab', userSelect: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => { setSelectedNodeId(null); setAddingRel(false) }}
      >
        <defs>
          <filter id="nodeShadow" x="-10%" y="-10%" width="130%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.fromId)
          const to = nodeMap.get(edge.toId)
          if (!from || !to) return null

          if (edge.type === 'spouse') {
            // Horizontal line connecting spouses at mid-height
            const y = from.y + NODE_H / 2
            const x1 = Math.min(from.x, to.x) + NODE_W
            const x2 = Math.max(from.x, to.x)
            return (
              <g key={`edge-${i}`}>
                <line x1={x1} y1={y} x2={x2} y2={y} stroke="#e11d48" strokeWidth="2" />
                {/* Small heart */}
                <text x={(x1 + x2) / 2} y={y - 3} textAnchor="middle" fontSize="8" fill="#e11d48">&#9829;</text>
              </g>
            )
          }

          // Parent-child: T-connector
          const parentCenterX = from.x + NODE_W / 2
          const parentBottomY = from.y + NODE_H
          const childCenterX = to.x + NODE_W / 2
          const childTopY = to.y
          const midY = parentBottomY + CONNECTOR_Y_OFFSET

          return (
            <g key={`edge-${i}`}>
              {/* Vertical from parent bottom to mid */}
              <line x1={parentCenterX} y1={parentBottomY} x2={parentCenterX} y2={midY}
                stroke="#94a3b8" strokeWidth="1.5" />
              {/* Horizontal to child x */}
              <line x1={parentCenterX} y1={midY} x2={childCenterX} y2={midY}
                stroke="#94a3b8" strokeWidth="1.5" />
              {/* Vertical from mid to child top */}
              <line x1={childCenterX} y1={midY} x2={childCenterX} y2={childTopY}
                stroke="#94a3b8" strokeWidth="1.5" />
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isSelected = selectedNodeId === node.id
          const isSelf = node.id === 'self'
          const borderColor = isSelf ? '#6366f1' : '#94a3b8'
          const bgColor = isSelf ? '#eef2ff' : '#ffffff'
          const headerColor = isSelf ? '#6366f1' : '#334155'

          return (
            <g
              key={node.id}
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); setSelectedNodeId(isSelected ? null : node.id); setAddingRel(false) }}
            >
              {/* Card */}
              <rect
                x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={8}
                fill={bgColor} stroke={isSelected ? '#6366f1' : borderColor}
                strokeWidth={isSelected ? 2.5 : 1.2}
                filter="url(#nodeShadow)"
              />
              {/* Name */}
              <text
                x={node.x + NODE_W / 2} y={node.y + 22}
                textAnchor="middle" fontSize="12" fontWeight="600" fill={headerColor}
              >
                {node.name.length > 16 ? node.name.slice(0, 14) + '...' : node.name}
              </text>
              {/* Relationship label */}
              {node.relLabel && (
                <text
                  x={node.x + NODE_W / 2} y={node.y + 38}
                  textAnchor="middle" fontSize="10" fill="#64748b"
                >
                  {node.relLabel}
                </text>
              )}
              {isSelf && (
                <text
                  x={node.x + NODE_W / 2} y={node.y + 38}
                  textAnchor="middle" fontSize="10" fill="#6366f1" fontWeight="500"
                >
                  (Én)
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Selection panel */}
      {selectedNodeId && (
        <div
          className="absolute bottom-4 right-4 w-80 bg-card border rounded-xl shadow-xl p-4 z-20 space-y-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">
                {selectedNode?.name || (selectedNodeId === 'self' ? (selfName || 'Én') : '?')}
              </h3>
              {selectedNode?.relLabel && (
                <p className="text-xs text-muted-foreground">{selectedNode.relLabel}</p>
              )}
            </div>
            <button
              className="p-1 hover:text-destructive"
              onClick={() => { setSelectedNodeId(null); setAddingRel(false) }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Existing relationships */}
          {(() => {
            const rels = getNodeRelationships(selectedNodeId)
            if (rels.length === 0) return null
            return (
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground font-medium">Kapcsolatok:</span>
                {rels.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1.5">
                    <div>
                      <span className="font-medium">{r.otherName}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                        {REL_TYPE_LABELS[r.relationship_type]}
                      </Badge>
                    </div>
                    <button
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFamilyRelationship(r.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Add relationship form */}
          {addingRel ? (
            <div className="space-y-2 border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground">Új kapcsolat:</span>
              <div className="flex gap-2">
                <select
                  value={newRelType}
                  onChange={e => setNewRelType(e.target.value as FamilyRelType)}
                  className="flex-1 text-sm border rounded px-2 py-1.5 bg-background"
                >
                  <option value="parent">Szülője</option>
                  <option value="child">Gyereke</option>
                  <option value="spouse">Házastársa</option>
                  <option value="sibling">Testvére</option>
                </select>
              </div>
              <select
                value={newRelPersonId}
                onChange={e => setNewRelPersonId(e.target.value)}
                className="w-full text-sm border rounded px-2 py-1.5 bg-background"
              >
                <option value="">Válassz személyt...</option>
                {availablePersons.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs" disabled={!newRelPersonId} onClick={handleAddRelationship}>
                  Hozzáadás
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAddingRel(false)}>
                  Mégse
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => setAddingRel(true)}
            >
              <Plus className="w-3 h-3" /> Kapcsolat hozzáadása
            </Button>
          )}
        </div>
      )}

      {/* Hint */}
      {zoom === 1 && !selectedNodeId && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50 pointer-events-none whitespace-nowrap">
          Scroll = zoom · Drag = mozgatás · Kattintás = kiválasztás
        </div>
      )}
    </div>
  )
}
