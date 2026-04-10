import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  icon: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  centerAction?: {
    icon: ReactNode
    onClick: () => void
  }
  dark?: boolean
}

export function TabBar({ tabs, active, onChange, centerAction, dark }: TabBarProps) {
  const midIndex = Math.floor(tabs.length / 2)
  const leftTabs = tabs.slice(0, midIndex)
  const rightTabs = tabs.slice(midIndex)

  const renderTab = (tab: Tab) => (
    <motion.button
      key={tab.id}
      whileTap={{ scale: 0.88 }}
      onClick={() => onChange(tab.id)}
      className={`
        flex flex-col items-center gap-0.5 pt-2 pb-1 px-3
        transition-colors duration-150 cursor-pointer select-none min-w-[56px]
        ${active === tab.id
          ? 'text-tangerine'
          : dark ? 'text-ghost' : 'text-ash'
        }
      `}
    >
      <span className="w-6 h-6 flex items-center justify-center">{tab.icon}</span>
      <span className="text-[10px] font-semibold">{tab.label}</span>
      {active === tab.id && (
        <motion.div
          layoutId="tab-indicator"
          className="w-5 h-[3px] rounded-full bg-tangerine mt-0.5"
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        />
      )}
    </motion.button>
  )

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-[80]
        flex items-end justify-around
        pb-[env(safe-area-inset-bottom,8px)]
        border-t
        ${dark
          ? 'bg-midnight/95 backdrop-blur-xl border-border-dark'
          : 'bg-ivory/95 backdrop-blur-xl border-border-light'
        }
      `}
    >
      {leftTabs.map(renderTab)}

      {centerAction && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          onClick={centerAction.onClick}
          className="
            -mt-5 w-[52px] h-[52px] rounded-[16px]
            bg-gradient-to-br from-tangerine to-ember
            text-white shadow-glow-tangerine
            flex items-center justify-center cursor-pointer
          "
        >
          {centerAction.icon}
        </motion.button>
      )}

      {rightTabs.map(renderTab)}
    </div>
  )
}
