import { NextResponse } from 'next/server'

/**
 * Apple App Site Association: lets iOS open hangarmarketplace.com links
 * straight in the Hangar Marketplace app when it is installed (universal
 * links). The app declares applinks:hangarmarketplace.com in app.json and
 * maps these paths to its own screens in app/+native-intent.tsx.
 *
 * Served as a route rather than a public/ file so the Content-Type is
 * application/json, which Apple's fetcher expects. Apple caches this
 * through its CDN, so a change here can take a day to reach devices.
 */

const APP_ID = '8823N79VVG.com.hangarmarketplace.app'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json({
    applinks: {
      details: [
        {
          appIDs: [APP_ID],
          // First match wins, so the web-only pages are excluded before
          // the general patterns. '*' also matches '/'.
          components: [
            { '/': '/listing/*/*',       exclude: true, comment: 'Edit, mark sold, print stay on the web' },
            { '/': '/broker/dashboard*', exclude: true },
            { '/': '/broker/setup*',     exclude: true },
            { '/': '/broker/*/*',        exclude: true },
            { '/': '/listing/*',         comment: 'Listing pages' },
            { '/': '/broker/*',          comment: 'Broker profiles' },
          ],
        },
      ],
    },
  })
}
