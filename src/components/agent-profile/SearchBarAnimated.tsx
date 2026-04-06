import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'

export function SearchBarAnimated() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')

  const particles = focused ? Array.from({ length: 12 }, (_, i) => (
    <motion.div
      key={i}
      initial={{ scale: 0 }}
      animate={{
        x: [0, (Math.random() - 0.5) * 30],
        y: [0, (Math.random() - 0.5) * 30],
        scale: [0, Math.random() * 0.6 + 0.3],
        opacity: [0, 0.7, 0],
      }}
      transition={{ duration: Math.random() * 1.5 + 1.5, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
      className="absolute w-2 h-2 rounded-full"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        background: `linear-gradient(135deg, #FF6B3D, #E8522A)`,
        filter: 'blur(2px)',
      }}
    />
  )) : null

  return (
    <motion.div
      className="relative"
      animate={{ scale: focused ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <motion.div
        className={`flex items-center rounded-2xl border relative overflow-hidden backdrop-blur-md ${
          focused ? 'border-tangerine/40 shadow-[0_0_24px_rgba(255,107,61,0.15)]' : 'border-white/10 bg-white/5'
        }`}
        animate={{
          boxShadow: focused ? '0 8px 32px rgba(255,107,61,0.12), 0 0 0 1px rgba(255,107,61,0.2)' : '0 0 0 rgba(0,0,0,0)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl -z-[1]">
          {particles}
        </div>

        {focused && (
          <motion.div
            className="absolute inset-0 -z-[2]"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 0.08,
              background: [
                'linear-gradient(90deg, #FF6B3D 0%, #E8522A 100%)',
                'linear-gradient(90deg, #F96C3E 0%, #FF6B3D 100%)',
                'linear-gradient(90deg, #E8522A 0%, #F96C3E 100%)',
                'linear-gradient(90deg, #FF6B3D 0%, #E8522A 100%)',
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {focused && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{
              opacity: [0, 0.06, 0.12, 0.06, 0],
              background: 'radial-gradient(circle at 50% 0%, rgba(255,107,61,0.4) 0%, transparent 70%)',
            }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: 'loop' }}
          />
        )}

        <motion.div className="pl-4 py-3 shrink-0" animate={{ scale: focused ? 1.15 : 1, rotate: focused ? [0, -5, 5, 0] : 0 }}
          transition={{ duration: 0.4 }}>
          <Search size={18} strokeWidth={focused ? 2.5 : 2} className={focused ? 'text-tangerine' : 'text-white/30'} />
        </motion.div>

        <input
          ref={inputRef}
          type="text"
          placeholder="Neighborhoods, cities, states..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="w-full py-3 pl-3 pr-4 bg-transparent outline-none text-[14px] text-white placeholder:text-white/25 font-medium relative z-10"
          autoFocus
        />
      </motion.div>
    </motion.div>
  )
}
