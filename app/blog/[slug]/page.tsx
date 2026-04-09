import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ALL_POSTS } from '@/content/blog/index'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return ALL_POSTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = ALL_POSTS.find(p => p.slug === slug)
  if (!post) return { title: 'Not Found' }

  const url = `${SITE_URL}/blog/${slug}`
  return {
    title: `${post.title} | Hangar Marketplace Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      siteName: 'Hangar Marketplace',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

/** Very lightweight Markdown renderer — handles headers, bold, tables, lists, paragraphs. */
function renderMarkdown(md: string): string {
  let html = md
  // Escape HTML entities first
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // H2 ##
  .replace(/^## (.+)$/gm, '<h2 class="blog-h2">$1</h2>')
  // H3 ###
  .replace(/^### (.+)$/gm, '<h3 class="blog-h3">$1</h3>')
  // Bold **text**
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Tables — basic support
  .replace(/\|(.+)\|\n\|[-|: ]+\|\n((?:\|.+\|\n?)+)/g, (_, header, rows) => {
    const th = header.split('|').filter(Boolean).map((c: string) => `<th>${c.trim()}</th>`).join('')
    const trs = rows.trim().split('\n').map((row: string) =>
      `<tr>${row.split('|').filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join('')}</tr>`
    ).join('')
    return `<div style="overflow-x:auto;margin:1.5rem 0;"><table class="blog-table"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>`
  })
  // Horizontal rule ---
  .replace(/^---$/gm, '<hr class="blog-hr" />')
  // Unordered list items
  .replace(/^- (.+)$/gm, '<li>$1</li>')
  // Wrap consecutive <li> tags in <ul>
  .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class="blog-ul">${m}</ul>`)
  // Paragraphs: blank lines → paragraph breaks
  .split(/\n\n+/)
  .map(block => {
    const b = block.trim()
    if (!b) return ''
    if (/^<(h[23]|ul|div|hr|table)/.test(b)) return b
    return `<p class="blog-p">${b.replace(/\n/g, ' ')}</p>`
  })
  .join('\n')

  return html
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = ALL_POSTS.find(p => p.slug === slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'Hangar Marketplace' },
    publisher: {
      '@type': 'Organization',
      name: 'Hangar Marketplace',
      url: SITE_URL,
    },
    url: `${SITE_URL}/blog/${slug}`,
    keywords: post.keywords.join(', '),
  }

  const rendered = renderMarkdown(post.body)

  return (
    <div style={{ maxWidth: '760px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Breadcrumb */}
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
        <Link href="/blog" style={{ color: '#6366f1', textDecoration: 'none' }}>Blog</Link>
        {' → '}
        <span>{post.title}</span>
      </p>

      {/* Article header */}
      <header style={{ marginBottom: '2rem' }}>
        <time dateTime={post.publishedAt} style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: '500' }}>
          {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
        <h1 style={{ margin: '0.5rem 0 0.75rem', fontSize: '1.85rem', color: '#111827', lineHeight: 1.3, fontWeight: '800' }}>
          {post.title}
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '1.05rem', lineHeight: 1.6, borderBottom: '1px solid #e5e7eb', paddingBottom: '1.5rem' }}>
          {post.description}
        </p>
      </header>

      {/* Article body */}
      <div
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />

      {/* CTA card */}
      <div style={{
        marginTop: '3rem', padding: '1.5rem',
        backgroundColor: '#eef2ff', border: '1px solid #c7d2fe',
        borderRadius: '12px',
      }}>
        <p style={{ margin: '0 0 0.5rem', fontWeight: '700', fontSize: '1rem', color: '#111827' }}>
          Find or list a hangar on Hangar Marketplace
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5 }}>
          Search available hangars by airport, state, size, and price — or list yours for free.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '0.55rem 1.1rem', backgroundColor: '#6366f1', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
            Browse hangars →
          </Link>
          <Link href="/submit" style={{ padding: '0.55rem 1.1rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>
            List your hangar
          </Link>
        </div>
      </div>

      {/* Other posts */}
      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          More from the blog
        </h2>
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          {ALL_POSTS.filter(p => p.slug !== slug).map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.25rem', fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>{p.title}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>{p.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
