import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Lenis from 'lenis'
import { useAuthListener } from '@/hooks/useAuth'
import { SimpleLoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { useAuthModalStore } from '@/stores/authModalStore'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { resetFirestore } from '@/config/firebase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const Home = lazy(() => import('@/pages/Home'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Terms = lazy(() => import('@/pages/Terms'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const SignUp = lazy(() => import('@/pages/SignUp'))
const Welcome = lazy(() => import('@/pages/Welcome'))
const SignIn = lazy(() => import('@/pages/SignIn'))
const AgentProfile = lazy(() => import('@/pages/AgentProfile'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const PinCreate = lazy(() => import('@/pages/PinCreate'))
const ContentEdit = lazy(() => import('@/pages/ContentEdit'))
const SharedMap = lazy(() => import('@/pages/SharedMap'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // Defer: target may not be mounted yet when route first renders.
      const id = hash.slice(1)
      requestAnimationFrame(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, hash])
  return null
}

// Heavy-dampened smooth scroll on the marketing pages only.
// `wheelMultiplier: 0.55` caps input speed so aggressive wheel flicks
// don't fling the page. `lerp: 0.06` makes the page lazily follow.
const MARKETING_ROUTES = ['/', '/pricing', '/terms', '/privacy']

function SmoothScroll() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!MARKETING_ROUTES.includes(pathname)) return
    const lenis = new Lenis({
      lerp: 0.06,
      wheelMultiplier: 0.55,
      touchMultiplier: 1.1,
      smoothWheel: true,
      syncTouch: false,
    })
    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [pathname])
  return null
}

// Global auth modal — works on any page
function GlobalAuthModal() {
  const { isOpen, mode, close } = useAuthModalStore()
  return <AuthSheet isOpen={isOpen} onClose={close} mode={mode} />
}

// Suppress Firestore internal assertion errors that leak as unhandled
// promise rejections during rapid navigation. These are a Firebase SDK
// bug, not an app error — the SDK recovers on the next operation.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes?.('INTERNAL ASSERTION FAILED')) {
      e.preventDefault()
      console.warn('[Firestore] suppressed internal assertion — resetting SDK')
      resetFirestore()
    }
  })
  window.addEventListener('error', (e) => {
    if (e.message?.includes?.('INTERNAL ASSERTION FAILED')) {
      e.preventDefault()
      console.warn('[Firestore] suppressed internal assertion — resetting SDK')
      resetFirestore()
    }
  })
}

function AppRoutes() {
  useAuthListener()

  return (
    <>
      <ScrollToTop />
      <SmoothScroll />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/sign-up" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/pin/new" element={<PinCreate />} />
        <Route path="/dashboard/pin/:id/edit" element={<PinCreate />} />
        <Route path="/dashboard/content/edit" element={<ContentEdit />} />
        <Route path="/saved/:shareId" element={<SharedMap />} />
        <Route path="/:username" element={<AgentProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GlobalAuthModal />
      <OfflineBanner />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary label="App">
          <Suspense fallback={<SimpleLoadingScreen />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
