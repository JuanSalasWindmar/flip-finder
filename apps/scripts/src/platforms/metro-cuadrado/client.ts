import {
  PROPERTY_TYPE,
  BUSINESS_TYPE,
  PROPERTY_STATUS,
} from "../dictionary.js"
import { transformMetroCuadrado } from "./transformer.js"
import type {
  ExtractPolygon,
  ExtractParams,
  RawProperty,
  PlatformClient,
} from "../../types.js"

const API_URL =
  "https://commons-api.metrocuadrado.com/v1/api/commons/queries"
const API_KEY = "6JgwwXGxlC921DP4SB4ST6Jo6OO7rv3t4yXn5Y8y"

interface McBatch {
  realEstate: { from: number }
  seller: { from: number }
}

function buildFilter(polygon: ExtractPolygon, params: ExtractParams) {
  // Convert GeoJSON [lng, lat] to MetroCuadrado [lat, lng] strings
  const geoShapeValues = polygon.georeference.coordinates[0].map((coord) => [
    String(coord[1]),
    String(coord[0]),
  ])

  const filter: Record<string, { values: unknown[] }> = {
    propertyTypeId: {
      values: [PROPERTY_TYPE[params.propertyType].metroCuadrado],
    },
    businessTypeId: {
      values: [...BUSINESS_TYPE[params.businessType].metroCuadrado],
    },
    geoShape: { values: geoShapeValues },
  }

  const statusVal = PROPERTY_STATUS[params.status].metroCuadrado
  if (statusVal) {
    filter.status = { values: [statusVal] }
  }

  if (params.priceRange) {
    filter.priceRange = {
      values: [String(params.priceRange[0]), String(params.priceRange[1])],
    }
  }

  if (params.areaRange) {
    filter.builtArea = {
      values: [String(params.areaRange[0]), String(params.areaRange[1])],
    }
  }

  if (params.rooms) {
    filter.roomsNumber = { values: params.rooms.map(String) }
  }

  if (params.bathrooms) {
    filter.bathroomsNumber = { values: params.bathrooms.map(String) }
  }

  if (params.parking) {
    filter.parkingNumber = { values: params.parking.map(String) }
  }

  if (params.stratum) {
    filter.stratum = { values: params.stratum.map(String) }
  }

  return filter
}

async function fetchPage(
  filter: Record<string, { values: unknown[] }>,
  batch: McBatch,
): Promise<{
  properties: unknown[]
  total: number
  nextBatch: McBatch
}> {
  const body = {
    queries: [
      {
        types: ["propertiesByFiltersQuery"],
        filter,
        batch: {
          realEstate: { from: batch.realEstate.from },
          seller: { from: batch.seller.from },
        },
      },
    ],
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`MetroCuadrado API error: ${response.status}`)
  }

  const json = (await response.json()) as {
    data: {
      result: {
        propertiesByFiltersQuery: {
          count: number
          total: number
          batch: {
            realEstate: { from: number }
            seller: { from: number }
          }
          properties: unknown[]
        }
      }
    }
  }

  const result = json.data.result.propertiesByFiltersQuery

  return {
    properties: result.properties ?? [],
    total: result.total,
    nextBatch: {
      realEstate: { from: result.batch.realEstate.from },
      seller: { from: result.batch.seller.from },
    },
  }
}

async function fetchAllProperties(
  polygon: ExtractPolygon,
  params: ExtractParams,
  since: Date | null,
): Promise<RawProperty[]> {
  const filter = buildFilter(polygon, params)

  // TODO: add date filter when MC API field name is discovered
  // e.g. filter.publishedDate = { values: [since.toISOString(), ""] }
  if (since) {
    console.log(
      `  [MetroCuadrado] Since filter: ${since.toISOString()} (not yet implemented in API)`,
    )
  }
  const allProperties: RawProperty[] = []

  let batch: McBatch = { realEstate: { from: 0 }, seller: { from: 0 } }
  let fetched = 0

  while (true) {
    const page = await fetchPage(filter, batch)

    if (page.properties.length === 0) break

    const transformed = page.properties.map(transformMetroCuadrado)
    allProperties.push(...transformed)
    fetched += page.properties.length

    console.log(
      `  [MetroCuadrado] ${polygon.name}: ${fetched}/${page.total} properties`,
    )

    if (fetched >= page.total) break

    batch = page.nextBatch
  }

  return allProperties
}

export const metroCuadradoClient: PlatformClient = {
  name: "metroCuadrado",
  fetchProperties: fetchAllProperties,
}
