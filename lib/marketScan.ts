/**
 * Weekly market-scan — aviation real estate signals from free RSS sources.
 *
 * Runs Monday afternoons (1hr after the activity digest). Pulls articles
 * from a curated list of free RSS feeds, filters to the last 7 days,
 * dedupes by URL, and ranks by source-prominence (so Google News market
 * search results bubble above general aviation news).
 *
 * Why RSS not search APIs?
 *   - No API keys to manage / rotate / pay for
 *   - Google News exposes RSS endpoints for any search query, free
 *   - Industry sources (AVweb, AOPA, Flying) all publish RSS
 *   - Stable enough that "fast-xml-parser" isn't worth the dep — we use
 *     a small regex-based extractor that handles the well-formed feeds
 *     these sources produce.
 */

const SEVEN_DAYS_MS = 7 * 86_400_000

export type MarketSignal = {
  title:     string
  url:       string
  source:    string        // "Google News · airpark for sale", "AVweb", etc.
  publishedAt: Date
  summary?:  string        // first ~240 chars of description, plain text
}

type Feed = {
  source: string
  url:    string
}

/** Curated free feeds. Add more as we discover them; remove flaky ones. */
const FEEDS: Feed[] = [
  // Google News searches — high-signal because we control the query.
  { source: 'Google News · airpark for sale',
    url:    'https://news.google.com/rss/search?q=%22airpark%22+%22for+sale%22&hl=en-US&gl=US&ceid=US:en' },
  { source: 'Google News · hangar for sale',
    url:    'https://news.google.com/rss/search?q=%22hangar+for+sale%22&hl=en-US&gl=US&ceid=US:en' },
  { source: 'Google News · aviation real estate',
    url:    'https://news.google.com/rss/search?q=%22aviation+real+estate%22&hl=en-US&gl=US&ceid=US:en' },
  { source: 'Google News · FAA airport',
    url:    'https://news.google.com/rss/search?q=%22FAA%22+airport+closure+OR+expansion&hl=en-US&gl=US&ceid=US:en' },

  // Industry sources for general aviation news that may surface market shifts.
  { source: 'AVweb',         url: 'https://www.avweb.com/feed/' },
  { source: 'AOPA News',     url: 'https://www.aopa.org/news-and-media/all-news/feed' },
  { source: 'General Aviation News', url: 'https://generalaviationnews.com/feed/' },
]

/** Pull and parse a single feed. Resilient — never throws. */
async function fetchFeed(feed: Feed): Promise<MarketSignal[]> {
  try {
    const res = await fetch(feed.url, {
      // Some feeds 403 default user agents; use a vanilla browser-like UA.
      headers: { 'User-Agent': 'Mozilla/5.0 HangarMarketplaceMarketScan/1.0' },
      // Serverless cold-start tolerance.
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      console.warn(`[market-scan] ${feed.source} returned ${res.status}`)
      return []
    }
    const xml = await res.text()
    return parseRss(xml, feed.source)
  } catch (err) {
    console.warn(`[market-scan] ${feed.source} fetch failed:`, err instanceof Error ? err.message : err)
    return []
  }
}

/**
 * Lightweight RSS parser — handles <item> blocks with <title>, <link>,
 * <pubDate>, <description>. Tolerates CDATA. Doesn't try to be a complete
 * spec implementation; covers the four feed types in FEEDS above.
 */
function parseRss(xml: string, source: string): MarketSignal[] {
  const items: MarketSignal[] = []
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) ?? []
  for (const block of itemBlocks) {
    const title = extractTag(block, 'title')
    const link  = extractTag(block, 'link')
    const date  = extractTag(block, 'pubDate')
    const desc  = extractTag(block, 'description')
    if (!title || !link) continue
    const publishedAt = date ? new Date(date) : new Date(0)
    if (Number.isNaN(publishedAt.getTime())) continue
    items.push({
      source,
      title:  decodeEntities(title).trim(),
      url:    link.trim(),
      publishedAt,
      summary: desc ? truncate(stripHtml(decodeEntities(desc)), 240) : undefined,
    })
  }
  return items
}

function extractTag(xml: string, tag: string): string | null {
  // Match <tag>content</tag> with optional CDATA. RSS often wraps title/desc
  // in <![CDATA[...]]> to avoid escaping problems.
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml)
  if (!m) return null
  let content = m[1]
  const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(content)
  if (cdata) content = cdata[1]
  return content
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s
}

/**
 * Fetch all feeds in parallel, filter to the last 7 days, dedupe by URL,
 * and rank by recency. Returns at most `limit` signals.
 */
export async function buildMarketScan(limit = 12): Promise<MarketSignal[]> {
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS)
  const all = (await Promise.all(FEEDS.map(fetchFeed))).flat()

  const seen = new Set<string>()
  const fresh: MarketSignal[] = []
  for (const s of all) {
    if (s.publishedAt < cutoff) continue
    // Google News URLs include tracking suffix — normalise by host+path
    const key = (() => {
      try {
        const u = new URL(s.url)
        return `${u.hostname}${u.pathname}`
      } catch { return s.url }
    })()
    if (seen.has(key)) continue
    seen.add(key)
    fresh.push(s)
  }

  fresh.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  return fresh.slice(0, limit)
}
