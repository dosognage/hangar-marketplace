import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { STATE_NAMES, stateToSlug } from '@/lib/states'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hangarmarketplace.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                    lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/requests`,      lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/requests/new`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/submit`,        lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/blog`,          lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
  ]

  // State landing pages — all 50 states
  const stateRoutes: MetadataRoute.Sitemap = Object.keys(STATE_NAMES).map(slug => ({
    url: `${SITE_URL}/hangars/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  // Fetch approved listings
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at, airport_code')
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })

  const typedListings = (listings ?? []) as Array<{ id: string; updated_at: string; airport_code: string }>

  // Individual listing pages
  const listingRoutes: MetadataRoute.Sitemap = typedListings.map(l => ({
    url: `${SITE_URL}/listing/${l.id}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Airport landing pages — unique airports only
  const uniqueAirports = [...new Set(typedListings.map(l => l.airport_code.toLowerCase()))]
  const airportRoutes: MetadataRoute.Sitemap = uniqueAirports.map(icao => ({
    url: `${SITE_URL}/hangars/airport/${icao}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  return [...staticRoutes, ...stateRoutes, ...listingRoutes, ...airportRoutes]
}
