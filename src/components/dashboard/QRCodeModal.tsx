import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Copy, Check } from 'lucide-react'
import { generateQRCode, downloadQRCode } from '@/lib/qrcode'
import { DarkBottomSheet } from '@/components/ui/BottomSheet'
import { useScrollLock } from '@/hooks/useScrollLock'
import type { Pin, UserDoc } from '@/lib/types'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  pin: Pin | null
  agent: UserDoc | null
}

function useIsDesktop() {
  const [d, setD] = useState(typeof window !== 'undefined' && window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const h = (e: MediaQueryListEvent) => setD(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return d
}

function QRContent({ pin, agent, url, qrDataUrl, onClose }: {
  pin: Pin; agent: UserDoc; url: string; qrDataUrl: string; onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleDownload = () => {
    const filename = `reelst-${agent.username || 'agent'}-${pin.id}.png`
    downloadQRCode(url, filename)
  }

  return (
    <>
      <p className="text-[13px] text-smoke mb-1 truncate">{pin.address}</p>
      <p className="text-[11px] text-ash mb-4 truncate">{url}</p>
      <div className="bg-white rounded-[18px] p-6 border border-border-light mb-4 flex items-center justify-center">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="w-full max-w-[280px]" />
        ) : (
          <div className="w-full max-w-[280px] aspect-square bg-cream rounded-lg animate-pulse" />
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cream text-ink font-semibold text-[13px] cursor-pointer hover:bg-pearl transition-colors">
          {copied ? <Check size={14} className="text-sold-green" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button onClick={handleDownload}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-tangerine to-ember text-white font-semibold text-[13px] cursor-pointer hover:shadow-glow-tangerine transition-shadow">
          <Download size={14} /> Download PNG
        </button>
      </div>
      <p className="text-[11px] text-ash text-center mt-4">
        Print this QR on flyers, signs, and business cards.
      </p>
    </>
  )
}

export function QRCodeModal({ isOpen, onClose, pin, agent }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const isDesktop = useIsDesktop()
  useScrollLock(isOpen && isDesktop)

  const url = pin && agent ? `${window.location.origin}/${agent.username || agent.uid}?pin=${pin.id}` : ''

  useEffect(() => {
    if (!isOpen || !url) return
    generateQRCode(url, { size: 400 }).then(setQrDataUrl).catch(() => {})
  }, [isOpen, url])

  if (!pin || !agent) return null

  if (isDesktop) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/50" onClick={onClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-[calc(100vw-32px)] max-w-[400px] bg-warm-white rounded-[24px] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-[18px] font-extrabold text-ink tracking-tight">Listing QR Code</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-pearl transition-colors">
                  <X size={16} className="text-smoke" />
                </button>
              </div>
              <div className="px-6 pb-6">
                <QRContent pin={pin} agent={agent} url={url} qrDataUrl={qrDataUrl} onClose={onClose} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  // Mobile: bottom sheet
  return (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title="Listing QR Code">
      <div className="px-5 pb-8">
        <QRContent pin={pin} agent={agent} url={url} qrDataUrl={qrDataUrl} onClose={onClose} />
      </div>
    </DarkBottomSheet>
  )
}
