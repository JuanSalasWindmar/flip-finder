import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import PolygonList from "./pages/polygons/PolygonList"
import PolygonDetail from "./pages/polygons/PolygonDetail"
import "./App.css"

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <h2>Flip Finder</h2>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/polygons" replace />} />
            <Route path="/polygons" element={<PolygonList />} />
            <Route path="/polygons/:id" element={<PolygonDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
