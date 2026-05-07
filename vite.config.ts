import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    allowedHosts: ['mauricios-macbook-air.local'],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  build: {
    // Mapbox GL is ~1.7MB minified — it's a single monolith with no
    // deeper splitting available. Threshold sits above it so legitimate
    // bloat in OTHER chunks still triggers the warning.
    chunkSizeWarningLimit: 1800,
    // Split heavy vendor libs into their own chunks so the main bundle
    // stays small and rarely-changing libraries can be cached across
    // deploys. Each chunk loads only on routes that need it (Mapbox
    // doesn't ship to /sign-in, Three doesn't ship to /dashboard, etc.).
    rolldownOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          // Mapbox + map clustering helpers — biggest single dep.
          if (/[\\/]node_modules[\\/](mapbox-gl|supercluster|ngeohash)[\\/]/.test(id)) return 'mapbox'
          // Firebase SDK (auth + firestore + storage + functions).
          if (/[\\/]node_modules[\\/]@?firebase[\\/]/.test(id)) return 'firebase'
          // Three.js + cobe (globe). Only loaded by marketing pages.
          if (/[\\/]node_modules[\\/](three|cobe)[\\/]/.test(id)) return 'three'
          // Animation stack — gsap + lenis (marketing) and motion (app).
          if (/[\\/]node_modules[\\/](gsap|lenis)[\\/]/.test(id)) return 'gsap'
          if (/[\\/]node_modules[\\/](framer-motion|motion)[\\/]/.test(id)) return 'motion'
          // Markdown rendering — only used for blog posts + admin notes.
          if (/[\\/]node_modules[\\/](react-markdown|remark-.*|micromark.*|mdast-.*|unified|unist-.*|hast-.*)[\\/]/.test(id)) return 'markdown'
          // FFmpeg WASM + util — content-create only.
          if (/[\\/]node_modules[\\/]@ffmpeg[\\/]/.test(id)) return 'ffmpeg'
          // QR + workbox — small but standalone surfaces.
          if (/[\\/]node_modules[\\/](qrcode|workbox-.*)[\\/]/.test(id)) return 'utils'
          // Everything else (React, Router, Tanstack, Zustand, Phosphor)
          // stays in the default vendor chunk.
          return undefined
        },
      },
    },
  },
})
