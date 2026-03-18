import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { CreatePolygonDto } from "./dto/create-polygon.dto"
import { UpdatePolygonDto } from "./dto/update-polygon.dto"

interface PolygonRow {
  id: string
  name: string
  georeference: string
  city: string
  polygon_type: string
  enabled: boolean
  params: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

@Injectable()
export class PolygonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePolygonDto) {
    const geojson = JSON.stringify(dto.georeference)
    const params = dto.params ? JSON.stringify(dto.params) : null

    const rows = await this.prisma.$queryRaw<PolygonRow[]>`
      INSERT INTO polygons (id, name, georeference, city, polygon_type, enabled, params, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${dto.name},
        ST_GeomFromGeoJSON(${geojson}),
        ${dto.city},
        ${dto.polygon_type}::"PolygonType",
        ${dto.enabled ?? true},
        ${params}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING
        id, name,
        ST_AsGeoJSON(georeference)::text AS georeference,
        city, polygon_type, enabled, params, created_at, updated_at
    `

    return this.formatRow(rows[0])
  }

  async findAll() {
    const rows = await this.prisma.$queryRaw<PolygonRow[]>`
      SELECT
        id, name,
        ST_AsGeoJSON(georeference)::text AS georeference,
        city, polygon_type, enabled, params, created_at, updated_at
      FROM polygons
      ORDER BY created_at DESC
    `

    return rows.map((row) => this.formatRow(row))
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<PolygonRow[]>`
      SELECT
        id, name,
        ST_AsGeoJSON(georeference)::text AS georeference,
        city, polygon_type, enabled, params, created_at, updated_at
      FROM polygons
      WHERE id = ${id}
    `

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

    if (dto.params !== undefined) {
      values.push(dto.params ? JSON.stringify(dto.params) : null)
      setClauses.push(`params = $${values.length}::jsonb`)
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
      RETURNING
        id, name,
        ST_AsGeoJSON(georeference)::text AS georeference,
        city, polygon_type, enabled, params, created_at, updated_at
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
