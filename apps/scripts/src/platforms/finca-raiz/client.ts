import {
  PROPERTY_TYPE,
  BUSINESS_TYPE,
  PROPERTY_STATUS,
} from "../dictionary.js"
import { transformFincaRaiz } from "./transformer.js"
import type {
  ExtractPolygon,
  ExtractParams,
  RawProperty,
  PlatformClient,
} from "../../types.js"

const API_URL =
  "https://search-service.fincaraiz.com.co/api/v1/properties/search"
const ROWS_PER_PAGE = 22

function buildParams(polygon: ExtractPolygon, params: ExtractParams, page: number) {
  // Convert GeoJSON [lng, lat] to FincaRaiz { latitude, longitude } objects
  const mapPolygons = [
    polygon.georeference.coordinates[0].map((coord) => ({
      latitude: coord[1],
      longitude: coord[0],
    })),
  ]

  const searchParams: Record<string, unknown> = {
    page,
    order: 2,
    bedroomsExactMode: false,
    bathroomsExactMode: false,
    operation_type_id: BUSINESS_TYPE[params.businessType].fincaRaiz,
    property_type_id: [PROPERTY_TYPE[params.propertyType].fincaRaiz],
    currencyID: 4,
    m2Currency: 4,
    mapView: true,
    map_polygons: mapPolygons,
  }

  const statusVal = PROPERTY_STATUS[params.status].fincaRaiz
  if (statusVal !== null) {
    searchParams.constStatesID = [statusVal]
  }

  if (params.rooms) {
    searchParams.bedrooms = params.rooms
  }

  if (params.bathrooms) {
    searchParams.bathrooms = params.bathrooms
  }

  if (params.stratum) {
    searchParams.stratum = params.stratum
  }

  if (params.parking) {
    searchParams.garage = params.parking
  }

  if (params.areaRange) {
    searchParams.m2Min = params.areaRange[0]
    searchParams.m2Max = params.areaRange[1]
  }

  return searchParams
}

async function fetchPage(
  polygon: ExtractPolygon,
  params: ExtractParams,
  page: number,
): Promise<{
  properties: unknown[]
  total: number
}> {
  const searchParams = buildParams(polygon, params, page)

  const body = {
    variables: {
      rows: ROWS_PER_PAGE,
      params: searchParams,
      page,
      source: 10,
    },
    query: "",
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`FincaRaiz API error: ${response.status}`)
  }

  const json = (await response.json()) as {
    hits: {
      total: { value: number }
      hits: unknown[]
    }
  }

  return {
    properties: json.hits.hits ?? [],
    total: json.hits.total.value,
  }
}

async function fetchAllProperties(
  polygon: ExtractPolygon,
  params: ExtractParams,
  since: Date | null,
): Promise<RawProperty[]> {
  // TODO: add date filter when FR API field name is discovered
  if (since) {
    console.log(
      `  [FincaRaiz] Since filter: ${since.toISOString()} (not yet implemented in API)`,
    )
  }

  const allProperties: RawProperty[] = []

  let page = 1
  let total = 0

  while (true) {
    const result = await fetchPage(polygon, params, page)
    total = result.total

    if (result.properties.length === 0) break

    const transformed = result.properties.map(transformFincaRaiz)
    allProperties.push(...transformed)

    console.log(
      `  [FincaRaiz] ${polygon.name}: ${allProperties.length}/${total} properties`,
    )

    if (page * ROWS_PER_PAGE >= total) break

    page++
  }

  return allProperties
}

export const fincaRaizClient: PlatformClient = {
  name: "fincaRaiz",
  fetchProperties: fetchAllProperties,
}
