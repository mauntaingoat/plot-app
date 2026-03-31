// Shared Framer Motion configs for consistent spring physics

export const springSheet = {
  type: 'spring' as const,
  damping: 28,
  stiffness: 300,
}

export const springSnappy = {
  type: 'spring' as const,
  damping: 22,
  stiffness: 400,
}

export const springBouncy = {
  type: 'spring' as const,
  damping: 15,
  stiffness: 200,
}

export const springGentle = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 180,
}

export const staggerChildren = {
  staggerChildren: 0.04,
  delayChildren: 0.1,
}

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: springSnappy,
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: springSnappy,
}

export const slideUp = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: springSheet,
}

export const tapScale = {
  whileTap: { scale: 0.96 },
  transition: { type: 'spring', damping: 15, stiffness: 400 },
}
