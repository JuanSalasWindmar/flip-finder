import { INTERESTING_CRITERIA } from "../dictionary.js"
import type { RawProperty } from "../../types.js"

interface FrHit {
  _id?: string
  _source?: {
    listing?: {
      link?: string
      description?: string
      m2?: number
      price?: {
        amount?: number
        admin_included?: number
      }
      address?: string
      locations?: {
        neighbourhood?: { name: string }[]
      }
      technicalSheet?: { field: string; value: string }[]
      facilities?: { name: string }[]
      latitude?: number
      longitude?: number
    }
  }
}

function getTechValue(
  sheet: { field: string; value: string }[] | undefined,
  field: string,
): string {
  return sheet?.find((item) => item.field === field)?.value ?? ""
}

function detectRemodeled(description: string | undefined): boolean {
  return description?.toLowerCase().includes("remodelad") ?? false
}

function extractNotes(description: string | undefined): string | null {
  if (!description) return null

  const lower = description.toLowerCase()
  const matches = INTERESTING_CRITERIA.filter((keyword) =>
    lower.includes(keyword),
  )

  return matches.length > 0 ? matches.join(", ") : null
}

export function transformFincaRaiz(raw: unknown): RawProperty {
  const hit = raw as FrHit
  const listing = hit._source?.listing
  const sheet = listing?.technicalSheet

  const area =
    listing?.m2 ??
    Math.round(
      Number(getTechValue(sheet, "m2apto").replace(" m2", "").split(",")[0]),
    ) ??
    0
  const price = listing?.price?.amount ?? 0
  const adminIncluded = listing?.price?.admin_included ?? 0
  const adminPrice = adminIncluded > price ? adminIncluded - price : 0

  const bedrooms = Number(getTechValue(sheet, "bedrooms")) || 0
  const bathrooms = Number(getTechValue(sheet, "bathrooms")) || 0
  const floor = Number(getTechValue(sheet, "floor")) || 0
  const stratum = Number(getTechValue(sheet, "stratum")) || 0
  const garage = Number(getTechValue(sheet, "garage")) || 0
  const constructionYear = getTechValue(sheet, "constructionYear")

  const hasElevator =
    listing?.facilities?.some(
      (f) => f.name.toLowerCase() === "ascensor",
    ) ?? false

  const neighborhood =
    listing?.locations?.neighbourhood?.map((n) => n.name).join(", ") ?? ""

  return {
    id: hit._id ?? "",
    link: listing?.link
      ? `https://www.fincaraiz.com.co${listing.link}`
      : "",
    state: detectRemodeled(listing?.description) ? "REMODELED" : "ORIGINAL",
    area,
    price,
    age: constructionYear,
    admin_price: adminPrice,
    price_per_sqm: area > 0 ? Math.round((price / area) * 100) / 100 : 0,
    address: listing?.address?.toLowerCase() ?? "",
    neighborhood,
    rooms: bedrooms,
    bathrooms,
    floor: floor >= 1 ? floor : 0,
    elevator: hasElevator,
    stratum,
    parking: garage >= 1,
    notes: extractNotes(listing?.description),
    latitude: listing?.latitude ?? null,
    longitude: listing?.longitude ?? null,
  }
}
