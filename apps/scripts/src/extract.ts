import { getExtractPolygons, upsertProperties, disconnect } from "./db.js"
import { metroCuadradoClient } from "./platforms/metro-cuadrado/client.js"
import { fincaRaizClient } from "./platforms/finca-raiz/client.js"
import type { PlatformClient, ExtractParams, RawProperty } from "./types.js"

const platforms: PlatformClient[] = [metroCuadradoClient, fincaRaizClient]

const DEFAULT_PARAMS: ExtractParams = {
  propertyType: "apartment",
  businessType: "sale",
  status: "used",
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

  const extractedAt = new Date()
  let totalUpserted = 0

  for (const polygon of polygons) {
    console.log(`\nProcessing polygon: ${polygon.name} (${polygon.city})`)

    const params: ExtractParams = polygon.params ?? DEFAULT_PARAMS

    const allProperties: RawProperty[] = []

    for (const platform of platforms) {
      try {
        const properties = await platform.fetchProperties(polygon, params)
        console.log(
          `  ${platform.name}: ${properties.length} properties fetched`,
        )
        allProperties.push(...properties)
      } catch (error) {
        console.error(
          `  ${platform.name}: Error fetching properties:`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    // Filter out properties with missing IDs
    const validProperties = allProperties.filter((p) => p.id !== "")

    if (validProperties.length === 0) {
      console.log("  No valid properties to upsert")
      continue
    }

    const withTimestamp = validProperties.map((p) => ({
      ...p,
      extracted_at: extractedAt,
    }))

    const upserted = await upsertProperties(withTimestamp)
    totalUpserted += upserted
    console.log(`  Upserted ${upserted} properties into DB`)
  }

  console.log(`\nExtraction complete. Total upserted: ${totalUpserted}`)
  await disconnect()
}

main().catch((error) => {
  console.error("Fatal error:", error)
  disconnect().finally(() => process.exit(1))
})
