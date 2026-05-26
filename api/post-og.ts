/**
 * api/post-og.ts — Vercel Serverless Function : OG meta dynamiques pour /post/:id
 *
 * Pourquoi cette fonction existe :
 *   Naturegraph est une SPA Vite. Les crawlers Open Graph (WhatsApp, Facebook,
 *   Twitter, LinkedIn, Discord, iMessage, Slack…) ne lisent pas le JS — ils
 *   crawlent le HTML initial servi par le serveur. Or notre index.html ne
 *   contient que les meta OG génériques de la landing.
 *
 *   Résultat avant ce fix : un lien `naturegraph.ca/post/123` partagé sur
 *   WhatsApp affichait le preview de la landing au lieu du post. Très mauvais
 *   pour l'engagement et le growth (le visiteur ne sait pas où il va).
 *
 * Stratégie :
 *   - Cette fonction est appelée par le rewrite Vercel (cf. vercel.json) pour
 *     toutes les requêtes vers `/post/:postId`.
 *   - Si l'User-Agent matche un crawler connu : on fetch le post sur Supabase
 *     (vue publique RLS-safe) et on renvoie un HTML statique avec les meta
 *     OG injectées (og:title, og:description, og:image…).
 *   - Sinon (navigateur humain) : on renvoie le HTML SPA standard
 *     (`/index.html` qui boote l'app React et navigue vers /post/:id).
 *
 * Sécurité :
 *   - Pas de secret exposé : on utilise la `VITE_SUPABASE_ANON_KEY` côté
 *     serveur, qui passe par les policies RLS (seul un post visible
 *     publiquement remonte).
 *   - Échappement HTML systématique sur tous les champs user-generated
 *     (title, description, username) pour éviter le XSS dans le HTML servi.
 *
 * Runtime : Node serverless (pas Edge) — plus simple, suffisant pour ce cas
 * d'usage et compatible avec le SDK supabase-js qui nécessite globalThis.fetch.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// ─── Extraction UUID depuis un segment slug-uuid ─────────────────────────────
// Le segment route `:postId` peut contenir un slug humain devant l'UUID
// (« grand-duc-amerique-{uuid} »). On extrait l'UUID via regex pour
// rester rétro-compatible avec les anciens liens `/post/{uuid}`.
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const SHORT_ID_REGEX = /-([0-9a-f]{8})$/i

/**
 * Retourne soit l'UUID complet trouvé dans le segment, soit le short ID
 * (8 hex chars) si seul un préfixe court est présent. Le caller distingue
 * via la longueur.
 */
function extractUuid(raw: string | undefined): string | null {
  if (!raw) return null
  const fullMatch = raw.match(UUID_REGEX)
  if (fullMatch) return fullMatch[0]
  const shortMatch = raw.match(SHORT_ID_REGEX)
  if (shortMatch) return shortMatch[1]
  return null
}

// ─── Detection crawlers OG ─────────────────────────────────────────────────────

/**
 * Liste non exhaustive des User-Agents de crawlers de preview de lien.
 * Source : https://github.com/monperrus/crawler-user-agents + tests manuels
 * WhatsApp/Telegram/iMessage en 2025.
 */
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

// ─── Récupération du post via Supabase (RLS-safe) ─────────────────────────────

interface OgPost {
  title: string
  description: string
  imageUrl: string | null
  authorUsername: string
  species: string | null
}

/**
 * Fetch le post via PostgREST avec la clé anon — les RLS Supabase filtrent
 * automatiquement les posts privés / supprimés. Aucun secret exposé.
 */
async function fetchPostForOg(postId: string): Promise<OgPost | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('[post-og] Supabase env vars manquantes')
    return null
  }

  // Query par short_id (8 hex chars) ou par UUID complet selon le format reçu.
  const isShort = postId.length === 8 && /^[0-9a-f]{8}$/i.test(postId)
  const filterKey = isShort ? 'short_id' : 'id'
  const url =
    `${supabaseUrl}/rest/v1/posts_public` +
    `?select=id,title,description,species_name,user:profiles!user_id(username),media(url,is_cover,display_order)` +
    `&${filterKey}=eq.${encodeURIComponent(postId)}` +
    `&limit=1`

  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })
    if (!res.ok) {
      console.error(`[post-og] Supabase HTTP ${res.status}`)
      return null
    }
    const rows = (await res.json()) as Array<{
      title: string | null
      description: string | null
      species_name: string | null
      user: { username: string | null } | null
      media: Array<{ url: string | null; is_cover: boolean | null; display_order: number | null }>
    }>
    if (rows.length === 0) return null
    const row = rows[0]
    const cover =
      row.media.find((m) => m.is_cover) ??
      row.media.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0]
    const username = row.user?.username ?? 'naturegraph'
    // Passe par le render/resize Supabase pour servir une image 1200×630
    // < 200 KB. WhatsApp/iMessage timeout silencieusement sur des images
    // > 500 KB en data mobile → preview vide. Le `/render/image/public/`
    // endpoint Supabase resize + compresse à la volée.
    const rawUrl = cover?.url ?? null
    const imageUrl = rawUrl
      ? rawUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
        (rawUrl.includes('?') ? '&' : '?') +
        'width=1200&height=630&resize=cover&quality=80'
      : null
    return {
      title: row.title ?? row.species_name ?? 'Une observation Naturegraph',
      description:
        row.description ??
        `Découvre cette observation nature partagée par @${username} sur Naturegraph.`,
      imageUrl,
      authorUsername: username,
      species: row.species_name,
    }
  } catch (err) {
    console.error('[post-og] fetch failed:', err)
    return null
  }
}

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

/** Échappe les caractères dangereux dans le HTML pour éviter le XSS. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Tronque proprement une description pour Open Graph (200 caractères max). */
function truncate(s: string, max = 200): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}

/**
 * Construit le HTML minimal servi aux crawlers avec les meta OG dynamiques.
 * Pas de JS — juste les balises essentielles pour le preview.
 */
function buildCrawlerHtml(post: OgPost, postUrl: string): string {
  const safeTitle = escapeHtml(post.title)
  const safeDesc = escapeHtml(truncate(post.description))
  const safeImage = post.imageUrl ? escapeHtml(post.imageUrl) : ''
  const safeUrl = escapeHtml(postUrl)

  const ogImageTags = safeImage
    ? `
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${safeImage}" />`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} · Naturegraph</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${safeUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Naturegraph" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:locale" content="fr_CA" />${ogImageTags}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
</head>
<body>
  <h1>${safeTitle}</h1>
  <p>${safeDesc}</p>
  <p>Partagé par @${escapeHtml(post.authorUsername)} sur Naturegraph.</p>
  <p><a href="${safeUrl}">Voir cette observation sur Naturegraph</a></p>
</body>
</html>`
}

/**
 * HTML générique servi quand le post est introuvable (404). Garde des meta
 * de fallback pour que le preview reste "propre" même sur un lien cassé.
 */
function buildFallbackHtml(postUrl: string): string {
  const safeUrl = escapeHtml(postUrl)
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Naturegraph — Observation</title>
  <meta name="description" content="Naturegraph — partage d'observations nature et biodiversité." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Naturegraph" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:title" content="Naturegraph — Partageons nos émotions" />
  <meta property="og:description" content="Naturegraph — partage d'observations nature et biodiversité." />
  <meta property="og:locale" content="fr_CA" />
</head>
<body>
  <p>Cette observation n'est plus disponible.</p>
  <p><a href="${safeUrl}">Découvrir Naturegraph</a></p>
</body>
</html>`
}

// ─── Handler principal ────────────────────────────────────────────────────────

/**
 * Handler Vercel — appelé pour toutes les requêtes vers /post/:postId via
 * le rewrite défini dans vercel.json.
 *
 * Flow :
 *  1. Si User-Agent = navigateur humain → on lit `index.html` du build et on
 *     le renvoie tel quel (la SPA prend le relais et route vers PostDetail).
 *  2. Si User-Agent = crawler OG → on fetch le post sur Supabase et on
 *     renvoie un HTML avec les meta tags appropriées.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userAgent = req.headers['user-agent']
  // Le param de route peut être un UUID nu ou un slug-uuid. On extrait
  // toujours l'UUID pour la requête DB, mais on garde le slug d'origine
  // dans l'URL canonique pour préserver le SEO du lien partagé.
  const rawParam = (req.query.postId ?? req.query.id) as string | undefined
  const postId = extractUuid(rawParam)
  // V1.0.4 fix CodeQL SSRF : valider l'host header contre une allowlist avant
  // toute construction d'URL. Sans ca, un attaquant pourrait passer
  // `Host: evil.com` pour que la fonction fetch evil.com/index.html (ligne 292).
  const ALLOWED_HOSTS = [
    'naturegraph.ca',
    'www.naturegraph.ca',
    'beta.naturegraph.ca',
    'naturegraph-eight.vercel.app',
  ]
  const rawHost = (req.headers.host ?? '').toLowerCase()
  const isAllowedHost =
    ALLOWED_HOSTS.includes(rawHost) ||
    // Vercel preview deployments : *-naturegraph-*.vercel.app
    /^[a-z0-9-]+\.vercel\.app$/.test(rawHost)
  const host = isAllowedHost ? rawHost : 'naturegraph.ca'
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const postUrl = `${proto}://${host}/post/${rawParam ?? ''}`

  // Navigateur humain → on délègue à la SPA (Vercel servira index.html).
  // On set un statut 200 et on renvoie un rewrite implicite via le SPA :
  // pour rester simple, on construit le même rewrite que la règle générique
  // de vercel.json (sert index.html du build).
  if (!isCrawler(userAgent)) {
    // Récupère le HTML du build Vite (assets/index.html à la racine du output)
    try {
      const indexUrl = `${proto}://${host}/index.html`
      const r = await fetch(indexUrl, {
        headers: { 'cache-control': 'no-cache' },
      })
      const html = await r.text()
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      // Cache court côté CDN pour ne pas re-fetch index.html à chaque hit.
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600')
      res.status(200).send(html)
      return
    } catch (err) {
      console.error('[post-og] index.html fetch failed:', err)
      res.status(500).send('Internal Server Error')
      return
    }
  }

  // Crawler OG → on fetch le post et on renvoie le HTML enrichi.
  if (!postId) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(buildFallbackHtml(postUrl))
    return
  }

  const post = await fetchPostForOg(postId)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  // Cache 5 min côté CDN pour les crawlers (un post change peu après
  // publication, et un nouveau crawl reprendra les nouvelles données).
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600')

  if (post) {
    res.status(200).send(buildCrawlerHtml(post, postUrl))
  } else {
    res.status(200).send(buildFallbackHtml(postUrl))
  }
}
