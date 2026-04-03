/**
 * Mock users — profils fictifs pour dev/tests
 * Utiliser uniquement en l'absence de données Supabase.
 *
 * Chaque MockUser contient : avatar, bannière, bio, intérêts,
 * réseaux sociaux, statistiques Migrateurs/Migrations, inspirations.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Intérêt d'un utilisateur avec pourcentage calculé sur ses observations */
export interface UserInterest {
  id: string
  percent: number
}

/** Profil fictif complet utilisé dans toute l'application */
export interface MockUser {
  id: string
  username: string
  avatar: string
  banner: string
  badges: string[]
  region: string
  bio: string
  interests: UserInterest[]
  instagram: string | null
  website: string | null
  followers_count: number
  following_count: number
  city: string | null
  created_at: string
  /** IDs de posts sauvegardés — utilisés pour l'onglet Inspirations */
  saved_posts: string[]
  /** URLs Unsplash pour la galerie Inspirations */
  inspiration_photos: string[]
  stats: {
    observations: number
    species: number
    streak: number
  }
  weekProgress: {
    current: number
    goal: number
  }
}

// ─── Configuration des centres d'intérêt ─────────────────────────────────────

/**
 * Config complète des centres d'intérêt : ID → label + emoji.
 * Source de vérité pour l'éditeur de profil et l'ADN de l'observateur.
 */
export const INTEREST_CONFIG: Record<string, { label: string; emoji: string }> = {
  birds: { label: 'Oiseaux', emoji: '🦉' },
  mammals: { label: 'Mammifères', emoji: '🐿' },
  insects: { label: 'Insectes', emoji: '🐝' },
  amphibians: { label: 'Amphibiens', emoji: '🐸' },
  reptiles: { label: 'Reptiles', emoji: '🦎' },
  arachnids: { label: 'Arachnides', emoji: '🕷' },
  mollusks: { label: 'Mollusques', emoji: '🐌' },
  fish: { label: 'Poissons', emoji: '🐠' },
  plants: { label: 'Plantes', emoji: '🌿' },
  other: { label: 'Autre', emoji: '🌍' },
}

/**
 * Labels français pour la rétro-compatibilité avec l'ancienne API.
 * Dérivé de INTEREST_CONFIG — ne pas modifier directement.
 */
export const INTEREST_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(INTEREST_CONFIG).map(([k, v]) => [k, v.label]),
)

// ─── Photos d'inspiration partagées ──────────────────────────────────────────

/** Pool de photos nature Unsplash pour les galeries d'inspiration */
const NATURE_PHOTOS = [
  'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&q=80',
  'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=600&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=600&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80',
  'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=600&q=80',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600&q=80',
  'https://images.unsplash.com/photo-1526749837599-b4eba9fd855e?w=600&q=80',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=80',
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&q=80',
  'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&q=80',
  'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=600&q=80',
  'https://images.unsplash.com/photo-1497752531616-c3afd9760a11?w=600&q=80',
  'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=600&q=80',
  'https://images.unsplash.com/photo-1521671413015-ce1d8f7c0e7d?w=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'https://images.unsplash.com/photo-1484406566174-9da000fda645?w=600&q=80',
  'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=600&q=80',
]

// ─── Données mockUsers ────────────────────────────────────────────────────────

export const mockUsers: MockUser[] = [
  {
    id: '1',
    username: 'Oiseaux_et_Nature',
    avatar:
      'https://images.unsplash.com/photo-1569171133563-f562ae163dc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['birds', 'mammals'],
    region: 'Bretagne',
    bio: "Passionné d'ornithologie depuis 15 ans. Je parcours les forêts et zones humides de Bretagne à la recherche de raretés. Chaque observation est une découverte !",
    interests: [
      { id: 'birds', percent: 60 },
      { id: 'mammals', percent: 25 },
      { id: 'insects', percent: 10 },
      { id: 'plants', percent: 5 },
    ],
    instagram: 'oiseaux_et_nature',
    website: 'https://oiseaux-bretagne.fr',
    followers_count: 1078,
    following_count: 88,
    city: 'Rennes',
    created_at: '2024-03-15T00:00:00Z',
    saved_posts: ['p2', 'p3', 'p5'],
    inspiration_photos: NATURE_PHOTOS.slice(0, 12),
    stats: { observations: 127, species: 48, streak: 14 },
    weekProgress: { current: 20, goal: 24 },
  },
  {
    id: '2',
    username: 'Marie_Nature',
    avatar:
      'https://images.unsplash.com/photo-1644313720910-9a2520bbd28f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['birds', 'reptiles'],
    region: 'Bretagne',
    bio: 'Naturaliste de terrain. Fascinée par les reptiles et les oiseaux côtiers. Membre active de la LPO Bretagne et du GRETIA.',
    interests: [
      { id: 'birds', percent: 45 },
      { id: 'reptiles', percent: 35 },
      { id: 'amphibians', percent: 15 },
      { id: 'plants', percent: 5 },
    ],
    instagram: 'marie.nature.bretagne',
    website: null,
    followers_count: 642,
    following_count: 210,
    city: 'Ploërmel',
    created_at: '2024-01-20T00:00:00Z',
    saved_posts: ['p1', 'p4'],
    inspiration_photos: NATURE_PHOTOS.slice(4, 16),
    stats: { observations: 203, species: 67, streak: 28 },
    weekProgress: { current: 18, goal: 20 },
  },
  {
    id: '3',
    username: 'Thomas.Wildlife',
    avatar:
      'https://images.unsplash.com/photo-1726167400703-240b34c4bc17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1665410618173-2ffade789974?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['insects', 'birds'],
    region: 'Normandie',
    bio: "Entomologiste amateur, je m'intéresse particulièrement aux Lépidoptères et Odonates. En quête de nouvelles espèces à chaque sortie.",
    interests: [
      { id: 'insects', percent: 50 },
      { id: 'birds', percent: 30 },
      { id: 'plants', percent: 15 },
      { id: 'arachnids', percent: 5 },
    ],
    instagram: null,
    website: 'https://thomas-wildlife.com',
    followers_count: 321,
    following_count: 145,
    city: 'Caen',
    created_at: '2024-05-10T00:00:00Z',
    saved_posts: ['p1', 'p2'],
    inspiration_photos: NATURE_PHOTOS.slice(8, 20),
    stats: { observations: 89, species: 34, streak: 7 },
    weekProgress: { current: 12, goal: 15 },
  },
  {
    id: '4',
    username: 'Lucas_Ornitho',
    avatar:
      'https://images.unsplash.com/photo-1671138552270-207fbe2a498d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['birds'],
    region: 'Île-de-France',
    bio: 'Ornithologue passionné basé en Île-de-France. Je documente les oiseaux urbains et péri-urbains. Contributeur VisioNature et Naturegraph.',
    interests: [
      { id: 'birds', percent: 75 },
      { id: 'mammals', percent: 15 },
      { id: 'plants', percent: 10 },
    ],
    instagram: 'lucas_ornitho_idf',
    website: null,
    followers_count: 892,
    following_count: 312,
    city: 'Paris',
    created_at: '2023-11-08T00:00:00Z',
    saved_posts: ['p3', 'p5'],
    inspiration_photos: NATURE_PHOTOS.slice(2, 14),
    stats: { observations: 156, species: 52, streak: 21 },
    weekProgress: { current: 22, goal: 25 },
  },
  {
    id: '5',
    username: 'Sophie_Biodiv',
    avatar:
      'https://images.unsplash.com/photo-1600174097100-3f347cf15996?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    banner:
      'https://images.unsplash.com/photo-1689094195667-3dae89dd11fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
    badges: ['mammals', 'reptiles'],
    region: 'Pays de la Loire',
    bio: 'Chercheuse en écologie et naturaliste engagée. Je m\'intéresse à la biodiversité des zones humides et des prairies. Auteure du blog "Biodiversité & Territoire".',
    interests: [
      { id: 'mammals', percent: 40 },
      { id: 'reptiles', percent: 30 },
      { id: 'amphibians', percent: 20 },
      { id: 'plants', percent: 10 },
    ],
    instagram: 'sophie.biodiv',
    website: 'https://biodiversite-territoire.fr',
    followers_count: 487,
    following_count: 178,
    city: 'Nantes',
    created_at: '2024-02-14T00:00:00Z',
    saved_posts: ['p1', 'p2', 'p4'],
    inspiration_photos: NATURE_PHOTOS.slice(6, 18),
    stats: { observations: 145, species: 41, streak: 19 },
    weekProgress: { current: 15, goal: 18 },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Shuffle déterministe via LCG — seed identique → même ordre */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223
    const j = Math.abs(s) % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Rotation quotidienne déterministe — change chaque jour, stable dans la journée */
export function getDailyRotation(count: number, excludeId?: string): MockUser[] {
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  const seed = new Date()
    .toDateString()
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return seededShuffle(pool, seed).slice(0, count)
}

/** Décode des coordonnées GPS en région française (approximatif — usage mock) */
function getRegionFromCoords(lat: number, lon: number): string {
  if (lat >= 47.0 && lat <= 49.0 && lon >= -5.5 && lon <= -1.0) return 'Bretagne'
  if (lat >= 48.5 && lat <= 50.5 && lon >= -2.0 && lon <= 2.0) return 'Normandie'
  if (lat >= 48.5 && lat <= 49.2 && lon >= 1.5 && lon <= 3.5) return 'Île-de-France'
  if (lat >= 46.5 && lat <= 48.0 && lon >= -3.0 && lon <= 1.0) return 'Pays de la Loire'
  if (lat >= 42.0 && lat <= 44.5 && lon >= 0.0 && lon <= 5.0) return 'Occitanie'
  return ''
}

/**
 * Utilisateurs populaires dans le territoire de l'utilisateur.
 * Retourne aussi le label de région pour l'affichage.
 * En l'absence de correspondance, retourne la rotation quotidienne.
 */
export function getTerritoryUsers(
  lat: number,
  lon: number,
  count: number,
  excludeId?: string,
): { users: MockUser[]; region: string } {
  const region = getRegionFromCoords(lat, lon)
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  const inRegion = pool.filter((u) => u.region === region)

  if (region && inRegion.length >= count) {
    return { users: inRegion.slice(0, count), region }
  }

  // Complète avec la rotation du jour si pas assez dans la région
  const seed = new Date()
    .toDateString()
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const others = seededShuffle(
    pool.filter((u) => !inRegion.includes(u)),
    seed,
  )
  return {
    users: [...inRegion, ...others].slice(0, count),
    region: region || 'France',
  }
}

/**
 * Suggestions basées sur les centres d'intérêts.
 * Trie les utilisateurs par nombre d'intérêts communs (descendant).
 * Fallback sur la rotation quotidienne si l'utilisateur n'a pas d'intérêts.
 */
export function getSuggestedUsersByInterests(
  interestLabels: string[],
  count: number,
  excludeId?: string,
): MockUser[] {
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  if (!interestLabels.length) return getDailyRotation(count, excludeId)

  const scored = pool
    .map((u) => ({ user: u, score: u.badges.filter((b) => interestLabels.includes(b)).length }))
    .sort((a, b) => b.score - a.score)

  return scored.map((s) => s.user).slice(0, count)
}

/** Retourne n utilisateurs aléatoires en excluant l'utilisateur courant */
export function getRandomMockUsers(count: number, excludeId?: string): MockUser[] {
  const pool = excludeId ? mockUsers.filter((u) => u.id !== excludeId) : mockUsers
  return pool.slice(0, count)
}
