import { PrismaClient } from "@prisma/client"
import type { ExtractPolygon, AnalyzePolygon } from "./types.js"

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
      parking: boolean | null
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
           parking, min_stratum, max_stratum,
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
    avg_age: number | null
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
        p.parking, p.notes, p.latitude, p.longitude, p.avg_age, p.extracted_at,
      )
      rows.push(`(
        $${offset + 1}, $${offset + 2}, $${offset + 3}::"PropertyState",
        $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8},
        $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12},
        $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16},
        $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20},
        false, NOW(), $${offset + 21}
      )`)
    }

    const query = `
      INSERT INTO properties (
        id, link, state, area, price, age, admin_price, price_per_sqm,
        address, neighborhood, rooms, bathrooms, floor, elevator,
        stratum, parking, notes, latitude, longitude, avg_age,
        reviewed, created_at, extracted_at
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
        avg_age = EXCLUDED.avg_age,
        extracted_at = EXCLUDED.extracted_at
    `

    await prisma.$executeRawUnsafe(query, ...values)
    upserted += batch.length
    console.log(`  Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upserted}/${properties.length}`)
  }

  return upserted
}

export async function getAnalyzePolygons(): Promise<AnalyzePolygon[]> {
  const rows = await prisma.$queryRaw<
    {
      id: string
      name: string
      georeference: string
      city: string
      deviation_threshold: number
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
    }[]
  >`
    SELECT id, name, ST_AsGeoJSON(georeference)::text AS georeference,
           city, deviation_threshold,
           min_price, max_price, min_bedrooms, max_bedrooms,
           min_bathrooms, max_bathrooms, min_area, max_area,
           parking, min_stratum, max_stratum,
           min_age, max_age
    FROM polygons
    WHERE polygon_type = 'ANALYZE' AND enabled = true AND deviation_threshold IS NOT NULL
  `

  return rows.map((row) => ({
    ...row,
    georeference: JSON.parse(row.georeference),
  }))
}

export interface CandidateProperty {
  id: string
  link: string
  price_per_sqm: number
  price: number
  area: number
  address: string
  neighborhood: string
}

export async function getFilteredProperties(polygon: AnalyzePolygon): Promise<CandidateProperty[]> {
  const conditions: string[] = ["p.duplicated_of_id IS NULL"]
  const values: unknown[] = []

  // Spatial filter: property must be inside the polygon
  values.push(polygon.id)
  conditions.push(`ST_Contains(
    (SELECT georeference FROM polygons WHERE id = $${values.length}),
    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)
  )`)

  if (polygon.min_price !== null) { values.push(polygon.min_price); conditions.push(`p.price >= $${values.length}`) }
  if (polygon.max_price !== null) { values.push(polygon.max_price); conditions.push(`p.price <= $${values.length}`) }
  if (polygon.min_bedrooms !== null) { values.push(polygon.min_bedrooms); conditions.push(`p.rooms >= $${values.length}`) }
  if (polygon.max_bedrooms !== null) { values.push(polygon.max_bedrooms); conditions.push(`p.rooms <= $${values.length}`) }
  if (polygon.min_bathrooms !== null) { values.push(polygon.min_bathrooms); conditions.push(`p.bathrooms >= $${values.length}`) }
  if (polygon.max_bathrooms !== null) { values.push(polygon.max_bathrooms); conditions.push(`p.bathrooms <= $${values.length}`) }
  if (polygon.min_area !== null) { values.push(polygon.min_area); conditions.push(`p.area >= $${values.length}`) }
  if (polygon.max_area !== null) { values.push(polygon.max_area); conditions.push(`p.area <= $${values.length}`) }
  if (polygon.parking !== null) { values.push(polygon.parking); conditions.push(`p.parking = $${values.length}`) }
  if (polygon.min_stratum !== null) { values.push(polygon.min_stratum); conditions.push(`p.stratum >= $${values.length}`) }
  if (polygon.max_stratum !== null) { values.push(polygon.max_stratum); conditions.push(`p.stratum <= $${values.length}`) }
  if (polygon.min_age !== null) { values.push(polygon.min_age); conditions.push(`p.avg_age >= $${values.length}`) }
  if (polygon.max_age !== null) { values.push(polygon.max_age); conditions.push(`p.avg_age <= $${values.length}`) }

  const query = `
    SELECT p.id, p.link, p.price_per_sqm::float, p.price::float, p.area::float, p.address, p.neighborhood
    FROM properties p
    WHERE ${conditions.join(" AND ")}
      AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  `

  return prisma.$queryRawUnsafe<CandidateProperty[]>(query, ...values)
}

export async function countReviewedProperties(polygon: AnalyzePolygon): Promise<number> {
  const conditions: string[] = ["p.duplicated_of_id IS NULL", "p.reviewed = true"]
  const values: unknown[] = []

  values.push(polygon.id)
  conditions.push(`ST_Contains(
    (SELECT georeference FROM polygons WHERE id = $${values.length}),
    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)
  )`)

  if (polygon.min_price !== null) { values.push(polygon.min_price); conditions.push(`p.price >= $${values.length}`) }
  if (polygon.max_price !== null) { values.push(polygon.max_price); conditions.push(`p.price <= $${values.length}`) }
  if (polygon.min_bedrooms !== null) { values.push(polygon.min_bedrooms); conditions.push(`p.rooms >= $${values.length}`) }
  if (polygon.max_bedrooms !== null) { values.push(polygon.max_bedrooms); conditions.push(`p.rooms <= $${values.length}`) }
  if (polygon.min_bathrooms !== null) { values.push(polygon.min_bathrooms); conditions.push(`p.bathrooms >= $${values.length}`) }
  if (polygon.max_bathrooms !== null) { values.push(polygon.max_bathrooms); conditions.push(`p.bathrooms <= $${values.length}`) }
  if (polygon.min_area !== null) { values.push(polygon.min_area); conditions.push(`p.area >= $${values.length}`) }
  if (polygon.max_area !== null) { values.push(polygon.max_area); conditions.push(`p.area <= $${values.length}`) }
  if (polygon.parking !== null) { values.push(polygon.parking); conditions.push(`p.parking = $${values.length}`) }
  if (polygon.min_stratum !== null) { values.push(polygon.min_stratum); conditions.push(`p.stratum >= $${values.length}`) }
  if (polygon.max_stratum !== null) { values.push(polygon.max_stratum); conditions.push(`p.stratum <= $${values.length}`) }
  if (polygon.min_age !== null) { values.push(polygon.min_age); conditions.push(`p.avg_age >= $${values.length}`) }
  if (polygon.max_age !== null) { values.push(polygon.max_age); conditions.push(`p.avg_age <= $${values.length}`) }

  const query = `
    SELECT COUNT(*)::int AS count
    FROM properties p
    WHERE ${conditions.join(" AND ")}
      AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  `

  const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(query, ...values)
  return rows[0]?.count ?? 0
}

export async function getMedianPricePerSqm(polygon: AnalyzePolygon): Promise<number | null> {
  const conditions: string[] = ["p.duplicated_of_id IS NULL", "p.reviewed = true"]
  const values: unknown[] = []

  values.push(polygon.id)
  conditions.push(`ST_Contains(
    (SELECT georeference FROM polygons WHERE id = $${values.length}),
    ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)
  )`)

  if (polygon.min_price !== null) { values.push(polygon.min_price); conditions.push(`p.price >= $${values.length}`) }
  if (polygon.max_price !== null) { values.push(polygon.max_price); conditions.push(`p.price <= $${values.length}`) }
  if (polygon.min_bedrooms !== null) { values.push(polygon.min_bedrooms); conditions.push(`p.rooms >= $${values.length}`) }
  if (polygon.max_bedrooms !== null) { values.push(polygon.max_bedrooms); conditions.push(`p.rooms <= $${values.length}`) }
  if (polygon.min_bathrooms !== null) { values.push(polygon.min_bathrooms); conditions.push(`p.bathrooms >= $${values.length}`) }
  if (polygon.max_bathrooms !== null) { values.push(polygon.max_bathrooms); conditions.push(`p.bathrooms <= $${values.length}`) }
  if (polygon.min_area !== null) { values.push(polygon.min_area); conditions.push(`p.area >= $${values.length}`) }
  if (polygon.max_area !== null) { values.push(polygon.max_area); conditions.push(`p.area <= $${values.length}`) }
  if (polygon.parking !== null) { values.push(polygon.parking); conditions.push(`p.parking = $${values.length}`) }
  if (polygon.min_stratum !== null) { values.push(polygon.min_stratum); conditions.push(`p.stratum >= $${values.length}`) }
  if (polygon.max_stratum !== null) { values.push(polygon.max_stratum); conditions.push(`p.stratum <= $${values.length}`) }
  if (polygon.min_age !== null) { values.push(polygon.min_age); conditions.push(`p.avg_age >= $${values.length}`) }
  if (polygon.max_age !== null) { values.push(polygon.max_age); conditions.push(`p.avg_age <= $${values.length}`) }

  const query = `
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.price_per_sqm::float) AS median
    FROM properties p
    WHERE ${conditions.join(" AND ")}
      AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  `

  const rows = await prisma.$queryRawUnsafe<{ median: number | null }[]>(query, ...values)
  return rows[0]?.median ?? null
}

export async function upsertPotentialProperties(
  polygonId: string,
  propertyIds: string[],
): Promise<number> {
  if (propertyIds.length === 0) return 0

  const BATCH_SIZE = 500
  let inserted = 0

  for (let i = 0; i < propertyIds.length; i += BATCH_SIZE) {
    const batch = propertyIds.slice(i, i + BATCH_SIZE)
    const values: unknown[] = []
    const rows: string[] = []

    for (const propId of batch) {
      const offset = values.length
      values.push(polygonId, propId)
      rows.push(`(gen_random_uuid(), $${offset + 1}, $${offset + 2}, NOW(), NOW())`)
    }

    const query = `
      INSERT INTO potential_properties (id, polygon_id, property_id, created_at, updated_at)
      VALUES ${rows.join(", ")}
      ON CONFLICT (polygon_id, property_id) DO UPDATE SET updated_at = NOW()
    `

    await prisma.$executeRawUnsafe(query, ...values)
    inserted += batch.length
  }

  return inserted
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
  status: "SUCCESS" | "FAILED" | "SKIPPED"
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
