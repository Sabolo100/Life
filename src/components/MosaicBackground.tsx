import { useMemo } from 'react'

// ── Voronoi-style mosaic background ───────────────────────────────────────────
// Generates irregular 4–6 sided polygons that tile like cracked mosaic tiles.
// Uses a jittered grid → Voronoi approach for organic, non-overlapping cells.

interface MosaicBackgroundProps {
  className?: string
  /** Number of seed columns */
  cols?: number
  /** Number of seed rows */
  rows?: number
  /** Color palette — warm, muted tones */
  palette?: string[]
  /** Overall opacity */
  opacity?: number
}

// ── Palette defaults ──────────────────────────────────────────────────────────
const DEFAULT_PALETTE = [
  '#e8d8c0', // warm sand
  '#d4c4a8', // golden beige
  '#c9b896', // deeper sand
  '#ddd0b8', // light taupe
  '#c8bca4', // muted amber
  '#d6c8ac', // soft wheat
  '#bfb49a', // dusty gold
  '#c4b8a0', // warm stone
  '#d0c0a4', // antique
  '#c8c0b0', // grey-beige
  '#b8c0c4', // cool blue-grey
  '#a8b4bc', // slate blue
  '#c0c8cc', // soft grey-blue
  '#b0b8c0', // steel
  '#c0b4a0', // warm grey
]

// Deterministic pseudo-random from seed
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

interface Point {
  x: number
  y: number
}

// Compute Voronoi cells using brute-force nearest-seed for each pixel on a coarse grid,
// then extract polygon outlines. For a landing page background this is efficient enough.
function generateMosaicPolygons(
  width: number,
  height: number,
  cols: number,
  rows: number,
  palette: string[],
  seed = 42,
) {
  const rng = seededRandom(seed)
  const cellW = width / cols
  const cellH = height / rows

  // Generate jittered seed points
  const seeds: Point[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      seeds.push({
        x: (c + 0.15 + rng() * 0.7) * cellW,
        y: (r + 0.15 + rng() * 0.7) * cellH,
      })
    }
  }

  // Sample grid resolution — finer = smoother polygon edges
  const step = Math.max(3, Math.min(6, Math.round(Math.min(cellW, cellH) / 8)))
  const sampleCols = Math.ceil(width / step)
  const sampleRows = Math.ceil(height / step)

  // Assign each sample to its nearest seed
  const grid = new Int16Array(sampleCols * sampleRows)
  for (let sy = 0; sy < sampleRows; sy++) {
    const py = sy * step
    for (let sx = 0; sx < sampleCols; sx++) {
      const px = sx * step
      let minDist = Infinity
      let nearest = 0
      for (let i = 0; i < seeds.length; i++) {
        const dx = px - seeds[i].x
        const dy = py - seeds[i].y
        const d = dx * dx + dy * dy
        if (d < minDist) {
          minDist = d
          nearest = i
        }
      }
      grid[sy * sampleCols + sx] = nearest
    }
  }

  // Extract boundary edges using marching approach
  // For each cell, collect border segments and build polygon outline
  const cellBoundaryPoints: Map<number, Point[]> = new Map()

  for (let sy = 0; sy < sampleRows; sy++) {
    for (let sx = 0; sx < sampleCols; sx++) {
      const idx = grid[sy * sampleCols + sx]
      // Check if this sample is on a boundary (adjacent to a different cell)
      let isBorder = false
      if (sx === 0 || sy === 0 || sx === sampleCols - 1 || sy === sampleRows - 1) {
        isBorder = true
      } else {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = grid[(sy + dy) * sampleCols + (sx + dx)]
          if (ni !== idx) {
            isBorder = true
            break
          }
        }
      }
      if (isBorder) {
        if (!cellBoundaryPoints.has(idx)) cellBoundaryPoints.set(idx, [])
        cellBoundaryPoints.get(idx)!.push({ x: sx * step, y: sy * step })
      }
    }
  }

  // Convert boundary points to convex hull polygon for each cell
  const polygons: { points: string; fill: string; seedIdx: number }[] = []

  cellBoundaryPoints.forEach((points, seedIdx) => {
    if (points.length < 3) return
    const hull = convexHull(points)
    if (hull.length < 3) return

    const fill = palette[seedIdx % palette.length]
    const pointsStr = hull.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    polygons.push({ points: pointsStr, fill, seedIdx })
  })

  return polygons
}

// Simple convex hull (Graham scan)
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points

  // Find bottom-left point
  let start = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < points[start].y || (points[i].y === points[start].y && points[i].x < points[start].x)) {
      start = i
    }
  }
  const pivot = points[start]

  const sorted = points
    .filter((_, i) => i !== start)
    .map(p => ({ ...p, angle: Math.atan2(p.y - pivot.y, p.x - pivot.x) }))
    .sort((a, b) => a.angle - b.angle || (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2 - ((b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2))

  const hull: Point[] = [pivot]
  for (const p of sorted) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2]
      const b = hull[hull.length - 1]
      const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
      if (cross <= 0) hull.pop()
      else break
    }
    hull.push(p)
  }
  return hull
}

export function MosaicBackground({
  className = '',
  cols = 18,
  rows = 24,
  palette = DEFAULT_PALETTE,
  opacity = 1,
}: MosaicBackgroundProps) {
  const polygons = useMemo(
    () => generateMosaicPolygons(1440, 3200, cols, rows, palette),
    [cols, rows, palette],
  )

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={{ opacity }}>
      <svg
        viewBox="0 0 1440 3200"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-0 w-full h-full"
      >
        {polygons.map((poly, i) => (
          <polygon
            key={i}
            points={poly.points}
            fill={poly.fill}
            stroke="#c4b89c"
            strokeWidth="1"
            strokeOpacity="0.6"
          />
        ))}
      </svg>
    </div>
  )
}
