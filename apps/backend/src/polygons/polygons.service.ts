import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { CreatePolygonDto } from "./dto/create-polygon.dto"
import { UpdatePolygonDto } from "./dto/update-polygon.dto"

const FILTER_COLUMNS = [
  "property_type",
  "property_status",
  "min_price",
  "max_price",
  "min_bedrooms",
  "max_bedrooms",
  "min_bathrooms",
  "max_bathrooms",
  "min_area",
  "max_area",
  "parking",
  "min_stratum",
  "max_stratum",
  "min_age",
  "max_age",
  "deviation_threshold",
] as const

const ENUM_COLUMNS: Record<string, string> = {
  property_type: '"PropertyType"',
  property_status: '"PropertyStatus"',
}

const SELECT_COLUMNS = `
  id, name,
  ST_AsGeoJSON(georeference)::text AS georeference,
  city, polygon_type, enabled,
  property_type, property_status,
  min_price, max_price,
  min_bedrooms, max_bedrooms,
  min_bathrooms, max_bathrooms,
  min_area, max_area,
  parking,
  min_stratum, max_stratum, min_age, max_age,
  deviation_threshold, created_at, updated_at
`

interface PolygonRow {
  id: string
  name: string
  georeference: string
  city: string
  polygon_type: string
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
  parking: boolean | null
  min_stratum: number | null
  max_stratum: number | null
  min_age: number | null
  max_age: number | null
  deviation_threshold: number | null
  created_at: Date
  updated_at: Date
}

@Injectable()
export class PolygonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePolygonDto) {
    const geojson = JSON.stringify(dto.georeference)

    const columns = ["id", "name", "georeference", "city", "polygon_type", "enabled", "created_at", "updated_at"]
    const placeholders = [
      "gen_random_uuid()",
      "$1",
      "ST_GeomFromGeoJSON($2)",
      "$3",
      `$4::"PolygonType"`,
      "$5",
      "NOW()",
      "NOW()",
    ]
    const values: unknown[] = [dto.name, geojson, dto.city, dto.polygon_type, dto.enabled ?? true]

    for (const col of FILTER_COLUMNS) {
      if (dto[col] !== undefined) {
        values.push(dto[col])
        const idx = `$${values.length}`
        columns.push(col)
        placeholders.push(ENUM_COLUMNS[col] ? `${idx}::${ENUM_COLUMNS[col]}` : idx)
      }
    }

    const query = `
      INSERT INTO polygons (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING ${SELECT_COLUMNS}
    `

    const rows = await this.prisma.$queryRawUnsafe<PolygonRow[]>(query, ...values)
    return this.formatRow(rows[0])
  }

  async findAll() {
    const rows = await this.prisma.$queryRawUnsafe<PolygonRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM polygons ORDER BY created_at DESC`,
    )

    return rows.map((row) => this.formatRow(row))
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<PolygonRow[]>(
      `SELECT ${SELECT_COLUMNS} FROM polygons WHERE id = $1`,
      id,
    )

    if (rows.length === 0) {
      throw new NotFoundException(`Polygon ${id} not found`)
    }

    return this.formatRow(rows[0])
  }

  async update(id: string, dto: UpdatePolygonDto) {
    await this.findOne(id)

    const setClauses: string[] = []
    const values: unknown[] = []

    if (dto.name !== undefined) {
      values.push(dto.name)
      setClauses.push(`name = $${values.length}`)
    }

    if (dto.georeference !== undefined) {
      values.push(JSON.stringify(dto.georeference))
      setClauses.push(`georeference = ST_GeomFromGeoJSON($${values.length})`)
    }

    if (dto.city !== undefined) {
      values.push(dto.city)
      setClauses.push(`city = $${values.length}`)
    }

    if (dto.polygon_type !== undefined) {
      values.push(dto.polygon_type)
      setClauses.push(`polygon_type = $${values.length}::"PolygonType"`)
    }

    if (dto.enabled !== undefined) {
      values.push(dto.enabled)
      setClauses.push(`enabled = $${values.length}`)
    }

    for (const col of FILTER_COLUMNS) {
      if (dto[col] !== undefined) {
        values.push(dto[col])
        const idx = `$${values.length}`
        setClauses.push(ENUM_COLUMNS[col] ? `${col} = ${idx}::${ENUM_COLUMNS[col]}` : `${col} = ${idx}`)
      }
    }

    if (setClauses.length === 0) {
      return this.findOne(id)
    }

    setClauses.push("updated_at = NOW()")
    values.push(id)

    const query = `
      UPDATE polygons
      SET ${setClauses.join(", ")}
      WHERE id = $${values.length}
      RETURNING ${SELECT_COLUMNS}
    `

    const rows = await this.prisma.$queryRawUnsafe<PolygonRow[]>(query, ...values)
    return this.formatRow(rows[0])
  }

  async remove(id: string) {
    await this.findOne(id)

    await this.prisma.$queryRaw`
      DELETE FROM polygons WHERE id = ${id}
    `

    return { deleted: true }
  }

  private formatRow(row: PolygonRow) {
    return {
      ...row,
      georeference: JSON.parse(row.georeference),
    }
  }
}
