import Link from 'next/link'
import { ALL_POSTS } from '@/content/blog/index'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export const metadata: Metadata = {
  title: 'Hangar & Aviation Storage Blog | Hangar Marketplace',
  description: 'Guides, tips, and advice for finding, leasing, and owning aircraft hangar space. Written for general aviation pilots.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Hangar & Aviation Storage Blog',
    description: 'Guides and advice for finding, leasing, and owning aircraft hangar space.',
    type: 'website',
    url: `${SITE_URL}/blog`,
  },
}

export default function BlogPage() {
  return (
    <div style={{ maxWidth: '760px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.85rem', color: '#111827' }}>
          The Hangar Marketplace Blog
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '1rem', lineHeight: 1.6 }}>
          Practical guides and advice for general aviation pilots: finding hangar space, understanding leases, and making the most of your airport.
        </p>
      </div>

      {/* Post list */}
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {ALL_POSTS.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <article className="hover-card" style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
            }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <time
                  dateTime={post.publishedAt}
                  style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500' }}
                >
                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </time>
              </div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#111827', fontWeight: '700', lineHeight: 1.4 }}>
                {post.title}
              </h2>
              <p style={{ margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {post.description}
              </p>
              <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600' }}>
                Read more →
              </span>
            </article>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        marginTop: '3rem', padding: '1.5rem',
        backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
        borderRadius: '12px', textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700', color: '#111827' }}>
          Ready to find your hangar?
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            padding: '0.6rem 1.25rem', backgroundColor: '#111827', color: 'white',
            borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem',
          }}>
            Browse hangars →
          </Link>
          <Link href="/requests/new" style={{
            padding: '0.6rem 1.25rem', backgroundColor: 'white', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: '6px', textDecoration: 'none',
            fontWeight: '600', fontSize: '0.875rem',
          }}>
            Post a hangar request
          </Link>
        </div>
      </div>
    </div>
  )
}
