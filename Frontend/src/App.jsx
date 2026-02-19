import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { getUser } from './lib/auth'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ReaderPage from './pages/ReaderPage'
import ReadingPage from './pages/ReadingPage'
import AuthorPage from './pages/AuthorPage'
import LibraryPage from './pages/LibraryPage'
import ProfilePage from './pages/ProfilePage'
import StoriesPage from './pages/StoriesPage'
import StatsPage from './pages/StatsPage'
import WritersDashboardPage from './pages/WritersDashboardPage'
import WriterStoryPage from './pages/WriterStoryPage'
import WriterNewStoryPage from './pages/WriterNewStoryPage'
import WriterStoryAnalyticsPage from './pages/WriterStoryAnalyticsPage'
import PricingPage from './pages/PricingPage'

/** Readers only: writers are redirected to writers-dashboard */
function RequireReader({ children }) {
  const user = getUser()
  if (user?.role === 'writer') return <Navigate to="/writers-dashboard" replace />
  return children
}

/** Writers only: readers are redirected to reader home */
function RequireWriter({ children }) {
  const user = getUser()
  if (user && user.role !== 'writer') return <Navigate to="/reader" replace />
  return children
}

function App() {
  return (
    <Routes>
      {/* Landing page - no layout */}
      <Route path="/" element={<LandingPage />} />

      {/* Reader-only routes */}
      <Route path="/home" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<HomePage />} />
      </Route>
      <Route path="/login" element={<LoginRedirect />} />
      <Route path="/signup" element={<SignupRedirect />} />
      <Route path="/reader" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<ReaderPage />} />
      </Route>
      <Route path="/library" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<LibraryPage />} />
      </Route>
      <Route path="/profile" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<ProfilePage />} />
      </Route>
      <Route path="/stories" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<StoriesPage />} />
      </Route>
      <Route path="/stats" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<StatsPage />} />
      </Route>
      <Route path="/reading/:id" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<ReadingPage />} />
      </Route>
      <Route path="/author/:id" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<AuthorPage />} />
      </Route>
      <Route path="/pricing" element={<RequireReader><Layout /></RequireReader>}>
        <Route index element={<PricingPage />} />
      </Route>
      {/* Writer-only routes */}
      <Route path="/dashboard" element={<Navigate to="/writers-dashboard" replace />} />
      <Route path="/writers-dashboard" element={<RequireWriter><Layout /></RequireWriter>}>
        <Route index element={<WritersDashboardPage />} />
        <Route path="new" element={<WriterNewStoryPage />} />
        <Route path="story/:id/analytics" element={<WriterStoryAnalyticsPage />} />
        <Route path="story/:id" element={<WriterStoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/** Redirect /signup and /signup?role=writer to landing with signup popup */
function SignupRedirect() {
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role')
  const to = role === 'writer' ? '/?signup=writer' : '/?signup=1'
  return <Navigate to={to} replace />
}

/** Redirect /login to landing with signin popup (no dedicated login page) */
function LoginRedirect() {
  return <Navigate to="/?signin=1" replace />
}

export default App
