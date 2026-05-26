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
import { isAdmin } from '@/lib/admin'
import { useIsMobileBrowser } from '@/hooks/useIsMobileBrowser'
import { MobileBlockPage } from '@/components/MobileBlockPage'

// Marketing + auth-entry pages are eagerly imported — no Suspense
// fallback, no dark-flash loading screen on navigation. The dark
// SimpleLoadingScreen is meant to flow into the dashboard / agent
// profile, not the cream marketing site. Keeping Mapbox/Mux-heavy
// app pages lazy preserves chunk-splitting where it helps payload.
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
import NotFound from '@/pages/NotFound'

// Lazy: off the critical path AND the Suspense fallback (the dark
// SimpleLoadingScreen) doesn't visually clash with the destination.
// EmailPreview is admin-only; UnsubManage is once per email recipient.
const EmailPreview = lazy(() => import('@/pages/EmailPreview'))
const UnsubManage = lazy(() => import('@/pages/UnsubManage'))
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'))

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
  const isMobile = useIsMobileBrowser()
  if (!initialized) return <SimpleLoadingScreen />
  if (firebaseUser && !firebaseUser.emailVerified) {
    return <Navigate to="/verify" replace />
  }
  if (firebaseUser && !userDoc) return <SimpleLoadingScreen />
  // Mobile-browser dashboard block — the dashboard is desktop-only
  // for now (native iOS app is the path for phones). Public profiles,
  // marketing, and auth screens for SIGNED-OUT visitors still work
  // on mobile; this gate fires only after the auth listener proves
  // there's a real session.
  if (firebaseUser && isMobile) return <MobileBlockPage />
  return <>{children}</>
}

/** Gate for sign-in/sign-up/welcome on mobile when already signed
 *  in: the agent shouldn't be re-auth'ing on a phone — push them
 *  to the desktop dashboard message instead. Visitors who aren't
 *  signed in keep full access to the auth screens on mobile so they
 *  can actually create their account from a phone (then we tell
 *  them to switch to desktop after). */
function MobileAuthGuard({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const isMobile = useIsMobileBrowser()
  if (!initialized) return <>{children}</>
  if (firebaseUser && isMobile) return <MobileBlockPage />
  return <>{children}</>
}

/** Gates dev/internal routes (email preview etc) behind the admin
 *  custom claim. Renders NotFound rather than redirecting so the
 *  route appears not to exist for non-admins. */
function RequireAdmin({ children }: { children: ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized)
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  if (!initialized) return <SimpleLoadingScreen />
  if (!firebaseUser || !isAdmin()) return <NotFound />
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
        <Route path="/sign-up" element={<MobileAuthGuard><Welcome /></MobileAuthGuard>} />
        <Route path="/welcome" element={<MobileAuthGuard><Welcome /></MobileAuthGuard>} />
        <Route path="/sign-in" element={<MobileAuthGuard><SignIn /></MobileAuthGuard>} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/auth/action" element={<AuthAction />} />
        <Route path="/dev/email-preview" element={<RequireAdmin><EmailPreview /></RequireAdmin>} />
        <Route path="/u/:token" element={<UnsubManage />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
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
