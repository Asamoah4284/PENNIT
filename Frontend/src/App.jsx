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
import LibraryPage from './pages/LibraryPage'
import ProfilePage from './pages/ProfilePage'
import StoriesPage from './pages/StoriesPage'
import StatsPage from './pages/StatsPage'
import WritersDashboardPage from './pages/WritersDashboardPage'

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
      <Route path="/library" element={<Layout />}>
        <Route index element={<LibraryPage />} />
      </Route>
      <Route path="/profile" element={<Layout />}>
        <Route index element={<ProfilePage />} />
      </Route>
      <Route path="/stories" element={<Layout />}>
        <Route index element={<StoriesPage />} />
      </Route>
      <Route path="/stats" element={<Layout />}>
        <Route index element={<StatsPage />} />
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
      <Route path="/writers-dashboard" element={<Layout />}>
        <Route index element={<WritersDashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
