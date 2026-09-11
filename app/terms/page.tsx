import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Hangar Marketplace',
  description: 'The terms that govern use of Hangar Marketplace by buyers, sellers, and brokers.',
}

const EFFECTIVE_DATE = 'September 11, 2026'
const CONTACT_EMAIL  = 'hello@hangarmarketplace.com'
const SITE_NAME      = 'Hangar Marketplace'
const SITE_URL       = 'https://hangarmarketplace.com'

export default function TermsPage() {
  return (
    <div style={pageStyle}>
      <h1 style={h1Style}>Terms of Service</h1>
      <p style={metaStyle}>Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. Acceptance of these terms">
        <p>
          By creating an account, submitting a listing, or otherwise using {SITE_NAME} on the web at{' '}
          <a href={SITE_URL} style={linkStyle}>{SITE_URL}</a> or through our mobile apps (together, the
          &quot;Platform&quot;), you agree to these Terms of Service. If you do not agree, do not use the Platform.
          These terms apply to everyone who uses the Platform, including buyers, sellers, property owners, and
          licensed real estate brokers and agents.
        </p>
      </Section>

      <Section title="2. What the Platform is">
        <p>
          {SITE_NAME} is an online marketplace where aviation property, including hangars, airpark homes, and
          aviation land, is listed for sale or lease. We provide the technology that lets sellers and brokers
          publish listings and lets buyers find them, save them, receive alerts, and contact the listing party.
        </p>
        <p>
          We are not a party to any sale, lease, or other transaction arranged through the Platform. We are not a
          real estate broker, agent, escrow provider, appraiser, lender, or title company, and nothing on the
          Platform is legal, financial, tax, or real estate advice. Every transaction is solely between the buyer
          and the seller or the seller&apos;s representative.
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>
          You must be at least 18 years old and able to enter binding contracts to hold an account. You are
          responsible for keeping your credentials confidential and for everything that happens under your
          account. Provide accurate information and keep it current. You may delete your account at any time
          from your profile settings; some records may be retained as described in our{' '}
          <a href={`${SITE_URL}/privacy`} style={linkStyle}>Privacy Policy</a>.
        </p>
      </Section>

      <Section title="4. Listings">
        <p>If you publish a listing, you represent and warrant that:</p>
        <ul style={listStyle}>
          <li>You own the property or are authorized in writing by the owner to market it, and where a license is required to market real property in the relevant jurisdiction, you hold that license in good standing.</li>
          <li>All facts in the listing, including price, dimensions, ownership type, lease terms, door sizes, runway data, HOA dues, and photographs, are accurate and current to the best of your knowledge, and you will update or remove the listing promptly when they change or the property is sold or leased.</li>
          <li>You have the right to use every photograph and description you upload, and you grant {SITE_NAME} a worldwide, non-exclusive, royalty-free license to display, reproduce, and distribute that content on the Platform and in Platform marketing, including email alerts and social channels, until you remove the listing.</li>
          <li>The listing complies with all applicable laws, including fair housing and anti-discrimination laws, airport and lease restrictions on transfer or sublease, and advertising rules that apply to licensed professionals.</li>
        </ul>
        <p>
          We may review, edit for format, decline, hide, or remove any listing at our discretion, including
          listings we believe are inaccurate, duplicative, misleading, unlawful, or not aviation property. We may
          record listing changes, including price history, and display that history to buyers.
        </p>
      </Section>

      <Section title="5. Brokers and verification">
        <p>
          Brokers and agents may apply for a verified broker profile. Verification means we have reviewed the
          license information you provided; it is not an endorsement, and buyers should independently confirm
          licensure with the relevant state authority. Verified brokers may publish listings that go live
          without pre-review. We may revoke verification or publishing rights at any time, including for
          inaccurate listings, complaints, or conduct that harms buyers or other brokers.
        </p>
        <p>
          Broker subscriptions, featured placements, and other paid products are sold on our website and are
          governed by the pricing and billing terms shown at the time of purchase. Subscriptions renew
          automatically until cancelled, cancellation takes effect at the end of the current billing period, and
          fees are non-refundable except where required by law.
        </p>
      </Section>

      <Section title="6. Buyers, inquiries, and showings">
        <p>
          Listings are provided by sellers and brokers, not by us, and we do not verify them. Before relying on
          any listing, you are responsible for your own due diligence, including inspections, title and lease
          review, survey, airport authority and HOA rules, zoning, and financing. Messages, inquiries, and
          showing requests you send through the Platform are delivered to the listing party, who is responsible
          for responding; we do not guarantee a response or the availability of any property.
        </p>
        <p>
          <strong>Price context and estimates.</strong> Any price range, comparison, market statistic, or
          estimate the Platform displays is generated automatically from listing data for informational
          purposes only. It is not an appraisal, a broker price opinion, or advice, may be incomplete or wrong,
          and must not be relied upon for any purchase, sale, lending, insurance, or tax decision.
        </p>
      </Section>

      <Section title="7. Conduct">
        <p>You agree not to:</p>
        <ul style={listStyle}>
          <li>Post content that is false, misleading, defamatory, infringing, discriminatory, or unlawful, or that you do not have the right to post.</li>
          <li>Use the Platform, its messaging, or any data obtained from it to send unsolicited commercial messages, to harass anyone, or to build lists of users for any purpose other than a genuine inquiry about a listed property.</li>
          <li>Scrape, crawl, or bulk-export Platform content or data, or access the Platform by any means other than the interfaces we provide.</li>
          <li>Interfere with the Platform&apos;s security, probe or bypass its access controls, or attempt to inflate views, saves, or any other metric.</li>
          <li>Impersonate any person, misrepresent your affiliation or licensure, or create accounts to evade a suspension.</li>
        </ul>
        <p>
          Every listing and conversation offers a way to report a problem, and you can block other users. We may
          suspend or terminate accounts that violate these terms, without notice where the conduct is serious.
        </p>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          The Platform, including its software, design, trademarks, and the compiled listing database, is owned
          by {SITE_NAME} or its licensors and is protected by intellectual property laws. Apart from the license
          you grant us for content you upload, you keep the rights to your own content. You may not copy,
          modify, or create derivative works from the Platform except as these terms permit.
        </p>
      </Section>

      <Section title="9. Disclaimers">
        <p>
          The Platform is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted by
          law, we disclaim all warranties, express or implied, including merchantability, fitness for a
          particular purpose, non-infringement, and any warranty about the accuracy, completeness, or
          availability of any listing, price, estimate, or message. We do not guarantee that any property is as
          described, that any seller or broker is who they claim to be beyond the verification steps described
          above, or that any transaction will close.
        </p>
      </Section>

      <Section title="10. Limitation of liability">
        <p>
          To the fullest extent permitted by law, {SITE_NAME} and its owners, officers, employees, and agents
          will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for
          any lost profits, lost deals, or loss of data, arising from or related to the Platform or any
          transaction arranged through it, even if advised of the possibility. Our total liability to you for
          any claim will not exceed the greater of one hundred dollars ($100) or the amounts you paid to
          {SITE_NAME} in the twelve months before the claim arose.
        </p>
      </Section>

      <Section title="11. Indemnity">
        <p>
          You agree to defend, indemnify, and hold harmless {SITE_NAME} from any claim, loss, or expense,
          including reasonable attorneys&apos; fees, arising from content you post, a transaction you enter into
          through the Platform, your violation of these terms, or your violation of any law or the rights of a
          third party.
        </p>
      </Section>

      <Section title="12. Governing law and disputes">
        <p>
          These terms are governed by the laws of the State of Washington, United States, without regard to its
          conflict of laws rules. Any dispute arising from these terms or the Platform will be brought in the
          state or federal courts located in King County, Washington, and you consent to their jurisdiction.
          Before filing any claim, you agree to contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a> and attempt in good faith to
          resolve the matter for at least thirty days.
        </p>
      </Section>

      <Section title="13. Changes to these terms">
        <p>
          We may update these terms. For material changes we will give notice by email or in-app message at
          least fourteen days before the change takes effect. Continued use of the Platform after the effective
          date is acceptance of the updated terms.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>{CONTACT_EMAIL}</a>.
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
