import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'

export default function Privacy() {
  return (
    <MarketingLayout>
      <SEOHead title="Privacy Policy" path="/privacy" />

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
            Your data.
            <br />
            <span className="brand-grad-text" style={{ fontWeight: 600 }}>
              Your call.
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
              <h2>1. Introduction</h2>
              <p>Avigage LLC DBA Reelst ("we," "us," "our") respects your privacy. This Privacy Policy explains what we collect, how we use it, who we share it with, and the controls you have over your data.</p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>

              <h3>Agent account information</h3>
              <p>When an Agent creates an account we collect: name, email, profile photo, username, brokerage affiliation, license number and state, bio, and any social links you choose to connect (Instagram, TikTok, YouTube, LinkedIn, website, MLS profile).</p>

              <h3>Visitor information</h3>
              <p>Visitors can browse Agent profiles, save listings, and subscribe to an Agent's email digest. If a Visitor submits a Showing Request, we collect the name, email, phone number, preferred date/time, and any note they provide so we can route the request to the Agent. If a Visitor submits an email address to subscribe to an Agent's digest, we store that email along with the originating Agent.</p>

              <h3>Content & listing data</h3>
              <p>We store the content you publish: reels, photos, video walkthroughs, captions, Spotlight descriptions, listing details (price, beds, baths, sqft, MLS-derived fields, days on market), open-house schedules, and the geographic coordinates associated with each pin.</p>

              <h3>Engagement data</h3>
              <p>We record interactions with your profile and pins — visits, taps, saves, waves, content plays — so Agents can see how their territory is performing in their Insights dashboard.</p>

              <h3>Usage & device data</h3>
              <p>We automatically collect general usage information including pages visited, device type, browser, IP address, approximate location (from IP), and referring URLs.</p>

              <h3>Precise location</h3>
              <p>With your permission, we may use your device's precise location to surface nearby Agents and content. You can revoke this permission in your device or browser settings at any time.</p>
            </section>

            <section>
              <h2>3. How We Use Your Information</h2>
              <p>We use your information to: operate and improve the Service; render your public profile, pins, and content; deliver Showing Requests and digest signups to the right Agent; send transactional and product notifications; provide analytics to Agents; detect fraud and enforce our Terms; and comply with legal obligations.</p>
            </section>

            <section>
              <h2>4. Public vs. Private Information</h2>
              <p>The following information is <strong>public</strong> on Reelst by design: an Agent's display name, photo, username, bio, brokerage and license info (when provided), connected social links, and all published pins (For Sale, Sold, Spotlight) including their addresses, listing details, and media. Aggregate engagement counts (visits, saves) are visible only to the Agent in their dashboard.</p>
              <p>The following remains <strong>private</strong>: Visitor email/phone submitted via Showing Requests (visible only to the receiving Agent and to us), draft content not yet published, internal analytics breakdowns, billing details, and any content you've archived.</p>
            </section>

            <section>
              <h2>5. Third-Party Services</h2>
              <p>We rely on the following processors to operate Reelst. Each has its own privacy policy governing the data they handle:</p>
              <ul>
                <li><strong>Firebase (Google)</strong> — authentication, real-time database, file storage, analytics</li>
                <li><strong>Mapbox</strong> — map rendering, address geocoding</li>
                <li><strong>Mux</strong> — video upload, transcoding, and adaptive playback for reels and livestreams</li>
                <li><strong>Stripe</strong> — payment processing for paid subscription tiers</li>
                <li><strong>Email and notification providers</strong> — transactional email delivery for Showing Request alerts and account notifications</li>
              </ul>
            </section>

            <section>
              <h2>6. Data Sharing</h2>
              <p>We do not sell your personal information. We may share data with: third-party service providers acting on our behalf (listed above); Agents who receive Showing Requests submitted directly to their pins; law enforcement or regulators when legally required; and successor entities in connection with a merger, acquisition, or asset sale.</p>
            </section>

            <section>
              <h2>7. Data Retention</h2>
              <p>We retain account and content data for as long as your account is active. When you delete your account, we delete your personal data within 30 days, except where retention is required by law (e.g., financial records). Public content you posted may persist briefly in cached or backup form before final deletion.</p>
            </section>

            <section>
              <h2>8. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the right to: access the personal data we hold about you; correct inaccurate data; delete your account and associated data; export your data; opt out of marketing communications; and restrict or object to specific uses of your data. To exercise these rights, email <a href="mailto:hello@reelst.co">hello@reelst.co</a> from the address associated with your account.</p>
            </section>

            <section>
              <h2>9. California Privacy Rights (CCPA / CPRA)</h2>
              <p>If you are a California resident, you have additional rights under the CCPA / CPRA, including the right to know what personal information we collect, the right to delete it, and the right to non-discrimination when exercising those rights. We do not sell or share personal information for cross-context behavioral advertising as defined by California law.</p>
            </section>

            <section>
              <h2>10. Cookies & Local Storage</h2>
              <p>We use essential cookies and browser local storage for authentication, session continuity, and remembering interface preferences (e.g., theme, last-viewed map mode). We may use first-party analytics cookies to understand aggregate Service usage. You can clear cookies and storage at any time through your browser.</p>
            </section>

            <section>
              <h2>11. Security</h2>
              <p>We implement industry-standard safeguards including TLS encryption in transit, encryption at rest for stored content, scoped access to production systems, and least-privilege role-based access. No transmission method is 100% secure, but we work continuously to protect your data.</p>
            </section>

            <section>
              <h2>12. Children's Privacy</h2>
              <p>Reelst is not directed at children under 13 and we do not knowingly collect personal information from children under 13. Agent accounts require licensure and a minimum age of 18.</p>
            </section>

            <section>
              <h2>13. Changes to This Policy</h2>
              <p>We may update this Privacy Policy as the Service evolves. Material changes will be communicated via email or in-app notice before they take effect.</p>
            </section>

            <section>
              <h2>14. Contact</h2>
              <p>For privacy inquiries, email <a href="mailto:hello@reelst.co">hello@reelst.co</a>.</p>
              <p className="mt-2">Avigage LLC DBA Reelst<br />Miami, FL</p>
            </section>
          </div>
        </div>
      </div>
    </MarketingLayout>
  )
}
