import type { Polygon, CreatePolygonPayload, UpdatePolygonPayload } from "../types/polygon"

const BASE = "/api/polygons"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return res.json()
}

export const polygonsApi = {
  getAll: () => request<Polygon[]>(BASE),

  getOne: (id: string) => request<Polygon>(`${BASE}/${id}`),

  create: (data: CreatePolygonPayload) =>
    request<Polygon>(BASE, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdatePolygonPayload) =>
    request<Polygon>(`${BASE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<{ deleted: boolean }>(`${BASE}/${id}`, {
      method: "DELETE",
    }),
}
