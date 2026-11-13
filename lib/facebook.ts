/**
 * Minimal Facebook Page publisher over the Graph API.
 *
 * Needs FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in the environment.
 * The token is a non-expiring Page token produced by
 * scripts/facebook-page-token.mjs. FACEBOOK_GRAPH_VERSION overrides the API
 * version when Meta retires the default.
 *
 * Pages only. Meta removed third-party posting into Groups in April 2024
 * (publish_to_groups is gone), so sharing a post into aviation groups stays
 * a manual tap on the post's Share button.
 */

const graphBase = () =>
  `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v26.0'}`

export function facebookConfigured(): boolean {
  return Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN)
}

export type FacebookPostResult =
  | { ok: true; postId: string; permalink: string | null }
  | { ok: false; error: string }

type GraphError = { error?: { message?: string; type?: string; code?: number } }

/**
 * Publish to the Page. With an image the post is a native photo post (the
 * format that reaches the most people) and any link lives in the message
 * text. Without one, or when Facebook refuses the photo (size, format, a
 * slow fetch), it falls back to a link post that uses the listing's
 * preview image instead.
 */
export async function publishToPage(opts: {
  message:   string
  imageUrl?: string | null
  link?:     string
}): Promise<FacebookPostResult> {
  if (!opts.imageUrl) return publishOnce({ message: opts.message, link: opts.link })

  const photo = await publishOnce({ message: opts.message, imageUrl: opts.imageUrl })
  if (photo.ok || isAuthError(photo.error)) return photo

  const linkPost = await publishOnce({ message: opts.message, link: opts.link })
  return linkPost.ok
    ? linkPost
    : { ok: false, error: `photo post: ${photo.error}; link post: ${linkPost.error}` }
}

// Token or permission problems fail the same way on every endpoint, so a
// second attempt would only add noise.
const isAuthError = (msg: string) => /\(code (190|200|10|102)\)/.test(msg)

async function publishOnce(opts: {
  message:   string
  imageUrl?: string | null
  link?:     string
}): Promise<FacebookPostResult> {
  const pageId = process.env.FACEBOOK_PAGE_ID
  const token  = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!pageId || !token) {
    return { ok: false, error: 'FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN is not set' }
  }

  // Token goes in the POST body, never the URL, so it stays out of logs.
  const body = new URLSearchParams({ access_token: token, message: opts.message })
  let endpoint: string
  if (opts.imageUrl) {
    endpoint = `${graphBase()}/${pageId}/photos`
    body.set('url', opts.imageUrl)
  } else {
    endpoint = `${graphBase()}/${pageId}/feed`
    if (opts.link) body.set('link', opts.link)
  }

  let res: Response
  try {
    res = await fetch(endpoint, { method: 'POST', body })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error contacting Facebook' }
  }

  const json = (await res.json().catch(() => ({}))) as GraphError & { id?: string; post_id?: string }
  if (!res.ok || json.error) {
    const e = json.error
    return { ok: false, error: `Graph ${res.status}${e?.code ? ` (code ${e.code})` : ''}: ${e?.message ?? 'unknown error'}` }
  }

  // /photos answers { id: <photo id>, post_id: <page post id> }; /feed answers { id: <page post id> }.
  const postId = json.post_id ?? json.id
  if (!postId) return { ok: false, error: 'Facebook accepted the post but returned no id' }

  return { ok: true, postId, permalink: await fetchPermalink(postId, token) }
}

async function fetchPermalink(postId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${graphBase()}/${postId}?fields=permalink_url`, {
      headers: { Authorization: `OAuth ${token}` },
    })
    const json = (await res.json().catch(() => ({}))) as { permalink_url?: string }
    return json.permalink_url ?? null
  } catch {
    return null
  }
}
