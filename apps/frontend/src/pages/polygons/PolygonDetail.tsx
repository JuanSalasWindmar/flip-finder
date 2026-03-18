import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { polygonsApi } from "../../services/polygons"
import PolygonMap from "../../components/PolygonMap"
import ConfirmModal from "../../components/ConfirmModal"
import type { Polygon } from "../../types/polygon"

export default function PolygonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [polygon, setPolygon] = useState<Polygon | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [paramsText, setParamsText] = useState("")
  const [paramsError, setParamsError] = useState<string | null>(null)
  const [paramsSaved, setParamsSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    polygonsApi
      .getOne(id)
      .then((data) => {
        setPolygon(data)
        setParamsText(data.params ? JSON.stringify(data.params, null, 2) : "")
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const toggleEnabled = async () => {
    if (!polygon) return
    try {
      const updated = await polygonsApi.update(polygon.id, { enabled: !polygon.enabled })
      setPolygon(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    }
  }

  const saveParams = async () => {
    if (!polygon) return
    setParamsError(null)
    setParamsSaved(false)

    let parsed: Record<string, unknown> | null = null
    if (paramsText.trim()) {
      try {
        parsed = JSON.parse(paramsText)
      } catch {
        setParamsError("Invalid JSON")
        return
      }
    }

    try {
      const updated = await polygonsApi.update(polygon.id, { params: parsed })
      setPolygon(updated)
      setParamsSaved(true)
      setTimeout(() => setParamsSaved(false), 2000)
    } catch (err) {
      setParamsError(err instanceof Error ? err.message : "Failed to save")
    }
  }

  const handleDelete = async () => {
    if (!polygon) return
    try {
      await polygonsApi.remove(polygon.id)
      navigate("/polygons")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
      setShowDeleteModal(false)
    }
  }

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">Error: {error}</p>
  if (!polygon) return <p>Polygon not found.</p>

  return (
    <div>
      <div className="page-header">
        <h1>{polygon.name}</h1>
        <button className="btn btn-secondary" onClick={() => navigate("/polygons")}>
          Back
        </button>
      </div>

      <div className="detail-grid">
        <div className="detail-info">
          <table className="table info-table">
            <tbody>
              <tr>
                <th>City</th>
                <td>{polygon.city}</td>
              </tr>
              <tr>
                <th>Type</th>
                <td>
                  <span className={`badge badge-${polygon.polygon_type.toLowerCase()}`}>{polygon.polygon_type}</span>
                </td>
              </tr>
              <tr>
                <th>Enabled</th>
                <td>
                  <button
                    className={`toggle ${polygon.enabled ? "toggle-on" : "toggle-off"}`}
                    onClick={toggleEnabled}
                  >
                    {polygon.enabled ? "ON" : "OFF"}
                  </button>
                </td>
              </tr>
              <tr>
                <th>Created</th>
                <td>{new Date(polygon.created_at).toLocaleString()}</td>
              </tr>
              <tr>
                <th>Updated</th>
                <td>{new Date(polygon.updated_at).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {polygon.polygon_type === "ANALYZE" && (
            <div className="params-editor">
              <h3>Params</h3>
              <textarea
                className="json-editor"
                value={paramsText}
                onChange={(e) => {
                  setParamsText(e.target.value)
                  setParamsError(null)
                  setParamsSaved(false)
                }}
                rows={10}
                spellCheck={false}
              />
              {paramsError && <p className="error">{paramsError}</p>}
              {paramsSaved && <p className="success">Saved</p>}
              <button className="btn btn-primary" onClick={saveParams}>
                Save params
              </button>
            </div>
          )}

          <div className="detail-actions">
            <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
              Delete polygon
            </button>
          </div>
        </div>

        <div className="detail-map">
          <PolygonMap georeference={polygon.georeference} />
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          message={`Are you sure you want to delete "${polygon.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
