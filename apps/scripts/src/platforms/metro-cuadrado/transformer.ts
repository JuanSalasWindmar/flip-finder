import { INTERESTING_CRITERIA } from "../dictionary.js"
import type { RawProperty } from "../../types.js"

interface McProperty {
  metroId?: string
  url?: string
  builtTime?: { name?: string }
  area?: number
  builtArea?: number
  price?: number
  salePrice?: number
  adminPrice?: number
  neighborhood?: { name?: string }
  roomsNumber?: number
  bathroomsNumber?: number
  stratum?: number
  parkingNumber?: number
  features?: string[]
  extraFeatures?: string[]
  comments?: string
  location?: { lat?: number; lon?: number }
}

function extractFeatureValue(
  features: string[] | undefined,
  key: string,
): string | null {
  const feature = features?.find((f) => f.startsWith(`${key}:`))
  return feature ? feature.split(":")[1] : null
}

function detectRemodeled(element: McProperty): boolean {
  if (element.builtTime?.name === "Remodelado") return true
  if (element.comments?.toLowerCase().includes("remodelad")) return true
  return false
}

function detectElevator(element: McProperty): boolean {
  if (element.features?.includes("ascensor:S")) return true
  if (element.extraFeatures?.includes("ascensor")) return true
  const nroAscensores = extractFeatureValue(element.features, "nroAscensores")
  if (nroAscensores && Number(nroAscensores) >= 1) return true
  return false
}

function extractNotes(comments: string | undefined): string | null {
  if (!comments) return null

  const lower = comments.toLowerCase()
  const matches = INTERESTING_CRITERIA.filter((keyword) =>
    lower.includes(keyword),
  )

  return matches.length > 0 ? matches.join(", ") : null
}

export function transformMetroCuadrado(raw: unknown): RawProperty {
  const element = raw as McProperty

  const area = element.area ?? element.builtArea ?? 0
  const price = element.price ?? element.salePrice ?? 0
  const floor = Number(extractFeatureValue(element.features, "nroPiso")) || 0

  return {
    id: element.metroId ?? "",
    link: element.url
      ? `https://www.metrocuadrado.com${element.url}`
      : "",
    state: detectRemodeled(element) ? "REMODELED" : "ORIGINAL",
    area,
    price,
    age: element.builtTime?.name ?? "",
    admin_price: element.adminPrice ?? 0,
    price_per_sqm: area > 0 ? Math.round((price / area) * 100) / 100 : 0,
    address: "",
    neighborhood: element.neighborhood?.name ?? "",
    rooms: element.roomsNumber ?? 0,
    bathrooms: element.bathroomsNumber ?? 0,
    floor,
    elevator: detectElevator(element),
    stratum: element.stratum ?? 0,
    parking: (element.parkingNumber ?? 0) >= 1,
    notes: extractNotes(element.comments),
    latitude: element.location?.lat ?? null,
    longitude: element.location?.lon ?? null,
  }
}
