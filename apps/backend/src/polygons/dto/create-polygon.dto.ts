import { PolygonType } from "@prisma/client"

interface GeoJsonPolygon {
  type: "Polygon"
  coordinates: number[][][]
}

export class CreatePolygonDto {
  name!: string
  georeference!: GeoJsonPolygon
  city!: string
  polygon_type!: PolygonType
  enabled?: boolean
  params?: Record<string, unknown>
}
