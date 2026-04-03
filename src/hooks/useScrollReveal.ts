import { useEffect } from 'react'

// Single IntersectionObserver for all .reveal elements on the page.
// Runs once on mount. CSS handles the actual animation (GPU compositor thread).
// This is the same pattern used by Apple.com, Linear.app, Stripe.com, etc.

let observer: IntersectionObserver | null = null
let observed = new Set<Element>()

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer?.unobserve(entry.target) // Only animate once
            observed.delete(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
  }
  return observer
}

export function useScrollReveal() {
  useEffect(() => {
    const obs = getObserver()
    // Find all .reveal elements not yet observed
    const elements = document.querySelectorAll('.reveal, .reveal-fade, .reveal-scale')
    elements.forEach((el) => {
      if (!observed.has(el) && !el.classList.contains('in-view')) {
        obs.observe(el)
        observed.add(el)
      }
    })

    return () => {
      // Don't disconnect — other pages might still use it
    }
  })
}
