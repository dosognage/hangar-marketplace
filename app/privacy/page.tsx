import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Hangar Marketplace',
  description: 'How Hangar Marketplace collects, uses, and protects your personal information.',
}

const EFFECTIVE_DATE = 'April 9, 2026'
const CONTACT_EMAIL  = 'andre.dosogne@outlook.com'
const SITE_NAME      = 'Hangar Marketplace'
const SITE_URL       = 'https://hangarmarketplace.com'

export default function PrivacyPage() {
  return (
    <div style={pageStyle}>
      <h1 style={h1Style}>Privacy Policy</h1>
      <p style={metaStyle}>Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. Who we are">
        <p>
          {SITE_NAME} ("{SITE_NAME}", "we", "us", or "our") operates the website{' '}
          <a href={SITE_URL} style={linkStyle}>{SITE_URL}</a>. We are based in Washington State, United States.
          This Privacy Policy explains how we collect, use, disclose, and protect information
          about you when you use our platform.
        </p>
        <p>
          Contact us at any time:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a>
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>We collect information in the following ways:</p>
        <ul style={listStyle}>
          <li><strong>Account information</strong> — name and email address when you create an account or sign in via a third-party provider.</li>
          <li><strong>Listing information</strong> — details you provide when submitting a hangar listing or hangar request (airport, dimensions, pricing, contact details).</li>
          <li><strong>Payment information</strong> — when you make a purchase, payment is processed by Stripe. We do not store card numbers or full payment details on our servers. We retain a Stripe customer ID and transaction records.</li>
          <li><strong>Marketing consent</strong> — email address, timestamp, IP address, and source page when you subscribe to marketing emails. This data is retained as proof of consent as required by GDPR and CASL.</li>
          <li><strong>Usage data</strong> — pages visited, browser type, device type, and referring URL, collected via standard server logs and analytics.</li>
          <li><strong>Cookies</strong> — session cookies used for authentication. We do not use third-party tracking or advertising cookies.</li>
        </ul>
      </Section>

      <Section title="3. How we use your information">
        <ul style={listStyle}>
          <li>To provide, operate, and improve the {SITE_NAME} platform.</li>
          <li>To process payments and manage subscriptions via Stripe.</li>
          <li>To send transactional emails (listing confirmations, inquiry notifications, request replies).</li>
          <li>To send marketing emails approximately once per month — only where you have given explicit consent and only until you unsubscribe.</li>
          <li>To detect fraud and maintain the security of our platform.</li>
          <li>To comply with legal obligations.</li>
        </ul>
      </Section>

      <Section title="4. Legal bases for processing (GDPR)">
        <p>If you are located in the European Economic Area (EEA) or United Kingdom, we process your personal data under the following legal bases:</p>
        <ul style={listStyle}>
          <li><strong>Contract</strong> — processing necessary to provide the services you have requested.</li>
          <li><strong>Legitimate interests</strong> — fraud prevention, platform security, and analytics to improve our service.</li>
          <li><strong>Consent</strong> — marketing emails, which you may withdraw at any time by clicking "Unsubscribe" in any email or contacting us directly.</li>
          <li><strong>Legal obligation</strong> — where required by applicable law.</li>
        </ul>
      </Section>

      <Section title="5. Marketing emails and your right to opt out">
        <p>
          We send marketing emails only to users who have explicitly opted in by checking the consent
          checkbox on our subscription form. Each marketing email includes a one-click unsubscribe
          link at the bottom. You may also unsubscribe at any time by visiting{' '}
          <a href="/unsubscribe" style={linkStyle}>hangarmarketplace.com/unsubscribe</a> or by
          emailing us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a>.
          We process unsubscribe requests immediately.
        </p>
        <p>
          We comply with the United States CAN-SPAM Act, Canada's Anti-Spam Legislation (CASL),
          the EU General Data Protection Regulation (GDPR), and the UK Privacy and Electronic
          Communications Regulations (PECR).
        </p>
      </Section>

      <Section title="6. Data sharing and third parties">
        <p>We share your data only as follows:</p>
        <ul style={listStyle}>
          <li><strong>Stripe</strong> — payment processing. Stripe's privacy policy is at <a href="https://stripe.com/privacy" style={linkStyle} target="_blank" rel="noreferrer">stripe.com/privacy</a>.</li>
          <li><strong>Supabase</strong> — our database and authentication provider, hosted in the United States.</li>
          <li><strong>Resend</strong> — our transactional and marketing email provider.</li>
          <li><strong>Vercel</strong> — our hosting provider, which may process server logs.</li>
        </ul>
        <p>
          We do not sell, rent, or trade your personal information to third parties for their
          own marketing purposes. We do not place advertising on our platform.
        </p>
      </Section>

      <Section title="7. Data retention">
        <p>
          We retain your account data for as long as your account is active, and for up to
          two years after account deletion for fraud-prevention purposes. Marketing consent
          records (email, timestamp, IP) are retained for five years as required for legal
          compliance. Unsubscribed users' emails are retained in a suppression list to prevent
          accidental re-subscription.
        </p>
      </Section>

      <Section title="8. Your rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul style={listStyle}>
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate data.</li>
          <li>Request deletion of your data ("right to be forgotten").</li>
          <li>Object to or restrict certain processing.</li>
          <li>Receive your data in a portable format.</li>
          <li>Withdraw consent for marketing emails at any time without affecting other processing.</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a>.
          We will respond within 30 days.
        </p>
      </Section>

      <Section title="9. Cookies">
        <p>
          We use session cookies solely to keep you logged in. We do not use advertising
          cookies, cross-site tracking cookies, or third-party analytics cookies that share
          data outside of {SITE_NAME}. You can disable cookies in your browser settings,
          but doing so will prevent you from staying signed in.
        </p>
      </Section>

      <Section title="10. Children's privacy">
        <p>
          {SITE_NAME} is not directed to children under the age of 13. We do not knowingly
          collect personal information from children. If you believe a child has provided us
          with personal data, please contact us immediately.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will update the
          effective date at the top of this page. Material changes will be communicated to
          registered users by email. Continued use of the platform after changes constitutes
          acceptance of the updated policy.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions, requests, or complaints about this Privacy Policy should be directed to:<br />
          <strong>{SITE_NAME}</strong><br />
          <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={h2Style}>{title}</h2>
      <div style={bodyStyle}>{children}</div>
    </section>
  )
}

const pageStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '2.5rem 0',
}

const h1Style: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: '800',
  color: '#111827',
  margin: '0 0 0.25rem',
}

const metaStyle: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '0.825rem',
  marginBottom: '2.5rem',
}

const h2Style: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 0.6rem',
}

const bodyStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#374151',
  lineHeight: 1.75,
}

const listStyle: React.CSSProperties = {
  paddingLeft: '1.25rem',
  margin: '0.5rem 0',
}

const linkStyle: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
}
