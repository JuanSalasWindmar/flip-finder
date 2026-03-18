export interface GeoJsonPolygon {
  type: "Polygon"
  coordinates: number[][][]
}

export interface ExtractPolygon {
  id: string
  name: string
  georeference: GeoJsonPolygon
  city: string
  enabled: boolean
  property_type: string | null
  property_status: string | null
  min_price: number | null
  max_price: number | null
  min_bedrooms: number | null
  max_bedrooms: number | null
  min_bathrooms: number | null
  max_bathrooms: number | null
  min_area: number | null
  max_area: number | null
  min_parking: number | null
  max_parking: number | null
  min_stratum: number | null
  max_stratum: number | null
  min_age: number | null
  max_age: number | null
}

export interface ExtractParams {
  propertyType: "apartment" | "house"
  businessType: "sale" | "rent"
  status: "used" | "new" | "any"
  priceRange?: [number, number]
  areaRange?: [number, number]
  rooms?: number[]
  bathrooms?: number[]
  parking?: number[]
  stratum?: number[]
}

export interface RawProperty {
  id: string
  link: string
  state: "ORIGINAL" | "REMODELED"
  area: number
  price: number
  age: string
  admin_price: number
  price_per_sqm: number
  address: string
  neighborhood: string
  rooms: number
  bathrooms: number
  floor: number
  elevator: boolean
  stratum: number
  parking: boolean
  notes: string | null
  latitude: number | null
  longitude: number | null
}

export type PlatformId = "metroCuadrado" | "fincaRaiz"

export interface PlatformClient {
  name: PlatformId
  fetchProperties(
    polygon: ExtractPolygon,
    params: ExtractParams,
    since: Date | null,
  ): Promise<RawProperty[]>
}
