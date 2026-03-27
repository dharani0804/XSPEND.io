import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './pages/Navbar'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Chat from './pages/Chat'
import Goals from './pages/Goals'

function AppLayout({ children }) {
  return (
    <div style={{ background:'#0a0a0f', minHeight:'100vh' }}>
      <Navbar />
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<Landing />} />

        {/* Onboarding — always accessible, no gate */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* App — no onboarding gate, always accessible */}
        <Route path="/app" element={<Navigate to="/app/upload" replace />} />
        <Route path="/app/upload" element={<AppLayout><Upload /></AppLayout>} />
        <Route path="/app/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/app/chat" element={<AppLayout><Chat /></AppLayout>} />
        <Route path="/app/goals" element={<AppLayout><Goals /></AppLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
