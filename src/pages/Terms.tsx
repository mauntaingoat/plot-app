import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'

export default function Terms() {
  return (
    <MarketingLayout>
      <SEOHead title="Terms of Use" path="/terms" />

      <div className="bg-marketing">
        <div className="max-w-[760px] mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-24 md:pb-32">
          <h1
            className="text-ink mb-3"
            style={{
              fontFamily: 'var(--font-humanist)',
              fontSize: 'clamp(2.25rem, 4.4vw, 3.75rem)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 0.98,
            }}
          >
            The fine print.
            <br />
            <span className="brand-grad-text" style={{ fontWeight: 600 }}>
              Plain English.
            </span>
          </h1>
          <p
            className="text-smoke mb-12"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Effective April 1, 2026 · Last updated April 1, 2026
          </p>

          <div className="prose-reeltor space-y-9">
            <section>
              <h2>1. Agreement to Terms</h2>
              <p>By accessing or using Reelst (the "Service"), operated by Avigage LLC DBA Reelst ("we," "us," "our"), you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.</p>
            </section>

            <section>
              <h2>2. What Reelst Is</h2>
              <p>Reelst is a map-based profile platform built for licensed real estate agents ("Agents"). Agents pin listings, sold properties, and neighborhood "Spotlights" to real addresses, attach reels, photos, and video walkthroughs to those pins, and share a single public profile link with prospective buyers ("Visitors"). Visitors can browse a map, watch content, save listings, subscribe to an Agent's email digest, and request showings without creating an account.</p>
            </section>

            <section>
              <h2>3. Account Registration</h2>
              <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your credentials. You must be at least 18 years old to create an Agent account. You may not use another person's account without permission, and you may not impersonate another agent, brokerage, or licensee.</p>
            </section>

            <section>
              <h2>4. Agent Responsibilities</h2>
              <p>Agents are solely responsible for the accuracy of every listing, price, property detail, open-house schedule, and piece of media posted through the Service. Agents must comply with all applicable real estate, fair-housing, advertising, and licensing laws in their jurisdiction, including any required disclosures (e.g., brokerage affiliation, MLS attribution). Misrepresenting listings, credentials, or licensure status is grounds for immediate account termination.</p>
              <p>If a Pin is auto-populated from MLS data, the Agent remains responsible for verifying the data is current and correct before publishing.</p>
            </section>

            <section>
              <h2>5. Visitor Conduct</h2>
              <p>Visitors may browse public Agent profiles, save listings, subscribe to an Agent's email digest, submit Showing Requests, and Wave at Agents with questions about a listing. Visitors must provide truthful contact information when submitting a Showing Request, digest signup, or Wave, and may only do so for legitimate property-touring purposes. Spam, harassment, and fraudulent inquiries will result in IP-level blocks.</p>
            </section>

            <section>
              <h2>6. Content Ownership & License</h2>
              <p>You retain ownership of all content you post to Reelst — including reels, videos, photos, captions, Spotlight descriptions, and listing copy. By posting content, you grant Reelst a non-exclusive, worldwide, royalty-free license to host, transcode, display, reproduce, and distribute that content as needed to operate and promote the Service (including on your public profile and in marketing materials with your permission).</p>
              <p>You represent that you own or have the rights to all content you post and that posting it does not infringe any third-party rights (including photography copyrights, music rights, and right-of-publicity).</p>
            </section>

            <section>
              <h2>7. Prohibited Conduct</h2>
              <p>You may not: post false or misleading listing information; post listings you are not authorized to represent; harass, threaten, or impersonate other users; upload malicious code or spam; scrape, data-mine, or attempt to reverse-engineer the Service; circumvent paywalls or tier gates; use the Service in violation of fair-housing or anti-discrimination laws; or otherwise use the Service for any unlawful purpose.</p>
            </section>

            <section>
              <h2>8. Subscriptions, Tiers & Billing</h2>
              <p>Reelst offers a free tier and a paid <strong>Pro</strong> tier. Paid subscriptions are billed monthly in advance. You can cancel from your dashboard at any time; cancellation takes effect at the end of the current billing period and your account drops to the Free tier. Tier-gated features (e.g., advanced analytics, unlimited active Pins, expanded customization) are available only while a qualifying subscription is active. We reserve the right to change pricing or tier composition with 30 days' notice. Refunds are handled on a case-by-case basis.</p>
            </section>

            <section>
              <h2>9. Showing Requests & Lead Capture</h2>
              <p>When a Visitor submits a Showing Request through the Service, we route the Visitor's contact information and message to the relevant Agent's inbox. Reelst does not act as a real estate brokerage, agency, or transaction intermediary — any subsequent showing, communication, or transaction occurs directly between the Visitor and the Agent.</p>
            </section>

            <section>
              <h2>10. Termination</h2>
              <p>We may suspend or terminate any account at any time for violation of these Terms or for any other reason at our discretion. Upon termination, your right to use the Service ceases immediately. Public-facing content tied to a terminated account will be removed. We may retain certain data as required by law or to resolve disputes.</p>
            </section>

            <section>
              <h2>11. Disclaimer of Warranties</h2>
              <p>The Service is provided "as is" without warranties of any kind, express or implied. We do not guarantee the accuracy of MLS-sourced listing data, the availability of the Service, or any specific business, marketing, or lead-generation results obtained from using the Service.</p>
            </section>

            <section>
              <h2>12. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Avigage LLC DBA Reelst shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>
            </section>

            <section>
              <h2>13. Changes to Terms</h2>
              <p>We may update these Terms at any time. We'll notify users of material changes via email or in-app notice. Continued use of the Service after changes take effect constitutes acceptance.</p>
            </section>

            <section>
              <h2>14. Contact</h2>
              <p>Questions about these Terms? Email us at <a href="mailto:hello@reelst.co">hello@reelst.co</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </MarketingLayout>
  )
}
