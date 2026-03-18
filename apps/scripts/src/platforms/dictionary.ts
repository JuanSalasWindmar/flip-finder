/**
 * Filter dictionary — maps human-readable universal values
 * to platform-specific field names and values.
 *
 * Example: "apartment" in metroCuadrado is propertyTypeId "1",
 * but in fincaRaiz it's property_type_id [2].
 */

// ── Property Type ────────────────────────────────────────────
// metroCuadrado: 1 = Apartamento, 2 = Casa
// fincaRaiz:     2 = Apartamento, 1 = Casa
export const PROPERTY_TYPE = {
  apartment: { metroCuadrado: "1", fincaRaiz: 2 },
  house: { metroCuadrado: "2", fincaRaiz: 1 },
} as const

// ── Business Type ────────────────────────────────────────────
// metroCuadrado: 1 = Venta, 2 = Arriendo, 3 = Venta (proyectos?)
// fincaRaiz:     1 = Venta, 2 = Arriendo
export const BUSINESS_TYPE = {
  sale: { metroCuadrado: ["1", "3"], fincaRaiz: 1 },
  rent: { metroCuadrado: ["2"], fincaRaiz: 2 },
} as const

// ── Property Status ──────────────────────────────────────────
// metroCuadrado: text values "Usado", "Nuevo"
// fincaRaiz:     constStatesID  0 = Usado, 1 = Nuevo
export const PROPERTY_STATUS = {
  used: { metroCuadrado: "Usado", fincaRaiz: 0 },
  new: { metroCuadrado: "Nuevo", fincaRaiz: 1 },
  any: { metroCuadrado: null, fincaRaiz: null },
} as const

// ── Notes keywords ───────────────────────────────────────────
// Searched in property description/comments to generate notes
export const INTERESTING_CRITERIA = [
  "oportunidad",
  "motivo viaje",
  "hipoteca",
  "negociable",
  "precio fijo",
  "permuta",
  "duplex",
  "apto para estrenar",
  "altillo",
  "zonas sociales",
  "piscina",
  "cocina integral",
  "depósito",
  "chimenea",
  "patio",
  "cancha",
  "gym",
] as const
