import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import VKAuth from './components/vkAuth'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VKAuth />} />
      </Routes>
    </Router>
  )
}

export default App