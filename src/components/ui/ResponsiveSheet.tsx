import { type ReactNode } from 'react'
import { BottomSheet, DarkBottomSheet } from './BottomSheet'
import { SidePanel, LightSidePanel } from './SidePanel'

interface ResponsiveSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullHeight?: boolean
  className?: string
  dark?: boolean
}

const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 768

// Auto-switches between BottomSheet (mobile) and SidePanel (desktop)
export function ResponsiveSheet({ isOpen, onClose, children, title, fullHeight, className, dark }: ResponsiveSheetProps) {
  if (isDesktop()) {
    return dark ? (
      <SidePanel isOpen={isOpen} onClose={onClose} title={title} className={className}>{children}</SidePanel>
    ) : (
      <LightSidePanel isOpen={isOpen} onClose={onClose} title={title} className={className}>{children}</LightSidePanel>
    )
  }

  return dark ? (
    <DarkBottomSheet isOpen={isOpen} onClose={onClose} title={title} fullHeight={fullHeight} className={className}>{children}</DarkBottomSheet>
  ) : (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} fullHeight={fullHeight} className={className}>{children}</BottomSheet>
  )
}
