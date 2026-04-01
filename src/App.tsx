import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthListener } from '@/hooks/useAuth'

const Home = lazy(() => import('@/pages/Home'))
const ForAgents = lazy(() => import('@/pages/ForAgents'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Explore = lazy(() => import('@/pages/Explore'))
const About = lazy(() => import('@/pages/About'))
const Terms = lazy(() => import('@/pages/Terms'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const AgentProfile = lazy(() => import('@/pages/AgentProfile'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const PinCreate = lazy(() => import('@/pages/PinCreate'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="mb-4"
      >
        <img src="/reeltor-logo-4b.png" alt="Reeltor" className="w-14 h-14" />
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-6 h-6 border-2 border-tangerine border-t-transparent rounded-full"
      />
    </div>
  )
}

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
      <Suspense fallback={<LoadingScreen />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
