import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Hangar Marketplace',
  description: 'Hangar Marketplace was built by an active airline pilot who got tired of searching for hangar space with no central place to look. Meet the founder.',
}

export default function AboutPage() {
  return (
    <div style={pageStyle}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={heroStyle}>
        <p style={eyebrowStyle}>About Us</p>
        <h1 style={h1Style}>Built by a pilot,<br />for pilots.</h1>
        <p style={heroSubStyle}>
          Hangar Marketplace exists because finding a hangar in this country is harder than it should be.
          We built the platform we always wished existed.
        </p>
      </div>

      {/* ── Story ────────────────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>The problem we kept running into</h2>
        <p style={bodyStyle}>
          As pilots, we've always known the hangar search experience is broken. You check general
          listing sites, scroll Facebook groups, email FBOs, and ask around the ramp. And after all
          of that, you still might not find anything. Meanwhile, if you have space available, you're
          posting in five different places and hoping the right person sees it.
        </p>
        <p style={bodyStyle}>
          The aviation real estate world has been relying on word-of-mouth and generic platforms for
          decades. General commercial real estate sites bury hangar listings and offer no filtering
          by aircraft type, door size, or airport. Facebook groups are scattered, unverified, and
          impossible to search effectively.
        </p>
        <p style={bodyStyle}>
          There was no central place. So we built one.
        </p>
      </section>

      {/* ── Founder ──────────────────────────────────────────────────── */}
      <section style={{ ...sectionStyle, backgroundColor: '#f0f4f8', borderRadius: '12px', padding: '2.5rem' }}>
        <h2 style={h2Style}>Meet the founder</h2>

        {/* Photo placeholder — swap out the div below for an <img> when you have a headshot */}
        {/* To add a photo: replace this entire photoPlaceholder div with:
            <img src="/about-photo.jpg" alt="Andre Dosogne" style={photoStyle} />
            and add your photo to the /public folder as about-photo.jpg          */}
        <div style={photoPlaceholderStyle}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <p style={{ margin: '0.5rem 0 0', color: '#93c5fd', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Photo coming soon</p>
        </div>

        <p style={bodyStyle}>
          <strong style={{ color: '#111827' }}>Andre Dosogne</strong> is an active Alaska Airlines pilot based in the Seattle area. He started flying at 15, soloed at 16, and left for flight school at 19. By 21 he was an airline pilot flying for an American Airlines regional carrier. At 23 he was hired at Alaska Airlines, where he continues to fly today.
        </p>
        <p style={bodyStyle}>
          With extensive hours across everything from the Boeing 737 to warbirds, tailwheel aircraft, seaplanes, and high-performance piston twins, Andre has built a wide range of experience across the full spectrum of aviation. He has been in the industry since 2017, including time as a recruiter and conducting pilot interviews for his regional carrier, and remains active as a Certified Flight Instructor (CFI), flying tailwheel aircraft around the Pacific Northwest in his time off.
        </p>
        <p style={bodyStyle}>
          When he began pursuing his real estate license, something clicked. The best-performing real estate platforms serve niche markets, and aviation properties are as niche as it gets. As both a buyer looking for hangar space and someone learning the real estate industry from the inside, he saw the gap clearly: there was no nationwide, aviation-specific marketplace for hangars and airport properties.
        </p>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Hangar Marketplace is the result of that frustration turned into something useful. It's built for the pilot who's tired of hunting across five platforms and coming up empty, and for the owner who deserves a better way to get their space in front of the right people.
        </p>
      </section>

      {/* ── Credentials strip ────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>Credentials</h2>
        <ul style={credListStyle}>
          <li style={credItemStyle}>Diverse flight experience across commercial, general aviation, warbirds, seaplanes, and tailwheel aircraft</li>
          <li style={credItemStyle}><strong>Active CFI</strong> — Certified Flight Instructor, still active in flight training and the general aviation community</li>
          <li style={credItemStyle}><strong>Alaska Airlines</strong> — Active line pilot since 2022, based in the Seattle area, flying the Boeing 737</li>
          <li style={credItemStyle}><strong>Industry Since 2019</strong> — Former airline recruiter and pilot interviewer at the regional level</li>
        </ul>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section style={{ ...sectionStyle, borderTop: '2px solid #1a3a5c', paddingTop: '2.5rem' }}>
        <h2 style={h2Style}>Our mission</h2>
        <p style={bodyStyle}>
          To become the go-to marketplace for aviation real estate in the United States: a platform where pilots find hangar space without the runaround, owners get their listings in front of the right buyers, and brokers have a professional home for their aviation inventory.
        </p>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Listing is free. Always. You keep everything you earn. We're here to make the aviation real estate market work the way it should have all along.
        </p>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ ...sectionStyle, textAlign: 'center' as const, paddingBottom: '1rem' }}>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
          Have a question or want to get in touch?
        </p>
        <a href="mailto:hello@hangarmarketplace.com" style={ctaBtnStyle}>
          hello@hangarmarketplace.com
        </a>
      </section>

    </div>
  )
}


// ── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: '780px',
  margin: '0 auto',
  padding: '2rem 0 3rem',
}

const heroStyle: React.CSSProperties = {
  marginBottom: '3rem',
  paddingBottom: '2.5rem',
  borderBottom: '1px solid #e5e7eb',
}

const eyebrowStyle: React.CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '0.75rem',
  fontWeight: '700',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#2563eb',
}

const h1Style: React.CSSProperties = {
  margin: '0 0 1rem',
  fontSize: '2.25rem',
  fontWeight: '800',
  color: '#111827',
  lineHeight: 1.2,
}

const heroSubStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.05rem',
  color: '#4b5563',
  lineHeight: 1.75,
  maxWidth: '580px',
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '2.75rem',
}

const h2Style: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 1rem',
}

const bodyStyle: React.CSSProperties = {
  fontSize: '0.925rem',
  color: '#374151',
  lineHeight: 1.8,
  margin: '0 0 1rem',
}

const photoPlaceholderStyle: React.CSSProperties = {
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  backgroundColor: '#1a3a5c',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1.5rem',
  border: '3px solid #254e7a',
}

const credListStyle: React.CSSProperties = {
  margin: '0',
  paddingLeft: '1.25rem',
}

const credItemStyle: React.CSSProperties = {
  fontSize: '0.925rem',
  color: '#374151',
  lineHeight: 1.8,
  marginBottom: '0.5rem',
}

const ctaBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.75rem 2rem',
  backgroundColor: '#1a3a5c',
  color: 'white',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: '600',
}
