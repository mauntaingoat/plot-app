import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthListener } from '@/hooks/useAuth'
import { MapPin } from 'lucide-react'

const Home = lazy(() => import('@/pages/Home'))
const AgentProfile = lazy(() => import('@/pages/AgentProfile'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const PinCreate = lazy(() => import('@/pages/PinCreate'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-midnight flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-tangerine to-ember flex items-center justify-center mb-4"
      >
        <MapPin size={26} className="text-white" />
      </motion.div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-6 h-6 border-2 border-tangerine border-t-transparent rounded-full"
      />
    </div>
  )
}

function AppRoutes() {
  useAuthListener()

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/pin/new" element={<PinCreate />} />
      <Route path="/dashboard/pin/:id/edit" element={<PinCreate />} />
      <Route path="/:username" element={<AgentProfile />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
