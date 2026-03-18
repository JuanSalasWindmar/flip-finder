import { MapContainer, TileLayer, Polygon } from "react-leaflet"
import type { LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { GeoJsonPolygon } from "../types/polygon"

interface PolygonMapProps {
  georeference: GeoJsonPolygon
}

export default function PolygonMap({ georeference }: PolygonMapProps) {
  const positions: LatLngExpression[] = georeference.coordinates[0].map(([lng, lat]) => [lat, lng])

  const bounds = positions.map(
    (p) => (Array.isArray(p) ? p : [0, 0]) as [number, number],
  )

  return (
    <MapContainer bounds={bounds} className="polygon-map" scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polygon positions={positions} pathOptions={{ color: "#3b82f6", fillOpacity: 0.2 }} />
    </MapContainer>
  )
}
