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
  params: ExtractParams | null
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
  ): Promise<RawProperty[]>
}
