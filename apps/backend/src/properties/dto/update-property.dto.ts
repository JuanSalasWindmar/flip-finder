import { ApiPropertyOptional } from "@nestjs/swagger"

export class UpdatePropertyDto {
  @ApiPropertyOptional()
  link?: string

  @ApiPropertyOptional({ enum: ["ORIGINAL", "REMODELED"] })
  state?: "ORIGINAL" | "REMODELED"

  @ApiPropertyOptional()
  area?: number

  @ApiPropertyOptional()
  price?: number

  @ApiPropertyOptional()
  age?: string

  @ApiPropertyOptional()
  avg_age?: number | null

  @ApiPropertyOptional()
  admin_price?: number

  @ApiPropertyOptional()
  price_per_sqm?: number

  @ApiPropertyOptional()
  address?: string

  @ApiPropertyOptional()
  neighborhood?: string

  @ApiPropertyOptional()
  rooms?: number

  @ApiPropertyOptional()
  bathrooms?: number

  @ApiPropertyOptional()
  floor?: number

  @ApiPropertyOptional()
  elevator?: boolean

  @ApiPropertyOptional()
  stratum?: number

  @ApiPropertyOptional()
  parking?: boolean

  @ApiPropertyOptional()
  notes?: string | null

  @ApiPropertyOptional()
  latitude?: number | null

  @ApiPropertyOptional()
  longitude?: number | null

  @ApiPropertyOptional()
  reviewed?: boolean

  @ApiPropertyOptional()
  duplicated_of_id?: string | null
}
