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

interface PropertyFilters {
  polygonId?: string
  minArea?: string
  maxArea?: string
  state?: string
  floor?: string
  reviewed?: string
  avgAge?: string
  duplicatedOf?: string
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

  async findAll(filters?: PropertyFilters) {
    const rows = await this.queryProperties(filters)
    return rows.map((row) => this.formatRow(row))
  }

  async findAllCsv(filters?: PropertyFilters): Promise<string> {
    const rows = await this.queryProperties(filters)

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
    // 1. Group items by duplicated_group
    const groups = new Map<string, BulkUpdateItemDto[]>()
    const ungrouped: BulkUpdateItemDto[] = []

    for (const item of items) {
      if (item.duplicated_group) {
        const group = groups.get(item.duplicated_group) || []
        group.push(item)
        groups.set(item.duplicated_group, group)
      } else {
        ungrouped.push(item)
      }
    }

    // 2. Process duplicate groups
    for (const [, group] of groups) {
      // Fetch full property data for each item in the group
      const properties = await Promise.all(
        group.map(async (item) => ({
          item,
          row: await this.prisma.$queryRawUnsafe<PropertyRow[]>(
            `SELECT * FROM properties WHERE id = $1`,
            item.id,
          ).then((rows) => rows[0]),
        })),
      )

      // Also fetch existing duplicates from DB that point to any member of this group
      const groupIds = group.map((g) => g.id)
      const existingDuplicates = await this.prisma.$queryRawUnsafe<PropertyRow[]>(
        `SELECT * FROM properties WHERE duplicated_of_id = ANY($1::text[])`,
        groupIds,
      )

      // Sort to pick main: 1) lowest price, 2) Finca Raíz, 3) random
      properties.sort((a, b) => {
        const priceDiff = Number(a.row.price) - Number(b.row.price)
        if (priceDiff !== 0) return priceDiff

        const aIsFincaRaiz = a.row.link.includes("fincaraiz") ? 1 : 0
        const bIsFincaRaiz = b.row.link.includes("fincaraiz") ? 1 : 0
        if (aIsFincaRaiz !== bIsFincaRaiz) return bIsFincaRaiz - aIsFincaRaiz

        return 0
      })

      const mainProperty = properties[0]
      const mainId = mainProperty.item.id
      const mainRow = mainProperty.row

      // Merge missing fields from duplicates into the main property
      const fillableFields = ["floor", "elevator", "admin_price", "notes", "latitude", "longitude", "avg_age"] as const
      const allRows = [...properties.map((p) => p.row), ...existingDuplicates]

      for (const field of fillableFields) {
        const mainValue = mainRow[field]
        const isMissing =
          mainValue === null ||
          mainValue === 0 ||
          (field === "elevator" && mainValue === false && mainRow.floor > 0)

        if (!isMissing) continue

        // Find a value from the duplicates
        for (const row of allRows) {
          if (row.id === mainId) continue
          const val = row[field]
          if (val !== null && val !== 0) {
            ;(mainProperty.item as unknown as Record<string, unknown>)[field] = field === "admin_price" ? Number(val) : val
            break
          }
        }
      }

      // Set duplicated_of_id
      mainProperty.item.duplicated_of_id = null
      for (const { item } of properties) {
        if (item.id !== mainId) {
          item.duplicated_of_id = mainId
        }
      }

      // Reassign existing duplicates in DB to the new main
      for (const dup of existingDuplicates) {
        if (dup.id === mainId || groupIds.includes(dup.id)) continue
        await this.prisma.$queryRawUnsafe(
          `UPDATE properties SET duplicated_of_id = $1 WHERE id = $2`,
          mainId,
          dup.id,
        )
      }
    }

    // 3. Apply all updates
    const results = []

    for (const item of [...ungrouped, ...Array.from(groups.values()).flat()]) {
      const { id, duplicated_group: _, ...updates } = item
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

  private async queryProperties(filters?: PropertyFilters): Promise<PropertyRow[]> {
    const conditions: string[] = []
    const values: unknown[] = []

    if (filters?.polygonId) {
      values.push(filters.polygonId)
      conditions.push(`p.latitude IS NOT NULL AND p.longitude IS NOT NULL AND ST_Contains(
        (SELECT georeference FROM polygons WHERE id = $${values.length}),
        ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)
      )`)
    }

    if (filters?.minArea) {
      if (filters.minArea === "null") {
        conditions.push(`p.area IS NULL`)
      } else {
        values.push(Number(filters.minArea))
        conditions.push(`p.area >= $${values.length}`)
      }
    }

    if (filters?.maxArea) {
      if (filters.maxArea === "null") {
        conditions.push(`p.area IS NULL`)
      } else {
        values.push(Number(filters.maxArea))
        conditions.push(`p.area <= $${values.length}`)
      }
    }

    if (filters?.state) {
      if (filters.state === "null") {
        conditions.push(`p.state IS NULL`)
      } else {
        values.push(filters.state)
        conditions.push(`p.state = $${values.length}::"PropertyState"`)
      }
    }

    if (filters?.floor) {
      if (filters.floor === "null") {
        conditions.push(`(p.floor IS NULL OR p.floor = 0)`)
      } else {
        values.push(Number(filters.floor))
        conditions.push(`p.floor = $${values.length}`)
      }
    }

    if (filters?.reviewed) {
      values.push(filters.reviewed === "true")
      conditions.push(`p.reviewed = $${values.length}`)
    }

    if (filters?.avgAge) {
      if (filters.avgAge === "null") {
        conditions.push(`p.avg_age IS NULL`)
      } else {
        values.push(Number(filters.avgAge))
        conditions.push(`p.avg_age = $${values.length}`)
      }
    }

    if (filters?.duplicatedOf) {
      if (filters.duplicatedOf === "null") {
        conditions.push(`p.duplicated_of_id IS NULL`)
      } else if (filters.duplicatedOf === "has") {
        conditions.push(`p.duplicated_of_id IS NOT NULL`)
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const query = `SELECT p.* FROM properties p ${where} ORDER BY p.created_at DESC`

    return this.prisma.$queryRawUnsafe<PropertyRow[]>(query, ...values)
  }

  private formatRow(row: PropertyRow) {
    return {
      ...row,
      price: Number(row.price),
      admin_price: Number(row.admin_price),
    }
  }
}
