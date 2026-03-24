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

const REL_TYPE_LABELS: Record<FamilyRelType, string> = {
  parent: 'Szülő',
  child: 'Gyerek',
  spouse: 'Házastárs',
  ex_spouse: 'Volt partner',
  sibling: 'Testvér',
}

const INVERSE_REL: Record<FamilyRelType, FamilyRelType> = {
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  ex_spouse: 'ex_spouse',
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
  type: 'spouse' | 'ex_spouse'
  fromId: NodeId
  toId: NodeId
}

/** One T-connector: one parent couple → all their shared children */
interface FamilyUnitEdge {
  parentIds: NodeId[]   // 1 or 2
  childIds: NodeId[]
}

// ── Layout algorithm ───────────────────────────────────────────────────────

function buildAdjacency(relationships: FamilyRelationship[]) {
  const adj = new Map<NodeId, { parents: NodeId[]; children: NodeId[]; spouses: NodeId[]; exSpouses: NodeId[]; siblings: NodeId[] }>()

  const ensure = (id: NodeId) => {
    if (!adj.has(id)) adj.set(id, { parents: [], children: [], spouses: [], exSpouses: [], siblings: [] })
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
      case 'ex_spouse':
        if (!fromAdj.exSpouses.includes(toId)) fromAdj.exSpouses.push(toId)
        if (!toAdj.exSpouses.includes(fromId)) toAdj.exSpouses.push(fromId)
        break
      case 'sibling':
        if (!fromAdj.siblings.includes(toId)) fromAdj.siblings.push(toId)
        if (!toAdj.siblings.includes(fromId)) toAdj.siblings.push(fromId)
        break
    }
  }

  // Propagate parents through sibling chains:
  // If A is sibling of B, and B has parents [P1, P2], then A is also child of P1 and P2.
  // Run until stable (handles transitive siblings).
  let changed = true
  while (changed) {
    changed = false
    for (const [nodeId, nodeAdj] of adj) {
      for (const sibId of nodeAdj.siblings) {
        const sibAdj = adj.get(sibId)
        if (!sibAdj) continue
        for (const parentId of sibAdj.parents) {
          if (!nodeAdj.parents.includes(parentId)) {
            nodeAdj.parents.push(parentId)
            adj.get(parentId)?.children.push(nodeId)
            changed = true
          }
        }
      }
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
    for (const ex of neighbors.exSpouses) {
      if (!gen.has(ex)) { gen.set(ex, g); queue.push(ex) }
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
): { nodes: TreeNode[]; edges: TreeEdge[]; familyUnits: FamilyUnitEdge[] } {
  const genGroups = new Map<number, NodeId[]>()
  for (const [id, g] of generations) {
    if (!genGroups.has(g)) genGroups.set(g, [])
    genGroups.get(g)!.push(id)
  }

  const sortedGens = [...genGroups.keys()].sort((a, b) => a - b)
  const minGen = sortedGens[0] ?? 0
  const FAMILY_GAP = 55 // extra gap between unrelated family groups in same generation

  const nodePositions = new Map<NodeId, { x: number; y: number }>()

  for (const g of sortedGens) {
    const nodeIds = genGroups.get(g)!

    // Group nodes by their shared parents at the previous generation.
    // Then merge groups connected by spouse edges so couples always stay together.
    const getParentKey = (nodeId: NodeId): string => {
      const parents = (adj.get(nodeId)?.parents || [])
        .filter(p => generations.get(p) === g - 1 && nodePositions.has(p))
        .sort()
      return parents.length > 0 ? parents.join('|') : `__orphan__${nodeId}`
    }

    const initialGroupMap = new Map<string, NodeId[]>()
    for (const nodeId of nodeIds) {
      const key = getParentKey(nodeId)
      if (!initialGroupMap.has(key)) initialGroupMap.set(key, [])
      initialGroupMap.get(key)!.push(nodeId)
    }

    // Merge groups connected by spouse edges using Union-Find
    // This ensures couples (e.g. self + wife) are always in the same group
    const nodeToKey = new Map<NodeId, string>()
    for (const [key, grpNodes] of initialGroupMap) {
      for (const n of grpNodes) nodeToKey.set(n, key)
    }

    const ufParent = new Map<string, string>()
    const ufFind = (k: string): string => {
      if (!ufParent.has(k)) ufParent.set(k, k)
      if (ufParent.get(k) !== k) ufParent.set(k, ufFind(ufParent.get(k)!))
      return ufParent.get(k)!
    }
    const ufUnion = (a: string, b: string) => {
      const ra = ufFind(a), rb = ufFind(b)
      if (ra !== rb) {
        // Prefer non-orphan key as root so group keeps meaningful parent reference
        if (ra.startsWith('__orphan__') && !rb.startsWith('__orphan__')) {
          ufParent.set(ra, rb)
        } else {
          ufParent.set(rb, ra)
        }
      }
    }

    for (const nodeId of nodeIds) {
      const nk = nodeToKey.get(nodeId)!
      // Merge groups for both current spouses and ex-spouses so they share a family group
      const allPartners = [...(adj.get(nodeId)?.spouses ?? []), ...(adj.get(nodeId)?.exSpouses ?? [])]
      for (const sp of allPartners) {
        const sk = nodeToKey.get(sp)
        if (sk && sk !== nk) ufUnion(nk, sk)
      }
    }

    // Rebuild groups with merged keys
    const groupMap = new Map<string, NodeId[]>()
    for (const [key, grpNodes] of initialGroupMap) {
      const root = ufFind(key)
      if (!groupMap.has(root)) groupMap.set(root, [])
      groupMap.get(root)!.push(...grpNodes)
    }

    // Sort groups: non-orphan groups ordered by leftmost parent x, orphans at end
    const nonOrphan: Array<[string, NodeId[]]> = []
    const orphan: Array<[string, NodeId[]]> = []
    for (const entry of groupMap) {
      (entry[0].startsWith('__orphan__') ? orphan : nonOrphan).push(entry)
    }
    nonOrphan.sort(([keyA], [keyB]) => {
      const xA = Math.min(...keyA.split('|').map(p => nodePositions.get(p)?.x ?? 0))
      const xB = Math.min(...keyB.split('|').map(p => nodePositions.get(p)?.x ?? 0))
      return xA - xB
    })
    const allGroups = [...nonOrphan, ...orphan]

    // Layout each group left-to-right; spouses adjacent within group
    let x = 0
    for (let gi = 0; gi < allGroups.length; gi++) {
      const groupNodes = allGroups[gi][1]
      const placed = new Set<NodeId>()
      const arranged: NodeId[] = []

      for (const nodeId of groupNodes) {
        if (placed.has(nodeId)) continue
        placed.add(nodeId)
        arranged.push(nodeId)
        // Only current spouses are placed immediately adjacent; ex-spouses stay in normal order
        for (const s of adj.get(nodeId)?.spouses || []) {
          if (generations.get(s) === g && groupNodes.includes(s) && !placed.has(s)) {
            placed.add(s)
            arranged.push(s)
          }
        }
      }

      for (let i = 0; i < arranged.length; i++) {
        const nodeId = arranged[i]
        const prevId = i > 0 ? arranged[i - 1] : null
        const isCurrentSpouseOfPrev = prevId && (adj.get(prevId)?.spouses || []).includes(nodeId)
        if (i > 0) x += isCurrentSpouseOfPrev ? SPOUSE_GAP : H_GAP
        nodePositions.set(nodeId, { x, y: (g - minGen) * (NODE_H + V_GAP) })
        x += NODE_W
      }

      if (gi < allGroups.length - 1) x += FAMILY_GAP
    }

    // Center this generation at x=0
    const allXs = nodeIds.map(id => nodePositions.get(id)!.x)
    const minX = Math.min(...allXs)
    const maxX = Math.max(...allXs) + NODE_W
    const offset = -((minX + maxX) / 2)
    for (const id of nodeIds) nodePositions.get(id)!.x += offset
  }

  // Ancestor centering pass: process gen -1, -2, ... outward from gen 0.
  // For each ancestor generation, group nodes into sibling families and shift each
  // family group AS A WHOLE to center above their children in the already-positioned refGen (g+1).
  // Processing outward ensures each gen centers above the final positions of the gen below it.
  for (let g = -1; g >= (sortedGens[0] ?? 0); g--) {
    if (!genGroups.has(g)) continue
    const nodeIds = genGroups.get(g)!
    const refGen = g + 1

    // BFS to build sibling groups (connected components through sibling edges)
    const visited = new Set<NodeId>()
    for (const startNode of nodeIds) {
      if (visited.has(startNode)) continue
      const group: NodeId[] = []
      const q: NodeId[] = [startNode]
      visited.add(startNode)
      while (q.length > 0) {
        const id = q.shift()!
        group.push(id)
        for (const sib of (adj.get(id)?.siblings ?? [])) {
          if (!visited.has(sib) && nodeIds.includes(sib)) {
            visited.add(sib)
            q.push(sib)
          }
        }
      }

      // Collect all children of this sibling group in refGen
      const refChildren = new Set<NodeId>()
      for (const id of group) {
        for (const c of (adj.get(id)?.children ?? [])) {
          if (generations.get(c) === refGen && nodePositions.has(c)) refChildren.add(c)
        }
      }
      if (refChildren.size === 0) continue

      const childXs = [...refChildren].map(c => nodePositions.get(c)!.x + NODE_W / 2)
      const childrenCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2

      // Expand group to include spouses and ex-spouses of each sibling
      const fullGroup = new Set(group)
      for (const id of group) {
        for (const sp of [...(adj.get(id)?.spouses ?? []), ...(adj.get(id)?.exSpouses ?? [])]) {
          if (generations.get(sp) === g && nodePositions.has(sp)) fullGroup.add(sp)
        }
      }

      const groupXs = [...fullGroup].map(id => nodePositions.get(id)!.x)
      const groupCenter = (Math.min(...groupXs) + Math.max(...groupXs) + NODE_W) / 2

      const shift = childrenCenter - groupCenter
      if (Math.abs(shift) > 0.5) {
        for (const id of fullGroup) nodePositions.get(id)!.x += shift
      }
    }
  }

  // Descendant centering pass: process gen +1, +2, ... outward from gen 0.
  // Shift each child group to center below their parent couple in the already-positioned refGen (g-1).
  for (let g = 1; g <= (sortedGens[sortedGens.length - 1] ?? 0); g++) {
    if (!genGroups.has(g)) continue
    const nodeIds = genGroups.get(g)!
    const refGen = g - 1

    // Group children by their parent set in refGen
    const groupMap = new Map<string, NodeId[]>()
    for (const nodeId of nodeIds) {
      const parents = (adj.get(nodeId)?.parents ?? [])
        .filter(p => generations.get(p) === refGen && nodePositions.has(p))
        .sort()
      const key = parents.length > 0 ? parents.join('|') : `__orphan__${nodeId}`
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(nodeId)
    }

    for (const [key, group] of groupMap) {
      if (key.startsWith('__orphan__')) continue

      const parentIds = key.split('|')
      const parentXs = parentIds.map(p => (nodePositions.get(p)?.x ?? 0) + NODE_W / 2)
      const parentsCenter = (Math.min(...parentXs) + Math.max(...parentXs)) / 2

      const childXs = group.map(c => nodePositions.get(c)!.x + NODE_W / 2)
      const childrenCenter = (Math.min(...childXs) + Math.max(...childXs)) / 2

      const shift = parentsCenter - childrenCenter
      if (Math.abs(shift) > 0.5) {
        for (const c of group) nodePositions.get(c)!.x += shift
      }
    }
  }

  // Final overlap resolution: ensure no two nodes in the same generation overlap.
  // After centering passes, groups may have been shifted into each other.
  for (const g of sortedGens) {
    if (!genGroups.has(g)) continue
    const gNodeIds = genGroups.get(g)!
    if (gNodeIds.length < 2) continue

    const sorted = [...gNodeIds]
      .filter(id => nodePositions.has(id))
      .sort((a, b) => nodePositions.get(a)!.x - nodePositions.get(b)!.x)

    for (let i = 1; i < sorted.length; i++) {
      const prevPos = nodePositions.get(sorted[i - 1])!
      const currPos = nodePositions.get(sorted[i])!
      const isSpouse = (adj.get(sorted[i - 1])?.spouses ?? []).includes(sorted[i])
      const minGap = isSpouse ? SPOUSE_GAP : H_GAP
      const minX = prevPos.x + NODE_W + minGap

      if (currPos.x < minX) {
        currPos.x = minX
      }
    }
  }

  // Build nodes
  const nodes: TreeNode[] = []
  for (const [id, pos] of nodePositions) {
    const person = id === 'self' ? null : personsMap.get(id) ?? null
    nodes.push({
      id,
      person,
      name: id === 'self' ? selfName : (person?.name || '?'),
      relLabel: id === 'self' ? '' : (person?.relationship_type || ''),
      generation: generations.get(id) ?? 0,
      x: pos.x,
      y: pos.y,
    })
  }

  // Build spouse and ex-spouse edges (parent-child connections use family unit T-connectors)
  const edges: TreeEdge[] = []
  const spouseSet = new Set<string>()
  for (const [nodeId, neighbors] of adj) {
    if (!nodePositions.has(nodeId)) continue
    for (const spouseId of neighbors.spouses) {
      if (!nodePositions.has(spouseId)) continue
      const key1 = `${nodeId}:${spouseId}`, key2 = `${spouseId}:${nodeId}`
      if (!spouseSet.has(key1) && !spouseSet.has(key2)) {
        spouseSet.add(key1)
        edges.push({ type: 'spouse', fromId: nodeId, toId: spouseId })
      }
    }
    for (const exId of neighbors.exSpouses) {
      if (!nodePositions.has(exId)) continue
      const key1 = `ex:${nodeId}:${exId}`, key2 = `ex:${exId}:${nodeId}`
      if (!spouseSet.has(key1) && !spouseSet.has(key2)) {
        spouseSet.add(key1)
        edges.push({ type: 'ex_spouse', fromId: nodeId, toId: exId })
      }
    }
  }

  // Build family unit T-connectors
  // One FamilyUnitEdge per unique parent-couple → children group
  const familyUnits: FamilyUnitEdge[] = []
  const fuSet = new Set<string>()
  for (const [nodeId, neighbors] of adj) {
    if (!nodePositions.has(nodeId)) continue
    const g = generations.get(nodeId)!
    const children = neighbors.children.filter(c => nodePositions.has(c))
    if (children.length === 0) continue

    // Consider both current spouses and ex-spouses as potential co-parents
    const allPartners = [
      ...neighbors.spouses.filter(s => generations.get(s) === g && nodePositions.has(s)),
      ...neighbors.exSpouses.filter(s => generations.get(s) === g && nodePositions.has(s)),
    ]
    let partner: NodeId | null = null
    for (const s of allPartners) {
      if ((adj.get(s)?.children || []).some(c => children.includes(c))) { partner = s; break }
    }

    const fuKey = partner ? [nodeId, partner].sort().join('||') : nodeId
    if (fuSet.has(fuKey)) continue
    fuSet.add(fuKey)

    const allChildren = new Set(children)
    if (partner) {
      for (const c of adj.get(partner)?.children || []) {
        if (nodePositions.has(c)) allChildren.add(c)
      }
    }

    familyUnits.push({
      parentIds: partner ? [nodeId, partner] : [nodeId],
      childIds: [...allChildren],
    })
  }

  return { nodes, edges, familyUnits }
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

  // Ex-spouse (check before spouse to avoid misclassifying)
  const exSpouseKeywords = ['volt feleség', 'volt férj', 'volt partner', 'elvált', 'exfeleség', 'exférj', 'ex-feleség', 'ex-férj', 'ex ']
  if (exSpouseKeywords.some(k => t === k || t.includes(k))) {
    return { type: 'ex_spouse', direction: 'to_is_person' }
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
  const { nodes, edges, familyUnits } = useMemo(() => {
    if (familyRelationships.length === 0) {
      return { nodes: [], edges: [], familyUnits: [] }
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

  const [addRelError, setAddRelError] = useState<string | null>(null)

  // Add relationship handler
  const handleAddRelationship = async () => {
    if (!selectedNodeId || !newRelPersonId) return
    const fromId = selectedNodeId === 'self' ? null : selectedNodeId
    const toId = newRelPersonId === 'self' ? null : newRelPersonId
    setAddRelError(null)
    try {
      await addFamilyRelationship(fromId, toId, newRelType)
      setAddingRel(false)
      setNewRelPersonId('')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Ismeretlen hiba'
      setAddRelError(`Hiba: ${msg}`)
    }
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
                    <option value="ex_spouse">Volt partnerem</option>
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
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setAddingRel(false); setSelectedNodeId(null); setAddRelError(null) }}>
                    Mégse
                  </Button>
                </div>
                {addRelError && (
                  <p className="text-xs text-red-500 mt-1">{addRelError}</p>
                )}
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

        {/* Spouse and ex-spouse edges */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.fromId)
          const to = nodeMap.get(edge.toId)
          if (!from || !to) return null
          const y = from.y + NODE_H / 2
          const x1 = Math.min(from.x, to.x) + NODE_W
          const x2 = Math.max(from.x, to.x)
          if (x2 <= x1) return null // same box or overlapping, skip
          if (edge.type === 'ex_spouse') {
            return (
              <g key={`sp-${i}`}>
                <line x1={x1} y1={y} x2={x2} y2={y}
                  stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,4" />
                <text x={(x1 + x2) / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="#94a3b8">✂</text>
              </g>
            )
          }
          return (
            <g key={`sp-${i}`}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke="#e11d48" strokeWidth="2" />
              <text x={(x1 + x2) / 2} y={y - 3} textAnchor="middle" fontSize="8" fill="#e11d48">&#9829;</text>
            </g>
          )
        })}

        {/* Family unit T-connectors: one stem from couple center to all children */}
        {familyUnits.map((fu, i) => {
          const parentNodes = fu.parentIds.map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[]
          const childNodes = fu.childIds.map(id => nodeMap.get(id)).filter(Boolean) as TreeNode[]
          if (parentNodes.length === 0 || childNodes.length === 0) return null

          // Couple center x = midpoint between leftmost and rightmost parent (including node width)
          const parentXs = parentNodes.map(n => n.x)
          const coupleLeft = Math.min(...parentXs)
          const coupleRight = Math.max(...parentXs) + NODE_W
          const coupleCenterX = (coupleLeft + coupleRight) / 2

          // Stem start: bottom of single parent, or spouse-line midpoint for couple
          const hasSpouseEdge = parentNodes.length > 1
          const stemStartY = hasSpouseEdge
            ? parentNodes[0].y + NODE_H / 2
            : parentNodes[0].y + NODE_H

          const childCenters = childNodes.map(n => n.x + NODE_W / 2)
          const firstChildTop = Math.min(...childNodes.map(n => n.y))
          const midY = stemStartY + (firstChildTop - stemStartY) / 2

          // Horizontal bar spans from min(coupleCenterX, leftmost child) to max(coupleCenterX, rightmost child)
          // This guarantees the stem always connects to the bar even if parents are offset from children
          const barLeft = Math.min(coupleCenterX, Math.min(...childCenters))
          const barRight = Math.max(coupleCenterX, Math.max(...childCenters))
          const drawBar = barRight - barLeft > 0.5

          return (
            <g key={`fu-${i}`}>
              {/* Vertical stem from couple center down to midY */}
              <line x1={coupleCenterX} y1={stemStartY} x2={coupleCenterX} y2={midY}
                stroke="#94a3b8" strokeWidth="1.5" />
              {/* Horizontal bar connecting stem to child drop points (omitted when single child directly below) */}
              {drawBar && (
                <line x1={barLeft} y1={midY} x2={barRight} y2={midY}
                  stroke="#94a3b8" strokeWidth="1.5" />
              )}
              {/* Vertical drop from midY to each child top — one line per child, no duplicates */}
              {childNodes.map((child, ci) => {
                const cx = child.x + NODE_W / 2
                return (
                  <line key={`fu-${i}-c${ci}`}
                    x1={cx} y1={midY} x2={cx} y2={child.y}
                    stroke="#94a3b8" strokeWidth="1.5" />
                )
              })}
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
                  <option value="ex_spouse">Volt partnere</option>
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
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setAddingRel(false); setAddRelError(null) }}>
                  Mégse
                </Button>
              </div>
              {addRelError && (
                <p className="text-xs text-red-500 mt-1">{addRelError}</p>
              )}
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
