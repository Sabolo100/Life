import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useLifeStoryStore } from '@/stores/life-story-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Search, Loader2 } from 'lucide-react'
import type { Location } from '@/types'

// Fix Leaflet default marker icon issue with bundlers (Vite/Webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Color-coded marker icons by location type
const MARKER_COLORS: Record<string, string> = {
  city: '#3b82f6',        // blue
  town: '#6366f1',        // indigo
  village: '#8b5cf6',     // violet
  school: '#a855f7',      // purple
  workplace: '#22c55e',   // green
  home: '#f59e0b',        // amber
  hospital: '#ef4444',    // red
  church: '#ec4899',      // pink
  country: '#14b8a6',     // teal
}

function createColoredIcon(type: string) {
  const color = MARKER_COLORS[type?.toLowerCase()] || '#3b82f6'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`
  return L.divIcon({
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: '',
  })
}

// Hungary center
const HUNGARY_CENTER: L.LatLngExpression = [47.1625, 19.5033]
const DEFAULT_ZOOM = 7

interface MapViewProps {
  onBack: () => void
}

/** Auto-fit map bounds to markers */
function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap()

  useEffect(() => {
    const coords = locations
      .filter(l => l.coordinates)
      .map(l => [l.coordinates!.lat, l.coordinates!.lng] as L.LatLngTuple)

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords)
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 })
    }
  }, [locations, map])

  return null
}

/** Location list item with geocoding button */
function LocationListItem({ location }: { location: Location }) {
  const { geocodeLocation } = useLifeStoryStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGeocode = async () => {
    setLoading(true)
    setError(null)
    try {
      await geocodeLocation(location.id)
    } catch {
      setError('Nem talalhato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-sm truncate">{location.name}</span>
          {location.type && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {location.type}
            </Badge>
          )}
        </div>
        {location.related_period && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6">{location.related_period}</p>
        )}
        {location.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 ml-6 line-clamp-1">{location.notes}</p>
        )}
        {error && <p className="text-xs text-destructive mt-0.5 ml-6">{error}</p>}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="ml-2 shrink-0"
        onClick={handleGeocode}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Search className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">Helyszin keresese</span>
          </>
        )}
      </Button>
    </div>
  )
}

export function MapView({ onBack }: MapViewProps) {
  const { locations } = useLifeStoryStore()

  const locationsWithCoords = useMemo(
    () => locations.filter(l => l.coordinates),
    [locations]
  )

  const locationsWithoutCoords = useMemo(
    () => locations.filter(l => !l.coordinates),
    [locations]
  )

  const hasAnyCoords = locationsWithCoords.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="font-semibold">Terkep</h2>
        <Badge variant="secondary" className="text-xs">
          {locations.length} helyszin
        </Badge>
      </div>

      {locations.length === 0 ? (
        /* Empty state */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-20 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">A terkeped meg ures</p>
            <p className="text-sm">
              Kezdj el beszelgetni az AI-val, es a helyszinek automatikusan megjelennek itt!
            </p>
          </div>
        </div>
      ) : hasAnyCoords ? (
        /* Map + optional list of ungeocoded locations */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <MapContainer
              center={HUNGARY_CENTER}
              zoom={DEFAULT_ZOOM}
              className="h-full w-full z-0"
              style={{ minHeight: '300px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds locations={locationsWithCoords} />
              {locationsWithCoords.map(location => (
                <Marker
                  key={location.id}
                  position={[location.coordinates!.lat, location.coordinates!.lng]}
                  icon={createColoredIcon(location.type)}
                >
                  <Popup>
                    <div className="min-w-[160px]">
                      <p className="font-semibold text-sm">{location.name}</p>
                      {location.type && (
                        <p className="text-xs text-gray-500 mt-0.5">{location.type}</p>
                      )}
                      {location.related_period && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Idoszak:</span> {location.related_period}
                        </p>
                      )}
                      {location.notes && (
                        <p className="text-xs text-gray-600 mt-1">{location.notes}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Ungeocoded locations list below map */}
          {locationsWithoutCoords.length > 0 && (
            <div className="border-t px-4 py-3 max-h-[40%] overflow-y-auto shrink-0">
              <p className="text-xs text-muted-foreground font-medium mb-2">
                Koordinatak nelkuli helyszinek ({locationsWithoutCoords.length})
              </p>
              <div className="space-y-2">
                {locationsWithoutCoords.map(location => (
                  <LocationListItem key={location.id} location={location} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* All locations lack coordinates - show list only */
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Egyik helyszinnek sincs meg koordinataja. Keresd meg oket a gombbal!
          </p>
          <div className="space-y-2">
            {locationsWithoutCoords.map(location => (
              <LocationListItem key={location.id} location={location} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
