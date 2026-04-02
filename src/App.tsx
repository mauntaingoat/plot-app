import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useAuthListener } from '@/hooks/useAuth'
import { SimpleLoadingScreen } from '@/components/ui/LoadingScreen'

const Home = lazy(() => import('@/pages/Home'))
const ForAgents = lazy(() => import('@/pages/ForAgents'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Explore = lazy(() => import('@/pages/Explore'))
const About = lazy(() => import('@/pages/About'))
const Terms = lazy(() => import('@/pages/Terms'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const SignUp = lazy(() => import('@/pages/SignUp'))
const SignIn = lazy(() => import('@/pages/SignIn'))
const AgentProfile = lazy(() => import('@/pages/AgentProfile'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const PinCreate = lazy(() => import('@/pages/PinCreate'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// App-level fallback uses simple loading screen

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])
  return null
}

function AppRoutes() {
  useAuthListener()

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Marketing pages */}
        <Route path="/" element={<Home />} />
        <Route path="/for-agents" element={<ForAgents />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/about" element={<About />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Auth pages */}
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/sign-in" element={<SignIn />} />

        {/* App pages */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/pin/new" element={<PinCreate />} />
        <Route path="/dashboard/pin/:id/edit" element={<PinCreate />} />

        {/* Agent profile — must be last (catches /:username) */}
        <Route path="/:username" element={<AgentProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<SimpleLoadingScreen />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
