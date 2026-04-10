import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface MarketingLayoutProps {
  children: ReactNode
  noFooter?: boolean
}

export function MarketingLayout({ children, noFooter }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {!noFooter && <Footer />}
    </div>
  )
}
