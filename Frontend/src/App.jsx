import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ReaderPage from './pages/ReaderPage'
import ReadingPage from './pages/ReadingPage'
import AuthorPage from './pages/AuthorPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <Routes>
      {/* Landing page - no layout */}
      <Route path="/" element={<LandingPage />} />

      {/* Main app with layout */}
      <Route path="/home" element={<Layout />}>
        <Route index element={<HomePage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reader" element={<Layout />}>
        <Route index element={<ReaderPage />} />
      </Route>
      <Route path="/reading/:id" element={<Layout />}>
        <Route index element={<ReadingPage />} />
      </Route>
      <Route path="/author/:id" element={<Layout />}>
        <Route index element={<AuthorPage />} />
      </Route>
      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
