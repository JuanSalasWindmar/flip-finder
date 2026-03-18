import { ApiPropertyOptional } from "@nestjs/swagger"
import { PolygonType, PropertyType, PropertyStatus } from "@prisma/client"

interface GeoJsonPolygon {
  type: "Polygon"
  coordinates: number[][][]
}

export class UpdatePolygonDto {
  @ApiPropertyOptional({ example: "Palermo Zone B" })
  name?: string

  @ApiPropertyOptional({ description: "GeoJSON Polygon geometry" })
  georeference?: GeoJsonPolygon

  @ApiPropertyOptional({ example: "Buenos Aires" })
  city?: string

  @ApiPropertyOptional({ enum: PolygonType })
  polygon_type?: PolygonType

  @ApiPropertyOptional()
  enabled?: boolean

  @ApiPropertyOptional({ enum: PropertyType })
  property_type?: PropertyType | null

  @ApiPropertyOptional({ enum: PropertyStatus })
  property_status?: PropertyStatus | null

  @ApiPropertyOptional()
  min_price?: number | null

  @ApiPropertyOptional()
  max_price?: number | null

  @ApiPropertyOptional()
  min_bedrooms?: number | null

  @ApiPropertyOptional()
  max_bedrooms?: number | null

  @ApiPropertyOptional()
  min_bathrooms?: number | null

  @ApiPropertyOptional()
  max_bathrooms?: number | null

  @ApiPropertyOptional()
  min_area?: number | null

  @ApiPropertyOptional()
  max_area?: number | null

  @ApiPropertyOptional()
  min_parking?: number | null

  @ApiPropertyOptional()
  max_parking?: number | null

  @ApiPropertyOptional({ description: "Estrato mínimo (1-6)" })
  min_stratum?: number | null

  @ApiPropertyOptional({ description: "Estrato máximo (1-6)" })
  max_stratum?: number | null

  @ApiPropertyOptional()
  min_age?: number | null

  @ApiPropertyOptional()
  max_age?: number | null
}
