import Script from 'next/script'

/**
 * GoogleAnalytics
 *
 * Injects the GA4 gtag.js snippet.
 * Only renders when NEXT_PUBLIC_GA_ID is set — safe in dev/staging.
 * Place inside <head> in layout.tsx.
 *
 * To enable:
 *   1. Create a GA4 property at analytics.google.com
 *   2. Add NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX to your Vercel environment variables
 */
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  if (!gaId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  )
}
