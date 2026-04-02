import { MarketingLayout } from '@/components/marketing/MarketingLayout'
import { SEOHead } from '@/components/marketing/SEOHead'

export default function Privacy() {
  return (
    <MarketingLayout>
      <SEOHead title="Privacy Policy" path="/privacy" />
      <div className="max-w-[720px] mx-auto px-5 md:px-8 py-12 md:py-20">
        <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-[13px] text-smoke mb-10">Effective: April 1, 2026 · Last updated: April 1, 2026</p>

        <div className="prose-reeltor space-y-8">
          <section>
            <h2>1. Introduction</h2>
            <p>Avigage LLC DBA Reelst ("we," "us," "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our Service.</p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>Account Information</h3>
            <p>When you create an account, we collect your name, email address, profile photo, and (for Agents) license information, brokerage, and connected social platform usernames.</p>
            <h3>Content Data</h3>
            <p>We store content you post including photos, videos, listing details, addresses, and location coordinates associated with pins.</p>
            <h3>Usage Data</h3>
            <p>We automatically collect information about how you interact with the Service, including pages visited, pins viewed, taps, search queries, device type, IP address, and browser information.</p>
            <h3>Location Data</h3>
            <p>With your permission, we may collect your device's location to show nearby agents and personalize your experience. You can disable location access in your device settings.</p>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We use your information to: provide and improve the Service; display your public profile and content; personalize your experience; send notifications and updates; analyze usage patterns; prevent fraud and enforce our Terms; and comply with legal obligations.</p>
          </section>

          <section>
            <h2>4. Third-Party Services</h2>
            <p>We use the following third-party services that may process your data:</p>
            <ul>
              <li><strong>Firebase (Google)</strong> — Authentication, database, file storage</li>
              <li><strong>Mapbox</strong> — Map rendering, geocoding of addresses</li>
              <li><strong>Google Analytics</strong> — Usage analytics (when implemented)</li>
            </ul>
            <p>Each third-party service has its own privacy policy governing their use of your data.</p>
          </section>

          <section>
            <h2>5. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with: third-party service providers who assist in operating the Service; law enforcement when required by law; and in connection with a merger, acquisition, or sale of assets.</p>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide the Service. When you delete your account, we will delete your personal data within 30 days, except where retention is required by law.</p>
          </section>

          <section>
            <h2>7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to: access your personal data; correct inaccurate data; delete your data; port your data to another service; opt out of marketing communications; and restrict or object to processing. To exercise these rights, email <a href="mailto:hello@reelst.co" className="text-tangerine hover:underline">hello@reelst.co</a>.</p>
          </section>

          <section>
            <h2>8. California Privacy Rights (CCPA)</h2>
            <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act, including the right to know what personal information we collect and the right to request deletion. We do not sell personal information as defined by the CCPA.</p>
          </section>

          <section>
            <h2>9. Cookies</h2>
            <p>We use essential cookies for authentication and session management. We may use analytics cookies to understand how the Service is used. You can control cookie settings in your browser.</p>
          </section>

          <section>
            <h2>10. Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption in transit (TLS) and at rest. However, no method of transmission over the Internet is 100% secure.</p>
          </section>

          <section>
            <h2>11. Children's Privacy</h2>
            <p>The Service is not intended for users under 13 years of age. We do not knowingly collect information from children under 13.</p>
          </section>

          <section>
            <h2>12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notice.</p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p>For privacy-related inquiries, contact us at <a href="mailto:hello@reelst.co" className="text-tangerine hover:underline">hello@reelst.co</a>.</p>
            <p className="mt-2">Avigage LLC DBA Reelst<br />Miami, FL</p>
          </section>
        </div>
      </div>
    </MarketingLayout>
  )
}
