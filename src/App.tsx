import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import VKAuth from './components/vkAuth'
import VKCallback from './components/VKCallback'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VKCallback />} />
        <Route path="/auth" element={<VKAuth />} />
      </Routes>
    </Router>
  )
}

export default App