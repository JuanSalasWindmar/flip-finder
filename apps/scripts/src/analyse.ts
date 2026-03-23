import {
  getAnalyzePolygons,
  countReviewedProperties,
  getFilteredProperties,
  getMedianPricePerSqm,
  upsertPotentialProperties,
  createExecution,
  disconnect,
} from "./db.js"

async function main() {
  console.log("Starting analysis...")

  const polygons = await getAnalyzePolygons()
  console.log(`Found ${polygons.length} ANALYZE polygon(s)`)

  if (polygons.length === 0) {
    console.log("No polygons to analyze. Exiting.")
    await disconnect()
    process.exit(0)
    return
  }

  const performedAt = new Date()

  for (const polygon of polygons) {
    console.log(`\nAnalyzing polygon: ${polygon.name} (${polygon.city})`)
    console.log(`  Deviation threshold: -${polygon.deviation_threshold}%`)

    // Validate minimum sample size of reviewed properties
    const MIN_REVIEWED = 15
    const reviewedCount = await countReviewedProperties(polygon)
    console.log(`  Reviewed properties: ${reviewedCount}`)

    if (reviewedCount < MIN_REVIEWED) {
      console.log(`  Insufficient reviewed properties (${reviewedCount}/${MIN_REVIEWED}). Skipping.`)
      await createExecution({
        polygonId: polygon.id,
        type: "ANALYZE",
        status: "SKIPPED",
        propertiesFound: 0,
        propertiesNew: 0,
        performedAt,
      })
      continue
    }

    // Step 3.1: Compute median price/m2 from reviewed properties
    const median = await getMedianPricePerSqm(polygon)

    if (median === null || median === 0) {
      console.log("  No reviewed properties found to compute median. Skipping.")
      await createExecution({
        polygonId: polygon.id,
        type: "ANALYZE",
        status: "SKIPPED",
        propertiesFound: 0,
        propertiesNew: 0,
        performedAt,
      })
      continue
    }

    console.log(`  Median price/m²: $${Math.round(median).toLocaleString()}`)

    // Step 2: Get all candidate properties (reviewed or not, no duplicates)
    const candidates = await getFilteredProperties(polygon)
    console.log(`  Candidate properties: ${candidates.length}`)

    // Step 3.2: Find properties with negative deviation exceeding threshold
    const thresholdRatio = -polygon.deviation_threshold / 100
    const potentialIds: string[] = []

    for (const prop of candidates) {
      const deviation = (prop.price_per_sqm - median) / median

      if (deviation <= thresholdRatio) {
        const deviationPct = (deviation * 100).toFixed(2)
        console.log(
          `    [POTENTIAL] ${prop.id} | ${prop.address} | $${Math.round(prop.price_per_sqm).toLocaleString()}/m² | ${deviationPct}% vs median`,
        )
        potentialIds.push(prop.id)
      }
    }

    console.log(`  Potential properties found: ${potentialIds.length}`)

    // Step 4: Store potential properties
    const stored = await upsertPotentialProperties(polygon.id, potentialIds)
    console.log(`  Stored ${stored} potential properties`)

    await createExecution({
      polygonId: polygon.id,
      type: "ANALYZE",
      status: "SUCCESS",
      propertiesFound: candidates.length,
      propertiesNew: potentialIds.length,
      performedAt,
    })
  }

  console.log("\nAnalysis complete.")
  await disconnect()
  process.exit(0)
}

main().catch((error) => {
  console.error("Fatal error:", error)
  disconnect().finally(() => process.exit(1))
})
