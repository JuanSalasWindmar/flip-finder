export interface GeoJsonPolygon {
  type: "Polygon"
  coordinates: number[][][]
}

export type PolygonType = "EXTRACT" | "ANALYZE"

export interface Polygon {
  id: string
  name: string
  georeference: GeoJsonPolygon
  city: string
  polygon_type: PolygonType
  enabled: boolean
  params: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CreatePolygonPayload {
  name: string
  georeference: GeoJsonPolygon
  city: string
  polygon_type: PolygonType
  enabled?: boolean
  params?: Record<string, unknown>
}

export interface UpdatePolygonPayload {
  name?: string
  georeference?: GeoJsonPolygon
  city?: string
  polygon_type?: PolygonType
  enabled?: boolean
  params?: Record<string, unknown> | null
}
