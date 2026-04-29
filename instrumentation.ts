// Next.js instrumentation hook — runs once when the runtime boots.
// We use it to load the right Sentry config for each runtime so server vs.
// edge vs. browser code stays cleanly separated.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Forward unhandled request errors to Sentry. Available in Next.js 15+.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: 'Pages Router' | 'App Router'; routePath: string; routeType: 'render' | 'route' | 'middleware' | 'action' },
) {
  const { captureRequestError } = await import('@sentry/nextjs')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureRequestError(err, request as any, context as any)
}
