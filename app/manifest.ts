import type { MetadataRoute } from 'next'

/**
 * Web App Manifest for Hangar Marketplace.
 *
 * Makes the site installable as a Progressive Web App (PWA): users can
 * "Add to Home Screen" from Safari/Chrome and get a real app icon that
 * opens fullscreen with no browser chrome. On Android, Chrome auto-prompts
 * to install after a few visits; on iOS the user does it manually but the
 * icon, splash, and theme color all use these values.
 *
 * Next.js auto-serves this at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Hangar Marketplace',
    short_name:       'Hangar Mkt',
    description:      'Find, list, and lease aviation hangar space across the US.',
    start_url:        '/',
    display:          'standalone',
    background_color: '#1a3a5c',
    theme_color:      '#1a3a5c',
    orientation:      'portrait-primary',
    icons: [
      { src: '/favicon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['business', 'productivity', 'finance'],
  }
}
