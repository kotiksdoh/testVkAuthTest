import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import VKAuth from './components/vkAuth'
import VKCallback from './components/VKCallback'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VKAuth />} />
        <Route path="/vk-callback" element={<VKCallback />} />
      </Routes>
    </Router>
  )
}

export default App