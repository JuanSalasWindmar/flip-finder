import {
  getExtractPolygons,
  getLastExecution,
  upsertProperties,
  createExecution,
  disconnect,
} from "./db.js"
import { metroCuadradoClient } from "./platforms/metro-cuadrado/client.js"
import { fincaRaizClient } from "./platforms/finca-raiz/client.js"
import type { PlatformClient, ExtractPolygon, ExtractParams, RawProperty } from "./types.js"

const platforms: PlatformClient[] = [metroCuadradoClient, fincaRaizClient]

const PROPERTY_TYPE_MAP: Record<string, ExtractParams["propertyType"]> = {
  APARTMENT: "apartment",
  STUDIO: "apartment",
  HOUSE: "house",
}

const PROPERTY_STATUS_MAP: Record<string, ExtractParams["status"]> = {
  NEW: "new",
  USED: "used",
}

function buildRange(min: number | null, max: number | null): [number, number] | undefined {
  if (min === null && max === null) return undefined
  return [min ?? 0, max ?? 999999999]
}

function buildIntArray(min: number | null, max: number | null): number[] | undefined {
  if (min === null && max === null) return undefined
  const lo = min ?? 0
  const hi = max ?? 10
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
}

const AGE_MAP: Record<string, number> = {
  "menor a 1 año": 0,
  "Entre 0 y 5 años": 3,
  "1 a 8 años": 5,
  "Entre 5 y 10 años": 8,
  "9 a 15 años": 12,
  "Entre 10 y 20 años": 15,
  "16 a 30 años": 23,
  "Más de 20 años": 23,
  "más de 30 años": 35,
}

function parseAvgAge(age: string): number | null {
  return AGE_MAP[age] ?? null
}

function buildParams(polygon: ExtractPolygon): ExtractParams {
  return {
    propertyType: (polygon.property_type ? PROPERTY_TYPE_MAP[polygon.property_type] : undefined) ?? "apartment",
    businessType: "sale",
    status: (polygon.property_status ? PROPERTY_STATUS_MAP[polygon.property_status] : undefined) ?? "used",
    priceRange: buildRange(polygon.min_price, polygon.max_price),
    areaRange: buildRange(polygon.min_area, polygon.max_area),
    rooms: buildIntArray(polygon.min_bedrooms, polygon.max_bedrooms),
    bathrooms: buildIntArray(polygon.min_bathrooms, polygon.max_bathrooms),
    parking: buildIntArray(polygon.min_parking, polygon.max_parking),
    stratum: buildIntArray(polygon.min_stratum, polygon.max_stratum),
  }
}

async function main() {
  console.log("Starting extraction...")

  const polygons = await getExtractPolygons()
  console.log(`Found ${polygons.length} EXTRACT polygon(s)`)

  if (polygons.length === 0) {
    console.log("No polygons to process. Exiting.")
    await disconnect()
    return
  }

  const performedAt = new Date()
  let totalUpserted = 0

  for (const polygon of polygons) {
    console.log(`\nProcessing polygon: ${polygon.name} (${polygon.city})`)

    const lastExecution = await getLastExecution(polygon.id, "EXTRACT")
    if (lastExecution) {
      console.log(`  Last successful extraction: ${lastExecution.toISOString()}`)
    } else {
      console.log("  First extraction for this polygon")
    }

    const params: ExtractParams = buildParams(polygon)

    const allProperties: RawProperty[] = []
    let hasFailed = false

    for (const platform of platforms) {
      try {
        const properties = await platform.fetchProperties(
          polygon,
          params,
          lastExecution,
        )
        console.log(
          `  ${platform.name}: ${properties.length} properties fetched`,
        )
        allProperties.push(...properties)
      } catch (error) {
        hasFailed = true
        console.error(
          `  ${platform.name}: Error fetching properties:`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    // Filter out properties with missing IDs
    const validProperties = allProperties.filter((p) => p.id !== "")

    const withTimestamp = validProperties.map((p) => ({
      ...p,
      avg_age: parseAvgAge(p.age),
      extracted_at: performedAt,
    }))

    console.log(`  Upserting ${withTimestamp.length} properties into DB...`)
    const upserted =
      withTimestamp.length > 0 ? await upsertProperties(withTimestamp) : 0
    totalUpserted += upserted
    console.log(`  Upserted ${upserted} properties into DB`)

    await createExecution({
      polygonId: polygon.id,
      type: "EXTRACT",
      status: hasFailed ? "FAILED" : "SUCCESS",
      propertiesFound: allProperties.length,
      propertiesNew: upserted,
      performedAt,
    })
  }

  console.log(`\nExtraction complete. Total upserted: ${totalUpserted}`)
  await disconnect()
  process.exit(0)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  disconnect().finally(() => process.exit(1))
})
