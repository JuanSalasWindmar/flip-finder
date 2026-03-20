import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class BulkUpdateItemDto {
  @ApiProperty({ example: "c97c7fb0-f578-4d36-9e7b-208ec8d3f2f7" })
  id!: string

  @ApiPropertyOptional()
  reviewed?: boolean

  @ApiPropertyOptional()
  duplicated_of_id?: string | null

  @ApiPropertyOptional()
  notes?: string | null
}

export class BulkUpdatePropertyDto {
  @ApiProperty({ type: [BulkUpdateItemDto] })
  properties!: BulkUpdateItemDto[]
}
