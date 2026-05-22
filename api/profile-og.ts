/**
 * api/profile-og.ts — Vercel Function : OG meta dynamiques pour /profile/:username
 *
 * Pendant le partage d'un lien profil sur WhatsApp/Facebook/Twitter, le
 * crawler de preview ne sait pas exécuter le JS de la SPA. On lui sert donc
 * un HTML statique enrichi avec les meta Open Graph du profil (username,
 * bio, avatar, compteurs) plutôt que la landing générique.
 *
 * Pattern strictement aligné sur `api/post-og.ts` :
 *   - Crawler détecté via User-Agent → HTML enrichi avec og:title /
 *     og:description / og:image (avatar) / og:locale fr_CA.
 *   - Navigateur humain → fallback sur index.html SPA (whitelist hosts pour
 *     éviter SSRF, cf. post-og.ts).
 *
 * Sécurité :
 *   - Fetch via clé anon Supabase + RLS profiles (seuls les profils publics
 *     remontent).
 *   - escapeHtml() sur tous les champs user-generated.
 *   - Whitelist hosts pour le fetch index.html (CodeQL safe).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// ─── Detection crawlers OG ─────────────────────────────────────────────────────

const CRAWLER_PATTERNS = [
  /facebookexternalhit/i,
  /facebot/i,
  /WhatsApp/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /TelegramBot/i,
  /Discordbot/i,
  /Pinterest/i,
  /Snapchat/i,
  /Applebot/i,
  /iMessageLinkPresentation/i,
  /SkypeUriPreview/i,
  /vkShare/i,
  /redditbot/i,
]

function isCrawler(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  return CRAWLER_PATTERNS.some((re) => re.test(userAgent))
}

// ─── Fetch profile ───────────────────────────────────────────────────────────

interface OgProfile {
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  bannerUrl: string | null
  postsCount: number
}

async function fetchProfileForOg(username: string): Promise<OgProfile | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('[profile-og] Supabase env vars manquantes')
    return null
  }

  // Filtre `is_public=eq.true` + `is_internal=eq.false` pour exclure les
  // profils privés et les comptes administratifs des previews publics.
  const url =
    `${supabaseUrl}/rest/v1/profiles` +
    `?select=username,first_name,last_name,bio,avatar_url,banner_url,posts_count` +
    `&username=eq.${encodeURIComponent(username)}` +
    `&is_public=eq.true` +
    `&is_internal=eq.false` +
    `&limit=1`

  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })
    if (!res.ok) {
      console.error(`[profile-og] Supabase HTTP ${res.status}`)
      return null
    }
    const rows = (await res.json()) as Array<{
      username: string | null
      first_name: string | null
      last_name: string | null
      bio: string | null
      avatar_url: string | null
      banner_url: string | null
      posts_count: number | null
    }>
    if (rows.length === 0) return null
    const row = rows[0]
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
    return {
      username: row.username ?? username,
      displayName: fullName || row.username || username,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      bannerUrl: row.banner_url,
      postsCount: row.posts_count ?? 0,
    }
  } catch (err) {
    console.error('[profile-og] fetch failed:', err)
    return null
  }
}

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(s: string, max = 200): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}

function buildCrawlerHtml(profile: OgProfile, profileUrl: string): string {
  const safeName = escapeHtml(profile.displayName)
  const safeUsername = escapeHtml(profile.username)
  const safeBio = escapeHtml(
    truncate(
      profile.bio ?? `Découvre les observations nature de @${profile.username} sur Naturegraph.`,
    ),
  )
  // Préférence banner > avatar pour og:image (la bannière est en 1500×500
  // ratio quasi-OG ; l'avatar est carré et moins flatteur en preview).
  // Resize via Supabase render endpoint pour < 200 KB (WhatsApp/iMessage
  // timeout sur les images lourdes en data mobile).
  const rawOgImage = profile.bannerUrl ?? profile.avatarUrl ?? ''
  const ogImage = rawOgImage
    ? rawOgImage.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
      (rawOgImage.includes('?') ? '&' : '?') +
      'width=1200&height=630&resize=cover&quality=80'
    : ''
  const safeImage = ogImage ? escapeHtml(ogImage) : ''
  const safeUrl = escapeHtml(profileUrl)

  const ogImageTags = safeImage
    ? `
    <meta property="og:image" content="${safeImage}" />
    <meta name="twitter:image" content="${safeImage}" />`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} (@${safeUsername}) · Naturegraph</title>
  <meta name="description" content="${safeBio}" />
  <link rel="canonical" href="${safeUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="Naturegraph" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:title" content="${safeName} (@${safeUsername})" />
  <meta property="og:description" content="${safeBio}" />
  <meta property="og:locale" content="fr_CA" />
  <meta property="profile:username" content="${safeUsername}" />${ogImageTags}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeName} (@${safeUsername})" />
  <meta name="twitter:description" content="${safeBio}" />
</head>
<body>
  <h1>${safeName}</h1>
  <p>@${safeUsername}</p>
  <p>${safeBio}</p>
  <p>${profile.postsCount} observation${profile.postsCount > 1 ? 's' : ''} partagée${profile.postsCount > 1 ? 's' : ''}.</p>
  <p><a href="${safeUrl}">Voir le profil sur Naturegraph</a></p>
</body>
</html>`
}

function buildFallbackHtml(profileUrl: string): string {
  const safeUrl = escapeHtml(profileUrl)
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Naturegraph — Profil</title>
  <meta name="description" content="Naturegraph — partage d'observations nature et biodiversité." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Naturegraph" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:title" content="Naturegraph — Partageons nos émotions" />
  <meta property="og:description" content="Naturegraph — partage d'observations nature et biodiversité." />
  <meta property="og:locale" content="fr_CA" />
</head>
<body>
  <p>Ce profil n'est pas disponible.</p>
  <p><a href="${safeUrl}">Découvrir Naturegraph</a></p>
</body>
</html>`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userAgent = req.headers['user-agent']
  const username = (req.query.username ?? req.query.user) as string | undefined
  const host = req.headers.host ?? 'naturegraph.ca'
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const profileUrl = `${proto}://${host}/profile/${username ?? ''}`

  // Whitelist stricte des hosts (CodeQL SSRF safe) — voir post-og.ts.
  const ALLOWED_HOSTS = new Set([
    'naturegraph.ca',
    'www.naturegraph.ca',
    'naturegraph-eight.vercel.app',
    'localhost:5173',
    process.env.VERCEL_URL ?? '',
    process.env.VERCEL_BRANCH_URL ?? '',
  ])
  const safeHost = ALLOWED_HOSTS.has(host) ? host : 'naturegraph.ca'
  const safeIndexUrl = `https://${safeHost}/index.html`

  // Navigateur humain → on délègue à la SPA.
  if (!isCrawler(userAgent)) {
    try {
      const r = await fetch(safeIndexUrl, { headers: { 'cache-control': 'no-cache' } })
      const html = await r.text()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600')
      res.status(200).send(html)
      return
    } catch (err) {
      console.error('[profile-og] index.html fetch failed:', err)
      res.status(500).send('Internal Server Error')
      return
    }
  }

  // Crawler → HTML enrichi.
  if (!username) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(buildFallbackHtml(profileUrl))
    return
  }

  const profile = await fetchProfileForOg(username)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')

  if (profile) {
    res.status(200).send(buildCrawlerHtml(profile, profileUrl))
  } else {
    res.status(200).send(buildFallbackHtml(profileUrl))
  }
}
