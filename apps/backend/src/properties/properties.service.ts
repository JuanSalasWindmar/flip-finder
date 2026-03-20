import { Injectable, NotFoundException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { CreatePropertyDto } from "./dto/create-property.dto"
import { UpdatePropertyDto } from "./dto/update-property.dto"
import { BulkUpdateItemDto } from "./dto/bulk-update-property.dto"

const UPDATABLE_COLUMNS = [
  "link",
  "state",
  "area",
  "price",
  "age",
  "avg_age",
  "admin_price",
  "price_per_sqm",
  "address",
  "neighborhood",
  "rooms",
  "bathrooms",
  "floor",
  "elevator",
  "stratum",
  "parking",
  "notes",
  "latitude",
  "longitude",
  "reviewed",
  "duplicated_of_id",
] as const

const ENUM_COLUMNS: Record<string, string> = {
  state: '"PropertyState"',
}

interface PropertyRow {
  id: string
  link: string
  state: string
  area: number
  price: bigint
  age: string
  avg_age: number | null
  admin_price: bigint
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
  reviewed: boolean
  duplicated_of_id: string | null
  created_at: Date
  extracted_at: Date
}

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePropertyDto) {
    const rows = await this.prisma.$queryRawUnsafe<PropertyRow[]>(
      `INSERT INTO properties (
        id, link, state, area, price, age, avg_age, admin_price, price_per_sqm,
        address, neighborhood, rooms, bathrooms, floor, elevator,
        stratum, parking, notes, latitude, longitude, reviewed, created_at, extracted_at
      ) VALUES (
        $1, $2, $3::"PropertyState", $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, NOW(), $22
      )
      ON CONFLICT (id) DO UPDATE SET
        link = EXCLUDED.link, state = EXCLUDED.state, area = EXCLUDED.area,
        price = EXCLUDED.price, age = EXCLUDED.age, avg_age = EXCLUDED.avg_age,
        admin_price = EXCLUDED.admin_price, price_per_sqm = EXCLUDED.price_per_sqm,
        address = EXCLUDED.address, neighborhood = EXCLUDED.neighborhood,
        rooms = EXCLUDED.rooms, bathrooms = EXCLUDED.bathrooms,
        floor = EXCLUDED.floor, elevator = EXCLUDED.elevator,
        stratum = EXCLUDED.stratum, parking = EXCLUDED.parking,
        notes = EXCLUDED.notes, latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude, extracted_at = EXCLUDED.extracted_at
      RETURNING *`,
      dto.id,
      dto.link,
      dto.state,
      dto.area,
      dto.price,
      dto.age,
      dto.avg_age ?? null,
      dto.admin_price,
      dto.price_per_sqm,
      dto.address,
      dto.neighborhood,
      dto.rooms,
      dto.bathrooms,
      dto.floor,
      dto.elevator ?? false,
      dto.stratum,
      dto.parking ?? false,
      dto.notes ?? null,
      dto.latitude ?? null,
      dto.longitude ?? null,
      dto.reviewed ?? false,
      new Date(dto.extracted_at),
    )

    return this.formatRow(rows[0])
  }

  async findAll(polygonId?: string) {
    const rows = await this.queryProperties(polygonId)
    return rows.map((row) => this.formatRow(row))
  }

  async findAllCsv(polygonId?: string): Promise<string> {
    const rows = await this.queryProperties(polygonId)

    const headers = [
      "id", "link", "state", "area", "price", "age", "avg_age",
      "admin_price", "price_per_sqm", "address", "neighborhood",
      "rooms", "bathrooms", "floor", "elevator", "stratum", "parking",
      "notes", "latitude", "longitude", "reviewed", "duplicated_of_id",
      "created_at", "extracted_at",
    ]

    const csvRows = rows.map((row) =>
      headers.map((h) => {
        const value = row[h as keyof PropertyRow]
        if (value === null || value === undefined) return ""
        const str = String(value)
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(","),
    )

    return [headers.join(","), ...csvRows].join("\n")
  }

  async findOne(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<PropertyRow[]>(
      `SELECT * FROM properties WHERE id = $1`,
      id,
    )

    if (rows.length === 0) {
      throw new NotFoundException(`Property ${id} not found`)
    }

    return this.formatRow(rows[0])
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.findOne(id)

    const setClauses: string[] = []
    const values: unknown[] = []

    for (const col of UPDATABLE_COLUMNS) {
      if (dto[col as keyof UpdatePropertyDto] !== undefined) {
        values.push(dto[col as keyof UpdatePropertyDto])
        const idx = `$${values.length}`
        setClauses.push(ENUM_COLUMNS[col] ? `${col} = ${idx}::${ENUM_COLUMNS[col]}` : `${col} = ${idx}`)
      }
    }

    if (setClauses.length === 0) {
      return this.findOne(id)
    }

    values.push(id)

    const query = `
      UPDATE properties
      SET ${setClauses.join(", ")}
      WHERE id = $${values.length}
      RETURNING *
    `

    const rows = await this.prisma.$queryRawUnsafe<PropertyRow[]>(query, ...values)
    return this.formatRow(rows[0])
  }

  async bulkUpdate(items: BulkUpdateItemDto[]) {
    const results = []

    for (const item of items) {
      const { id, ...updates } = item
      if (Object.keys(updates).length === 0) continue
      const updated = await this.update(id, updates)
      results.push(updated)
    }

    return results
  }

  async remove(id: string) {
    await this.findOne(id)

    await this.prisma.$queryRawUnsafe(`DELETE FROM properties WHERE id = $1`, id)

    return { deleted: true }
  }

  private async queryProperties(polygonId?: string): Promise<PropertyRow[]> {
    if (polygonId) {
      return this.prisma.$queryRawUnsafe<PropertyRow[]>(
        `SELECT p.* FROM properties p
         WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
           AND ST_Contains(
             (SELECT georeference FROM polygons WHERE id = $1),
             ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)
           )
         ORDER BY p.created_at DESC`,
        polygonId,
      )
    }

    return this.prisma.$queryRawUnsafe<PropertyRow[]>(
      `SELECT * FROM properties ORDER BY created_at DESC`,
    )
  }

  private formatRow(row: PropertyRow) {
    return {
      ...row,
      price: Number(row.price),
      admin_price: Number(row.admin_price),
    }
  }
}
