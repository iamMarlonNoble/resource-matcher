import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Upload from './pages/Upload'
import Demands from './pages/Demands'
import MatchPage from './pages/MatchPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/demands" element={<Demands />} />
        <Route path="/demands/:rrdNumber" element={<MatchPage />} />
      </Routes>
    </BrowserRouter>
  )
}
