import { lazy, Suspense, useEffect, useLayoutEffect, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthListener } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { SimpleLoadingScreen } from '@/components/ui/LoadingScreen'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { AuthSheet } from '@/components/sheets/AuthSheet'
import { useAuthModalStore } from '@/stores/authModalStore'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { resetFirestore } from '@/config/firebase'

// Marketing + auth + lightweight pages are eagerly imported so they
// land in the main bundle — no Suspense fallback, no dark-flash
// loading screen on navigation. The dark SimpleLoadingScreen is meant
// to flow into the dashboard / agent profile, not the cream
// marketing site. Keeping Mapbox/Mux-heavy app pages lazy preserves
// chunk-splitting where it actually helps payload size.
import Home from '@/pages/Home'
import About from '@/pages/About'
import Pricing from '@/pages/Pricing'
import Blog from '@/pages/Blog'
import BlogPost from '@/pages/BlogPost'
import Glossary from '@/pages/Glossary'
import GlossaryTerm from '@/pages/GlossaryTerm'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import Welcome from '@/pages/Welcome'
import SignIn from '@/pages/SignIn'
import Verify from '@/pages/Verify'
import AuthAction from '@/pages/AuthAction'
import EmailPreview from '@/pages/EmailPreview'
import UnsubManage from '@/pages/UnsubManage'
import NotFound from '@/pages/NotFound'

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

// Heavy app surfaces stay lazy — Mapbox + Mux + dashboard chunks
// would balloon the main bundle. These routes flow into the dark
// SimpleLoadingScreen, which is the intended look for the app side.
const AgentProfile = lazy(() => import('@/pages/AgentProfile'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const PinCreate = lazy(() => import('@/pages/PinCreate'))
const ContentEdit = lazy(() => import('@/pages/ContentEdit'))
const SharedMap = lazy(() => import('@/pages/SharedMap'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  // useLayoutEffect (not useEffect) so the scroll reset happens BEFORE
  // the browser paints the new route and before any child useEffect
  // fires. Avoids a flicker on routes that read window.scrollY in their
  // own mount effect (e.g. Home.tsx's scroll-driven card animations) —
  // they'd otherwise see the previous page's scroll position and
  // animate to the "scrolled-far-down" state for one frame before this
  // hook resets it.
  useLayoutEffect(() => {
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

/** Gate any agent-only route on email verification. Signed-in users
 *  who haven't verified yet are bounced to /verify. Signed-out users
 *  pass through (the inner page handles their own auth requirement).
 *
 *  Also gates on userDoc being loaded for the current auth state.
 *  Without that gate, a fresh sign-in renders the dashboard for one
 *  frame with userDoc=null (the snapshot subscription hasn't resolved
 *  yet), which trips a Firestore SDK assertion during the transition
 *  and flashes the ErrorBoundary fallback before recovering. */
function RequireVerified({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const userDoc = useAuthStore((s) => s.userDoc)
  if (!initialized) return <SimpleLoadingScreen />
  if (firebaseUser && !firebaseUser.emailVerified) {
    return <Navigate to="/verify" replace />
  }
  if (firebaseUser && !userDoc) return <SimpleLoadingScreen />
  return <>{children}</>
}

function AppRoutes() {
  useAuthListener()

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/glossary/:slug" element={<GlossaryTerm />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/sign-up" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/auth/action" element={<AuthAction />} />
        <Route path="/dev/email-preview" element={<EmailPreview />} />
        <Route path="/u/:token" element={<UnsubManage />} />
        <Route path="/dashboard" element={<RequireVerified><Dashboard /></RequireVerified>} />
        <Route path="/dashboard/pin/new" element={<RequireVerified><PinCreate /></RequireVerified>} />
        <Route path="/dashboard/pin/:id/edit" element={<RequireVerified><PinCreate /></RequireVerified>} />
        <Route path="/dashboard/content/edit" element={<RequireVerified><ContentEdit /></RequireVerified>} />
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
