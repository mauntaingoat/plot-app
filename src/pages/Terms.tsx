import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'

export default function Terms() {
  return (
    <MarketingLayout>
      <SEOHead title="Terms of Use" path="/terms" />
      <div className="max-w-[720px] mx-auto px-5 md:px-8 py-12 md:py-20">
        <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Terms of Use</h1>
        <p className="text-[13px] text-smoke mb-10">Effective: April 1, 2026 · Last updated: April 1, 2026</p>

        <div className="prose-reeltor space-y-8">
          <section>
            <h2>1. Agreement to Terms</h2>
            <p>By accessing or using Reelst ("Service"), operated by Avigage LLC DBA Reelst ("we," "us," "our"), you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>Reelst is a map-based profile platform for real estate agents ("Agents") and consumers ("Users"). Agents create public profiles with interactive maps containing listings, stories, reels, live streams, and open house pins tied to real addresses. Users browse, follow, save, and interact with Agent content.</p>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to create an Agent account. You may not use another person's account without permission.</p>
          </section>

          <section>
            <h2>4. Agent Responsibilities</h2>
            <p>Agents are solely responsible for the accuracy of listing data, pricing, property details, and media content posted through the Service. Agents must comply with all applicable real estate laws, regulations, and licensing requirements in their jurisdiction. Misrepresentation of listings, credentials, or licensing status is grounds for immediate account termination.</p>
          </section>

          <section>
            <h2>5. Content Ownership & License</h2>
            <p>You retain ownership of content you post to Reelst. By posting content, you grant Reelst a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content in connection with the Service. You represent that you have the right to grant this license for all content you post.</p>
          </section>

          <section>
            <h2>6. Prohibited Conduct</h2>
            <p>You may not: post false or misleading listing information; harass, threaten, or impersonate other users; upload malicious code or spam; scrape or data-mine the Service; circumvent security measures; use the Service for any unlawful purpose; or violate any applicable laws or regulations.</p>
          </section>

          <section>
            <h2>7. Subscriptions & Billing</h2>
            <p>Reelst offers free and paid subscription tiers. Paid subscriptions are billed monthly. You may cancel at any time; cancellation takes effect at the end of the current billing period. We reserve the right to change pricing with 30 days' notice. Refunds are handled on a case-by-case basis.</p>
          </section>

          <section>
            <h2>8. Termination</h2>
            <p>We may suspend or terminate your account at any time for violation of these Terms or for any reason at our discretion. Upon termination, your right to use the Service ceases immediately. We may retain your data as required by law.</p>
          </section>

          <section>
            <h2>9. Disclaimer of Warranties</h2>
            <p>The Service is provided "as is" without warranties of any kind, express or implied. We do not guarantee the accuracy of listing data, the availability of the Service, or the results obtained from using the Service.</p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Avigage LLC DBA Reelst shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2>11. Changes to Terms</h2>
            <p>We may update these Terms at any time. We will notify users of material changes via email or in-app notice. Continued use of the Service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:hello@reelst.co" className="text-tangerine hover:underline">hello@reelst.co</a>.</p>
          </section>
        </div>
      </div>
    </MarketingLayout>
  )
}
