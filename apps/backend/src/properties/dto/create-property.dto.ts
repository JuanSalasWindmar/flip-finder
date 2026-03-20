import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class CreatePropertyDto {
  @ApiProperty({ example: "abc123" })
  id!: string

  @ApiProperty({ example: "https://metrocuadrado.com/inmueble/abc123" })
  link!: string

  @ApiProperty({ enum: ["ORIGINAL", "REMODELED"], example: "ORIGINAL" })
  state!: "ORIGINAL" | "REMODELED"

  @ApiProperty({ example: 85.5 })
  area!: number

  @ApiProperty({ example: 350000000 })
  price!: number

  @ApiProperty({ example: "1 a 8 años" })
  age!: string

  @ApiPropertyOptional({ example: 5 })
  avg_age?: number | null

  @ApiProperty({ example: 250000 })
  admin_price!: number

  @ApiProperty({ example: 4117647 })
  price_per_sqm!: number

  @ApiProperty({ example: "Calle 100 #15-20" })
  address!: string

  @ApiProperty({ example: "Chicó Norte" })
  neighborhood!: string

  @ApiProperty({ example: 3 })
  rooms!: number

  @ApiProperty({ example: 2 })
  bathrooms!: number

  @ApiProperty({ example: 5 })
  floor!: number

  @ApiPropertyOptional({ default: false })
  elevator?: boolean

  @ApiProperty({ example: 4 })
  stratum!: number

  @ApiPropertyOptional({ default: false })
  parking?: boolean

  @ApiPropertyOptional({ example: "Esquinero, vista a parque" })
  notes?: string | null

  @ApiPropertyOptional({ example: 4.6698 })
  latitude?: number | null

  @ApiPropertyOptional({ example: -74.0563 })
  longitude?: number | null

  @ApiPropertyOptional({ default: false })
  reviewed?: boolean

  @ApiProperty({ example: "2026-03-19T00:00:00.000Z" })
  extracted_at!: string
}
