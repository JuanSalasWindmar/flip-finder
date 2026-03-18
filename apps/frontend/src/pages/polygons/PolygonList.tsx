import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { polygonsApi } from "../../services/polygons"
import type { Polygon } from "../../types/polygon"

export default function PolygonList() {
  const [polygons, setPolygons] = useState<Polygon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    polygonsApi
      .getAll()
      .then(setPolygons)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleEnabled = async (polygon: Polygon) => {
    try {
      const updated = await polygonsApi.update(polygon.id, { enabled: !polygon.enabled })
      setPolygons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update polygon")
    }
  }

  if (loading) return <p>Loading polygons...</p>
  if (error) return <p className="error">Error: {error}</p>

  return (
    <div>
      <div className="page-header">
        <h1>Polygons</h1>
      </div>

      {polygons.length === 0 ? (
        <p>No polygons found.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>City</th>
              <th>Type</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {polygons.map((polygon) => (
              <tr key={polygon.id}>
                <td>
                  <Link to={`/polygons/${polygon.id}`}>{polygon.name}</Link>
                </td>
                <td>{polygon.city}</td>
                <td>
                  <span className={`badge badge-${polygon.polygon_type.toLowerCase()}`}>{polygon.polygon_type}</span>
                </td>
                <td>
                  <button
                    className={`toggle ${polygon.enabled ? "toggle-on" : "toggle-off"}`}
                    onClick={() => toggleEnabled(polygon)}
                  >
                    {polygon.enabled ? "ON" : "OFF"}
                  </button>
                </td>
                <td>
                  <Link to={`/polygons/${polygon.id}`} className="btn btn-secondary btn-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
