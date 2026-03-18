import {
  getExtractPolygons,
  getLastExecution,
  upsertProperties,
  createExecution,
  disconnect,
} from "./db.js"
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

    const params: ExtractParams = polygon.params ?? DEFAULT_PARAMS

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
      extracted_at: performedAt,
    }))

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
}

main().catch((error) => {
  console.error("Fatal error:", error)
  disconnect().finally(() => process.exit(1))
})
