import { PrismaClient } from "@prisma/client"
import type { ExtractPolygon } from "./types.js"

const prisma = new PrismaClient()

export async function getExtractPolygons(): Promise<ExtractPolygon[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string
      name: string
      georeference: string
      city: string
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
      min_parking: number | null
      max_parking: number | null
      min_stratum: number | null
      max_stratum: number | null
      min_age: number | null
      max_age: number | null
    }[]
  >`
    SELECT id, name, ST_AsGeoJSON(georeference)::text AS georeference,
           city, enabled, property_type, property_status,
           min_price, max_price, min_bedrooms, max_bedrooms,
           min_bathrooms, max_bathrooms, min_area, max_area,
           min_parking, max_parking, min_stratum, max_stratum,
           min_age, max_age
    FROM polygons
    WHERE polygon_type = 'EXTRACT' AND enabled = true
  `

  return rows.map((row) => ({
    ...row,
    georeference: JSON.parse(row.georeference),
  }))
}

export async function upsertProperties(
  properties: {
    id: string
    link: string
    state: "ORIGINAL" | "REMODELED"
    area: number
    price: number
    age: string
    admin_price: number
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
    extracted_at: Date
  }[],
): Promise<number> {
  const BATCH_SIZE = 500
  let upserted = 0

  for (let i = 0; i < properties.length; i += BATCH_SIZE) {
    const batch = properties.slice(i, i + BATCH_SIZE)

    const values: unknown[] = []
    const rows: string[] = []

    for (const p of batch) {
      const offset = values.length
      values.push(
        p.id, p.link, p.state, p.area, p.price, p.age,
        p.admin_price, p.price_per_sqm, p.address, p.neighborhood,
        p.rooms, p.bathrooms, p.floor, p.elevator, p.stratum,
        p.parking, p.notes, p.latitude, p.longitude, p.extracted_at,
      )
      rows.push(`(
        $${offset + 1}, $${offset + 2}, $${offset + 3}::"PropertyState",
        $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8},
        $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12},
        $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16},
        $${offset + 17}, $${offset + 18}, $${offset + 19},
        false, NOW(), $${offset + 20}
      )`)
    }

    const query = `
      INSERT INTO properties (
        id, link, state, area, price, age, admin_price, price_per_sqm,
        address, neighborhood, rooms, bathrooms, floor, elevator,
        stratum, parking, notes, latitude, longitude, reviewed, created_at, extracted_at
      ) VALUES ${rows.join(", ")}
      ON CONFLICT (id) DO UPDATE SET
        link = EXCLUDED.link,
        state = EXCLUDED.state,
        area = EXCLUDED.area,
        price = EXCLUDED.price,
        age = EXCLUDED.age,
        admin_price = EXCLUDED.admin_price,
        price_per_sqm = EXCLUDED.price_per_sqm,
        address = EXCLUDED.address,
        neighborhood = EXCLUDED.neighborhood,
        rooms = EXCLUDED.rooms,
        bathrooms = EXCLUDED.bathrooms,
        floor = EXCLUDED.floor,
        elevator = EXCLUDED.elevator,
        stratum = EXCLUDED.stratum,
        parking = EXCLUDED.parking,
        notes = EXCLUDED.notes,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        extracted_at = EXCLUDED.extracted_at
    `

    await prisma.$executeRawUnsafe(query, ...values)
    upserted += batch.length
    console.log(`  Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upserted}/${properties.length}`)
  }

  return upserted
}

export async function getLastExecution(
  polygonId: string,
  type: "EXTRACT" | "ANALYZE",
): Promise<Date | null> {
  const rows = await prisma.$queryRaw<{ performed_at: Date }[]>`
    SELECT performed_at FROM executions
    WHERE polygon_id = ${polygonId} AND type = ${type}::"PolygonType" AND status = 'SUCCESS'
    ORDER BY performed_at DESC
    LIMIT 1
  `
  return rows.length > 0 ? rows[0].performed_at : null
}

export async function createExecution(execution: {
  polygonId: string
  type: "EXTRACT" | "ANALYZE"
  status: "SUCCESS" | "FAILED"
  propertiesFound: number
  propertiesNew: number
  performedAt: Date
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO executions (id, polygon_id, type, status, properties_found, properties_new, performed_at, created_at)
    VALUES (gen_random_uuid(), ${execution.polygonId}, ${execution.type}::"PolygonType",
            ${execution.status}::"ExecutionStatus", ${execution.propertiesFound},
            ${execution.propertiesNew}, ${execution.performedAt}, NOW())
  `
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect()
}
