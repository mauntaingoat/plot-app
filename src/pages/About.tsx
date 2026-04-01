import { motion } from 'framer-motion'
import { MapPin, Zap, Heart } from 'lucide-react'
import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'

export default function About() {
  return (
    <MarketingLayout>
      <SEOHead title="About" description="Reeltor is building the modern real estate agent's profile — a live, interactive map where listings come alive." path="/about" />

      <div className="max-w-[1200px] mx-auto px-5 md:px-8 py-16 md:py-28">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
          <h1 className="text-[32px] md:text-[52px] font-extrabold text-ink tracking-tight leading-[1.1] mb-5 max-w-[600px] mx-auto">
            Real estate is local.{' '}
            <span className="text-gradient">Your profile should be too.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-smoke max-w-[520px] mx-auto leading-relaxed">
            We're building the modern agent's profile — one that lives on a map, plays like TikTok, and shares like Linktree. Because listings deserve more than a photo carousel.
          </p>
        </motion.div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-20">
          {[
            { icon: MapPin, title: 'Location-First', desc: 'Every piece of content is pinned to a real address. Real estate is about place — your profile should reflect that.' },
            { icon: Zap, title: 'Content-Native', desc: 'Reels, stories, live streams, and photos — not just MLS data dumps. Built for how agents actually create content today.' },
            { icon: Heart, title: 'Agent-Centric', desc: 'Your audience, your brand, your data. Reeltor is a tool for agents, not a marketplace that competes with you.' },
          ].map((value, i) => {
            const Icon = value.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-cream rounded-[24px] p-7 md:p-8"
              >
                <div className="w-12 h-12 rounded-[14px] bg-tangerine/10 flex items-center justify-center mb-5">
                  <Icon size={22} className="text-tangerine" />
                </div>
                <h3 className="text-[18px] md:text-[20px] font-bold text-ink mb-2">{value.title}</h3>
                <p className="text-[14px] md:text-[15px] text-smoke leading-relaxed">{value.desc}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Story */}
        <div className="max-w-[640px] mx-auto text-center mb-20">
          <h2 className="text-[24px] md:text-[32px] font-extrabold text-ink tracking-tight mb-5">Our story</h2>
          <div className="space-y-4 text-[15px] md:text-[16px] text-smoke leading-relaxed text-left">
            <p>
              Reeltor started with a simple observation: real estate agents create incredible content — neighborhood tours, listing walkthroughs, market updates, open house streams — but it all gets buried in social media feeds within hours.
            </p>
            <p>
              Meanwhile, consumers searching for homes are stuck scrolling through sterile MLS listings with no sense of the neighborhood, the agent's personality, or the story behind each property.
            </p>
            <p>
              We built Reeltor to bridge that gap. One link that opens an interactive map where every piece of an agent's content lives at the address it belongs to. Consumers don't just browse listings — they explore neighborhoods through the eyes of a local expert.
            </p>
            <p>
              We're based in Miami, built by a small team that believes the best technology feels invisible. Reeltor should feel like opening a map, not using software.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-cream rounded-[24px] p-8 md:p-12 max-w-[500px] mx-auto">
          <h3 className="text-[20px] font-bold text-ink mb-2">Get in touch</h3>
          <p className="text-[14px] text-smoke mb-4">Questions, partnerships, or just want to say hi.</p>
          <a href="mailto:hello@reeltor.co" className="text-[15px] text-tangerine font-semibold hover:underline">
            hello@reeltor.co
          </a>
          <p className="text-[12px] text-ash mt-4">Avigage LLC DBA Reeltor · Miami, FL</p>
        </div>
      </div>
    </MarketingLayout>
  )
}
