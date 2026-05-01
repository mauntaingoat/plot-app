import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MapPin } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-midnight flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10, stiffness: 150 }}
        className="w-20 h-20 rounded-[22px] bg-charcoal flex items-center justify-center mb-6"
      >
        <MapPin size={36} className="text-ghost" />
      </motion.div>
      <h1 className="text-[28px] font-extrabold text-white tracking-tight mb-2">Lost on the map</h1>
      <p className="text-[15px] text-ghost mb-8">This page doesn't exist. Let's get you back.</p>
      <Button variant="primary" size="xl" onClick={() => navigate('/')}>
        Go home
      </Button>
    </div>
  )
}
