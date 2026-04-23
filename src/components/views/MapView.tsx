import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, Loader2, Check, X, Navigation, ChevronDown, ChevronUp, Edit2, Trash2, List, Map } from 'lucide-react'
import type { Location } from '@/types'

// Fix Leaflet default icon issue with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

// ── Icons ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  city: '#3b82f6', town: '#6366f1', village: '#8b5cf6',
  school: '#a855f7', workplace: '#22c55e', home: '#f59e0b',
  hospital: '#ef4444', church: '#ec4899', country: '#14b8a6',
}

function pinSvg(fill: string, inner: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${fill}" stroke="white" stroke-width="1.5"/>
    ${inner}
  </svg>`
}

function confirmedIcon(type: string) {
  const color = TYPE_COLORS[type?.toLowerCase()] || '#3b82f6'
  return L.divIcon({
    html: pinSvg(color, `<circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>`),
    iconSize: [24, 36], iconAnchor: [12, 36], popupAnchor: [0, -36], className: '',
  })
}

function pendingIcon() {
  return L.divIcon({
    html: pinSvg('#f97316', `<circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      <text x="12" y="16" text-anchor="middle" font-size="9" fill="#f97316" font-weight="bold">?</text>`),
    iconSize: [24, 36], iconAnchor: [12, 36], popupAnchor: [0, -36], className: 'pending-marker',
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

const HUNGARY_CENTER: L.LatLngExpression = [47.1625, 19.5033]

function isConfirmed(loc: Location) {
  return loc.coordinates_confirmed === true
}

function parseGPS(input: string): { lat: number; lng: number } | null {
  // Google Maps URL: contains @lat,lng,zoom
  const googleMatch = input.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/)
  if (googleMatch) return { lat: parseFloat(googleMatch[1]), lng: parseFloat(googleMatch[2]) }
  // "lat, lng" or "lat lng" or "lat,lng"
  const plainMatch = input.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
  if (plainMatch) return { lat: parseFloat(plainMatch[1]), lng: parseFloat(plainMatch[2]) }
  return null
}

// ── FlyTo helper (must be inside MapContainer) ─────────────────────────────

function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13))
  }, [target, map])
  return null
}

function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap()
  useEffect(() => {
    const coords = locations
      .filter(l => l.coordinates)
      .map(l => [l.coordinates!.lat, l.coordinates!.lng] as L.LatLngTuple)
    if (coords.length > 0) {
      map.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 13 })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount
  return null
}

// ── Location type labels ───────────────────────────────────────────────────

const LOCATION_TYPE_LABELS: Record<string, string> = {
  residence: 'Lakóhely', home: 'Otthon', school: 'Iskola',
  workplace: 'Munkahely', hospital: 'Kórház', church: 'Templom',
  city: 'Város', town: 'Város', village: 'Falu',
  country: 'Ország', region: 'Régió', park: 'Park',
  office: 'Iroda', university: 'Egyetem', other: 'Egyéb',
  birth_place: 'Születési hely', vacation: 'Nyaralóhely',
}

// ── Main component ─────────────────────────────────────────────────────────

interface MapViewProps { onBack: () => void }

export function MapView({ onBack: _onBack }: MapViewProps) {
  const { locations, geocodeLocation, confirmLocation, updateLocationCoordinates, deleteLocation } = useLifeStoryStore()

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  // Selected location panel
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [gpsInput, setGpsInput] = useState('')
  const [gpsError, setGpsError] = useState('')
  const [showGpsInput, setShowGpsInput] = useState(false)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)

  // Bottom panel (no-coords locations)
  const [bottomOpen, setBottomOpen] = useState(true)
  const [geocodingId, setGeocodingId] = useState<string | null>(null)
  const [geocodeError, setGeocodeError] = useState<Record<string, string>>({})
  // Inline GPS for bottom panel
  const [bottomGpsId, setBottomGpsId] = useState<string | null>(null)
  const [bottomGpsValue, setBottomGpsValue] = useState('')
  const [bottomGpsError, setBottomGpsError] = useState('')

  const locationsWithCoords = useMemo(() => locations.filter(l => l.coordinates), [locations])
  const locationsWithoutCoords = useMemo(() => locations.filter(l => !l.coordinates), [locations])
  const confirmedCount = useMemo(() => locationsWithCoords.filter(isConfirmed).length, [locationsWithCoords])
  const pendingCount = useMemo(() => locationsWithCoords.filter(l => !isConfirmed(l)).length, [locationsWithCoords])

  const selectedLocation = selectedId ? locations.find(l => l.id === selectedId) ?? null : null

  const handleMarkerClick = (loc: Location) => {
    setSelectedId(loc.id)
    setGpsInput('')
    setGpsError('')
    setShowGpsInput(false)
    setFlyTarget(loc.coordinates!)
  }

  const handleDragEnd = async (locId: string, e: L.DragEndEvent) => {
    const { lat, lng } = (e.target as L.Marker).getLatLng()
    await updateLocationCoordinates(locId, { lat, lng })
    if (locId === selectedId) {
      setFlyTarget({ lat, lng })
    }
  }

  const handleConfirm = async () => {
    if (!selectedLocation?.coordinates) return
    await confirmLocation(selectedLocation.id)
    setSelectedId(null) // Close popup after confirm
  }

  const handleEditConfirmed = async () => {
    if (!selectedLocation) return
    await updateLocationCoordinates(selectedLocation.id, selectedLocation.coordinates!)
  }

  const handleDelete = async (locId: string) => {
    const loc = locations.find(l => l.id === locId)
    if (!loc) return
    if (!confirm(`Biztosan törölni szeretnéd "${loc.name}" helyszínt?`)) return
    if (selectedId === locId) setSelectedId(null)
    try {
      await deleteLocation(locId)
    } catch (err) {
      console.error('Delete location error:', err)
    }
  }

  const handleGpsApply = async () => {
    setGpsError('')
    const coords = parseGPS(gpsInput)
    if (!coords) { setGpsError('Érvénytelen formátum. Pl: 47.1234, 19.5678'); return }
    if (!selectedLocation) return
    await updateLocationCoordinates(selectedLocation.id, coords)
    setFlyTarget(coords)
    setShowGpsInput(false)
    setGpsInput('')
  }

  const handleGeocode = async (loc: Location) => {
    setGeocodingId(loc.id)
    setGeocodeError(prev => ({ ...prev, [loc.id]: '' }))
    try {
      await geocodeLocation(loc.id)
      const updated = useLifeStoryStore.getState().locations.find(l => l.id === loc.id)
      if (updated?.coordinates) setFlyTarget(updated.coordinates)
    } catch {
      setGeocodeError(prev => ({ ...prev, [loc.id]: 'Nem található' }))
    } finally {
      setGeocodingId(null)
    }
  }

  const handleBottomGpsApply = async (loc: Location) => {
    setBottomGpsError('')
    const coords = parseGPS(bottomGpsValue)
    if (!coords) { setBottomGpsError('Érvénytelen formátum. Pl: 47.1234, 19.5678'); return }
    await updateLocationCoordinates(loc.id, coords)
    setFlyTarget(coords)
    setBottomGpsId(null)
    setBottomGpsValue('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-3 py-2.5 flex items-center gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {confirmedCount > 0 && (
            <Badge variant="secondary" className="text-xs gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              {confirmedCount} elfogadott
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1 border-orange-400 text-orange-600">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              {pendingCount} vár
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 ml-auto"
          onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
        >
          {viewMode === 'map' ? <><List className="w-3.5 h-3.5" /> Lista</> : <><Map className="w-3.5 h-3.5" /> Térkép</>}
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-20 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">A térképed még üres</p>
            <p className="text-sm">Mesélj az AI-nak és a helyszínek automatikusan megjelennek!</p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-2">
            {locations.length === 0 ? (
              <p className="text-center py-20 text-muted-foreground text-sm">Még nincsenek helyszínek.</p>
            ) : locations.map(loc => (
              <div key={loc.id} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{loc.name}</p>
                  <div className="flex gap-2 mt-1">
                    {loc.type && <Badge variant="secondary" className="text-xs">{LOCATION_TYPE_LABELS[loc.type] || loc.type}</Badge>}
                    {loc.related_period && <span className="text-xs text-muted-foreground">{loc.related_period}</span>}
                    {loc.coordinates_confirmed && <Badge variant="outline" className="text-xs text-green-600">✓ Koordináta</Badge>}
                  </div>
                  {loc.notes && <p className="text-xs text-muted-foreground mt-1">{loc.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Map area */}
          <div className="flex-1 relative overflow-hidden">
            {locationsWithCoords.length > 0 ? (
              <MapContainer
                center={HUNGARY_CENTER}
                zoom={7}
                className="absolute inset-0 z-0"
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://tile.openstreetmap.de/{z}/{x}/{y}.png"
                />
                <FitBounds locations={locationsWithCoords} />
                <FlyTo target={flyTarget} />

                {locationsWithCoords.map(loc => (
                  <Marker
                    key={loc.id}
                    position={[loc.coordinates!.lat, loc.coordinates!.lng]}
                    icon={isConfirmed(loc) ? confirmedIcon(loc.type) : pendingIcon()}
                    draggable={!isConfirmed(loc)}
                    eventHandlers={{
                      click: () => handleMarkerClick(loc),
                      dragend: (e) => handleDragEnd(loc.id, e as unknown as L.DragEndEvent),
                    }}
                  />
                ))}
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                <p className="text-sm text-muted-foreground">Még nincs koordinátával rendelkező helyszín.</p>
              </div>
            )}

            {/* Floating location panel — full-width on mobile, top-right on desktop */}
            {selectedLocation && (
              <div className="absolute inset-x-2 top-2 sm:inset-auto sm:top-3 sm:right-3 sm:w-72 bg-background border rounded-xl shadow-xl z-[1000] p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: isConfirmed(selectedLocation) ? (TYPE_COLORS[selectedLocation.type] || '#3b82f6') : '#f97316' }}
                      />
                      <span className="font-semibold text-sm truncate">{selectedLocation.name}</span>
                      {selectedLocation.type && (
                        <Badge variant="secondary" className="text-[10px]">{selectedLocation.type}</Badge>
                      )}
                    </div>
                    {selectedLocation.related_period && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-5">{selectedLocation.related_period}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(selectedLocation.id)}
                      className="p-1 hover:text-destructive"
                      title="Helyszín törlése"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="p-1 hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedLocation.coordinates && (
                  <p className="text-xs text-muted-foreground font-mono mb-3 ml-5">
                    {selectedLocation.coordinates.lat.toFixed(5)}, {selectedLocation.coordinates.lng.toFixed(5)}
                  </p>
                )}

                {isConfirmed(selectedLocation) ? (
                  /* Confirmed state */
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <Check className="w-3.5 h-3.5" /> Elfogadott helyszín
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleEditConfirmed}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Pozíció javítása
                    </Button>
                  </div>
                ) : (
                  /* Pending state */
                  <div className="space-y-2">
                    <p className="text-xs text-orange-600 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5" />
                      Jóváhagyásra vár — húzd át a pontos helyre!
                    </p>

                    <Button
                      size="sm"
                      className="w-full text-xs bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleConfirm}
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" /> Elfogadás — helyes a pozíció
                    </Button>

                    <button
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 w-full text-left"
                      onClick={() => setShowGpsInput(v => !v)}
                    >
                      GPS koordináta kézi megadása
                    </button>

                    {showGpsInput && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={gpsInput}
                          onChange={e => { setGpsInput(e.target.value); setGpsError('') }}
                          placeholder="47.1234, 19.5678 vagy Google Maps link"
                          className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary font-mono"
                          onKeyDown={e => e.key === 'Enter' && handleGpsApply()}
                        />
                        {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
                        <Button size="sm" className="w-full text-xs" onClick={handleGpsApply}>
                          GPS alkalmazása
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {selectedLocation.notes && (
                  <p className="text-xs text-muted-foreground mt-2 border-t pt-2 line-clamp-2">
                    {selectedLocation.notes}
                  </p>
                )}
              </div>
            )}

            {/* Legend — hidden on mobile when panel open to avoid overlap */}
            <div className={`absolute bottom-3 left-3 bg-background/90 border rounded-lg px-2.5 py-2 z-[999] text-xs space-y-1 ${selectedLocation ? 'hidden sm:block' : ''}`}>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" /> Elfogadott
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" /> Jóváhagyásra vár
              </div>
            </div>
          </div>

          {/* Bottom: locations without coordinates */}
          {locationsWithoutCoords.length > 0 && (
            <div className="border-t bg-background shrink-0" style={{ maxHeight: '40%' }}>
              <button
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 text-sm font-medium"
                onClick={() => setBottomOpen(v => !v)}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  GPS nélküli helyszínek ({locationsWithoutCoords.length})
                </span>
                {bottomOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>

              {bottomOpen && (
                <div className="overflow-y-auto px-3 pb-3 space-y-2" style={{ maxHeight: 'calc(40vh - 44px)' }}>
                  {locationsWithoutCoords.map(loc => (
                    <div key={loc.id} className="border rounded-lg p-2.5 bg-card">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{loc.name}</span>
                          {loc.type && <Badge variant="secondary" className="text-[10px] shrink-0">{loc.type}</Badge>}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2"
                            disabled={geocodingId === loc.id}
                            onClick={() => handleGeocode(loc)}
                          >
                            {geocodingId === loc.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <><Search className="w-3 h-3 mr-1" />Keresés</>
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => {
                              setBottomGpsId(prev => prev === loc.id ? null : loc.id)
                              setBottomGpsValue('')
                              setBottomGpsError('')
                            }}
                          >
                            GPS
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2 hover:text-destructive"
                            onClick={() => handleDelete(loc.id)}
                            title="Törlés"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {geocodeError[loc.id] && (
                        <p className="text-xs text-destructive mt-1 ml-5">{geocodeError[loc.id]}</p>
                      )}
                      {bottomGpsId === loc.id && (
                        <div className="mt-2 space-y-1.5">
                          <input
                            type="text"
                            value={bottomGpsValue}
                            onChange={e => { setBottomGpsValue(e.target.value); setBottomGpsError('') }}
                            placeholder="47.1234, 19.5678 vagy Google Maps link"
                            className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary font-mono"
                            onKeyDown={e => e.key === 'Enter' && handleBottomGpsApply(loc)}
                            autoFocus
                          />
                          {bottomGpsError && <p className="text-xs text-destructive">{bottomGpsError}</p>}
                          <div className="flex gap-1.5">
                            <Button size="sm" className="flex-1 text-xs h-7" onClick={() => handleBottomGpsApply(loc)}>
                              Alkalmaz
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setBottomGpsId(null)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
