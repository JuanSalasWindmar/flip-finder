import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { PolygonType, PropertyType, PropertyStatus } from "@prisma/client"

interface GeoJsonPolygon {
  type: "Polygon"
  coordinates: number[][][]
}

export class CreatePolygonDto {
  @ApiProperty({ example: "Palermo Zone A" })
  name!: string

  @ApiProperty({
    description: "GeoJSON Polygon geometry",
    example: {
      type: "Polygon",
      coordinates: [[[-58.43, -34.58], [-58.42, -34.58], [-58.42, -34.57], [-58.43, -34.57], [-58.43, -34.58]]],
    },
  })
  georeference!: GeoJsonPolygon

  @ApiProperty({ example: "Buenos Aires" })
  city!: string

  @ApiProperty({ enum: PolygonType, example: PolygonType.EXTRACT })
  polygon_type!: PolygonType

  @ApiPropertyOptional({ default: true })
  enabled?: boolean

  @ApiPropertyOptional({ enum: PropertyType })
  property_type?: PropertyType

  @ApiPropertyOptional({ enum: PropertyStatus })
  property_status?: PropertyStatus

  @ApiPropertyOptional({ example: 100000000 })
  min_price?: number

  @ApiPropertyOptional({ example: 500000000 })
  max_price?: number

  @ApiPropertyOptional({ example: 1 })
  min_bedrooms?: number

  @ApiPropertyOptional({ example: 4 })
  max_bedrooms?: number

  @ApiPropertyOptional({ example: 1 })
  min_bathrooms?: number

  @ApiPropertyOptional({ example: 3 })
  max_bathrooms?: number

  @ApiPropertyOptional({ example: 40 })
  min_area?: number

  @ApiPropertyOptional({ example: 200 })
  max_area?: number

  @ApiPropertyOptional({ description: "Filter by parking availability" })
  parking?: boolean

  @ApiPropertyOptional({ example: 3, description: "Estrato mínimo (1-6)" })
  min_stratum?: number

  @ApiPropertyOptional({ example: 5, description: "Estrato máximo (1-6)" })
  max_stratum?: number

  @ApiPropertyOptional({ example: 0 })
  min_age?: number

  @ApiPropertyOptional({ example: 20 })
  max_age?: number

  @ApiPropertyOptional({ example: 20, description: "Deviation threshold percentage for ANALYZE polygons (e.g. 20 = -20%)" })
  deviation_threshold?: number
}
