import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, TrendingUp } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'
import { MOCK_AGENTS } from '@/lib/mock'

const CITIES = [
  { name: 'Miami', state: 'FL', agents: 128, image: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=400&h=300&fit=crop' },
  { name: 'Los Angeles', state: 'CA', agents: 94, image: 'https://images.unsplash.com/photo-1515896769750-31548aa180ed?w=400&h=300&fit=crop' },
  { name: 'New York', state: 'NY', agents: 156, image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop' },
  { name: 'Austin', state: 'TX', agents: 67, image: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=400&h=300&fit=crop' },
  { name: 'San Francisco', state: 'CA', agents: 82, image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop' },
  { name: 'Chicago', state: 'IL', agents: 73, image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&h=300&fit=crop' },
]

export default function Explore() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = MOCK_AGENTS.filter((a) =>
    a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.bio.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <MarketingLayout>
      <SEOHead title="Explore" description="Discover real estate agents in your neighborhood. Browse by city, search by name, and explore interactive map profiles." path="/explore" />

      {/* Hero + Search */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-[28px] md:text-[44px] font-extrabold text-ink tracking-tight mb-3">
            Explore agents near you
          </h1>
          <p className="text-[15px] md:text-[17px] text-smoke max-w-[440px] mx-auto">
            Discover agents, browse listings, and explore neighborhoods — all on the map.
          </p>
        </motion.div>

        {/* Search bar */}
        <div className="max-w-[560px] mx-auto relative mb-12">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ash" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by agent, city, or neighborhood..."
            className="w-full h-12 md:h-14 rounded-[16px] bg-cream border border-border-light pl-11 pr-4 text-[15px] text-ink placeholder:text-ash outline-none focus:border-tangerine/40 transition-colors"
          />
        </div>
      </section>

      {/* Browse by City */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-8 pb-16 md:pb-24">
        <div className="flex items-center gap-2 mb-6">
          <MapPin size={18} className="text-tangerine" />
          <h2 className="text-[20px] md:text-[24px] font-extrabold text-ink tracking-tight">Browse by city</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {CITIES.map((city, i) => (
            <motion.button
              key={city.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-[20px] overflow-hidden aspect-[4/3] cursor-pointer group"
            >
              <img src={city.image} alt={city.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-[16px] md:text-[18px] font-bold text-white">{city.name}, {city.state}</p>
                <p className="text-[12px] text-white/70">{city.agents} agents</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Trending Agents */}
      <section className="bg-cream/50 border-y border-border-light">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-tangerine" />
            <h2 className="text-[20px] md:text-[24px] font-extrabold text-ink tracking-tight">Trending agents</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filteredAgents.map((agent, i) => (
              <motion.button
                key={agent.uid}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/${agent.username}`)}
                className="bg-white rounded-[20px] p-5 flex items-center gap-4 text-left cursor-pointer hover:shadow-md transition-shadow border border-border-light"
              >
                <Avatar src={agent.photoURL} name={agent.displayName} size={56} ring="story" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-ink truncate">{agent.displayName}</p>
                  <p className="text-[12px] text-tangerine font-medium">@{agent.username}</p>
                  <p className="text-[12px] text-smoke mt-0.5 line-clamp-1">{agent.bio}</p>
                  <p className="text-[11px] text-ash mt-1">{agent.followerCount.toLocaleString()} followers · {agent.brokerage}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}
