/**
 * profileMock — Données fictives pour itérer sur la page Profil sans Supabase
 * ============================================================================
 *
 * Tous les profils ici sont 100 % fictifs. Aucune vraie donnée utilisateur.
 * Utilisés par `Profile.tsx` quand le flag `VITE_USE_PROFILE_MOCK=true` ou
 * quand `isSupabaseConfigured` est false.
 *
 * Quand le backend sera prêt (cf. notes second-agent/01) :
 *   - La structure correspond 1:1 à `ProfileDisplayData` (component types)
 *   - Les compteurs viendront des colonnes denormalisées de `profiles`
 *   - L'ADN observateur sera calculé via une RPC dédiée
 *   - Les posts/inspirations viendront de `posts` et `saved_posts`
 *
 * À retirer ou réduire quand on bascule en mode "full backend".
 */

import type { ProfileDisplayData } from '@/components/profile/ProfileHeader'
import type { MockPost } from '@/components/home/FeedPost'

// ─── Profil VISITEUR (Oiseaux_et_Nature) ──────────────────────────────────────

/**
 * Profil exemple "visiteur" — l'utilisateur connecté visite ce profil.
 * Reflète directement le Figma 6385:74429 (desktop) et 6385:70500 (mobile).
 */
export const PROFILE_MOCK_VISITOR: ProfileDisplayData = {
  username: 'Oiseaux_et_Nature',
  bio: "Passionné d'ornithologie et de macrophotographie. J'essaie de documenter la biodiversité urbaine de ma région. Toujours à la recherche de la prochaine espèce rare ! 🦉📸",
  avatar_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=200&h=200&fit=crop',
  banner_url: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=1600&h=400&fit=crop',
  city: 'Ploërmel',
  region: 'Bretagne',
  // % par catégorie taxonomique — calculés sur les contributions
  // (côté backend : RPC qui aggrège `posts.taxonomic_group`)
  interests: [
    { id: 'birds', percent: 50 },
    { id: 'mammals', percent: 35 },
    { id: 'insects', percent: 10 },
  ],
  instagram: 'OiseauxNature',
  website: 'naturephoto.fr',
  // « Migrateurs » = followers, « Migrations » = following (branding Naturegraph)
  followers_count: 1078,
  following_count: 88,
  created_at: '2026-01-12T10:00:00Z',
  badges: ['birds'],
  stats: {
    observations: 80,
    species: 42,
    streak: 12,
  },
  weekProgress: {
    current: 3,
    goal: 5,
  },
}

// ─── Posts fictifs de ce profil (pour le tab "Journal nature") ──────────────────

/**
 * 3 posts fictifs avec photos Unsplash (CC0).
 * Le mock alimente `userPosts` dans Profile.tsx pour voir la grille.
 */
export const PROFILE_MOCK_POSTS: MockPost[] = [
  {
    id: 'mock-post-1',
    authorId: 'mock-visitor',
    postType: 'nature_encounter',
    author: {
      name: 'Oiseaux_et_Nature',
      avatar: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=80&h=80&fit=crop',
      badge: '🦉',
    },
    date: '02/02/2025',
    location: 'Ploërmel, Bretagne',
    title: 'Rencontre matinale en forêt',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim.',
    weather: 'sunny',
    timeOfDay: 'afternoon',
    category: { icon: '🐿️', label: 'Mammifères' },
    species: 'Chevreuil européen',
    scientific_name: 'Capreolus capreolus',
    taxref_id: '61057',
    taxonomic_group: 'mammals',
    individualsCount: 4,
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?w=1200&h=675&fit=crop',
        alt: 'Chevreuil dans une prairie',
        width: 1200,
        height: 675,
      },
    ],
    reactions: { love: 12, admire: 8, fire: 3, wow: 5, curious: 2 },
    userReaction: null,
    totalReactions: 30,
    comments: 4,
  },
  {
    id: 'mock-post-2',
    authorId: 'mock-visitor',
    postType: 'nature_instant',
    author: {
      name: 'Oiseaux_et_Nature',
      avatar: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=80&h=80&fit=crop',
      badge: '🦉',
    },
    date: '02/02/2025',
    location: 'Ploërmel, Bretagne',
    title: 'Sommet sous la neige',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim.',
    weather: 'cloudy',
    timeOfDay: 'afternoon',
    category: { icon: '⛰️', label: 'Mountain' },
    species: null,
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&h=675&fit=crop',
        alt: 'Sommet enneigé',
        width: 1200,
        height: 675,
      },
    ],
    reactions: { love: 5, admire: 3, fire: 1, wow: 8, curious: 0 },
    userReaction: null,
    totalReactions: 17,
    comments: 1,
  },
  {
    id: 'mock-post-3',
    authorId: 'mock-visitor',
    postType: 'nature_encounter',
    author: {
      name: 'Oiseaux_et_Nature',
      avatar: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=80&h=80&fit=crop',
      badge: '🦉',
    },
    date: '28/01/2025',
    location: 'Ploërmel, Bretagne',
    title: 'Couple de martin-pêcheurs au lever',
    content: 'Première observation de couple cette saison — très belle lumière dorée.',
    weather: 'sunny',
    timeOfDay: 'morning',
    category: { icon: '🦉', label: 'Oiseaux' },
    species: "Martin-pêcheur d'Europe",
    scientific_name: 'Alcedo atthis',
    taxref_id: '3343',
    taxonomic_group: 'birds',
    individualsCount: 2,
    format: 'portrait',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1606483956061-46a898dce538?w=900&h=1200&fit=crop',
        alt: 'Martin-pêcheur sur une branche',
        width: 900,
        height: 1200,
      },
    ],
    reactions: { love: 28, admire: 15, fire: 7, wow: 12, curious: 1 },
    userReaction: null,
    totalReactions: 63,
    comments: 9,
  },
]

// ─── Observations sauvegardées (tab "Inspirations" = bookmarks/collection) ─────

/**
 * Posts d'AUTRES utilisateurs que ce profil a sauvegardés ("bookmarks").
 *
 * Backend cible : table `saved_posts (user_id, post_id, created_at)` →
 *   savedPostService.getSavedPostsByUser(userId) renvoie les `posts` joints.
 *
 * Format identique à `MockPost` → on réutilise <FeedGallery> directement
 * dans ProfileInspirations (mêmes hover, lightbox, badge multi-photos, etc.).
 *
 * Ratios variés (16:9 / portrait / 1:1) pour exploiter le masonry.
 */
export const PROFILE_MOCK_INSPIRATIONS: MockPost[] = [
  {
    id: 'saved-post-1',
    authorId: 'mock-marie',
    postType: 'nature_encounter',
    author: {
      name: 'Marie_Nature',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
      badge: '🦅',
    },
    date: '15/04/2026',
    location: 'Brocéliande, Bretagne',
    title: "Rouge-gorge à l'orée du bois",
    content: 'Première observation matinale, posé tranquillement sur une branche.',
    weather: 'sunny',
    timeOfDay: 'morning',
    category: { icon: '🦉', label: 'Oiseaux' },
    species: 'Rouge-gorge familier',
    scientific_name: 'Erithacus rubecula',
    taxref_id: '4001',
    taxonomic_group: 'birds',
    format: 'portrait',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=900&h=1200&fit=crop',
        alt: 'Rouge-gorge sur une branche',
        width: 900,
        height: 1200,
      },
    ],
    reactions: { love: 22, admire: 14, fire: 5, wow: 8, curious: 1 },
    userReaction: null,
    totalReactions: 50,
    comments: 6,
  },
  {
    id: 'saved-post-2',
    authorId: 'mock-thomas',
    postType: 'nature_encounter',
    author: {
      name: 'Thomas.Wildlife',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',
      badge: '🦊',
    },
    date: '10/04/2026',
    location: "Côte d'Armor",
    title: 'Renard roux au crépuscule',
    content: 'Croisement inattendu en lisière de forêt — il est resté immobile quelques secondes.',
    weather: 'cloudy',
    timeOfDay: 'evening',
    category: { icon: '🐿️', label: 'Mammifères' },
    species: 'Renard roux',
    scientific_name: 'Vulpes vulpes',
    taxref_id: '60585',
    taxonomic_group: 'mammals',
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=1200&h=675&fit=crop',
        alt: 'Renard roux dans la nature',
        width: 1200,
        height: 675,
      },
      {
        url: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=1200&h=675&fit=crop',
        alt: 'Paysage de campagne',
        width: 1200,
        height: 675,
      },
    ],
    reactions: { love: 45, admire: 28, fire: 12, wow: 15, curious: 3 },
    userReaction: null,
    totalReactions: 103,
    comments: 14,
  },
  {
    id: 'saved-post-3',
    authorId: 'mock-lila',
    postType: 'nature_instant',
    author: {
      name: 'Lila_PetitsBoisFrais',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
      badge: '🌿',
    },
    date: '08/04/2026',
    location: 'Forêt de Paimpont',
    title: 'Coquelicots dans les blés',
    content: 'Tapis rouge inattendu en bordure de champ.',
    weather: 'sunny',
    timeOfDay: 'afternoon',
    category: { icon: '🌸', label: 'Plantes' },
    species: 'Coquelicot',
    scientific_name: 'Papaver rhoeas',
    taxref_id: '113579',
    taxonomic_group: 'plants',
    individualsCount: 30,
    format: '1:1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800&h=800&fit=crop',
        alt: 'Champ de coquelicots',
        width: 800,
        height: 800,
      },
    ],
    reactions: { love: 18, admire: 11, fire: 2, wow: 6, curious: 0 },
    userReaction: null,
    totalReactions: 37,
    comments: 3,
  },
  {
    id: 'saved-post-4',
    authorId: 'mock-marie',
    postType: 'nature_encounter',
    author: {
      name: 'Marie_Nature',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
      badge: '🦅',
    },
    date: '02/04/2026',
    location: 'Étang de Comper',
    title: 'Martin-pêcheur en plongée',
    content: 'Une fraction de seconde avant la plongée — pure chance.',
    weather: 'sunny',
    timeOfDay: 'morning',
    category: { icon: '🦉', label: 'Oiseaux' },
    species: "Martin-pêcheur d'Europe",
    scientific_name: 'Alcedo atthis',
    taxref_id: '3343',
    taxonomic_group: 'birds',
    format: 'portrait',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1551763196-c4d35c1c3c8a?w=900&h=1200&fit=crop',
        alt: 'Martin-pêcheur',
        width: 900,
        height: 1200,
      },
    ],
    reactions: { love: 60, admire: 42, fire: 25, wow: 30, curious: 4 },
    userReaction: null,
    totalReactions: 161,
    comments: 22,
  },
  {
    id: 'saved-post-5',
    authorId: 'mock-thomas',
    postType: 'nature_encounter',
    author: {
      name: 'Thomas.Wildlife',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',
      badge: '🦊',
    },
    date: '28/03/2026',
    location: 'Cap Fréhel',
    title: 'Falaise au lever du soleil',
    content: 'Lumière dorée incroyable ce matin-là.',
    weather: 'sunny',
    timeOfDay: 'morning',
    category: { icon: '⛰️', label: 'Paysage' },
    species: null,
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=675&fit=crop',
        alt: 'Falaise',
        width: 1200,
        height: 675,
      },
    ],
    reactions: { love: 30, admire: 22, fire: 8, wow: 18, curious: 2 },
    userReaction: null,
    totalReactions: 80,
    comments: 5,
  },
  {
    id: 'saved-post-6',
    authorId: 'mock-lila',
    postType: 'nature_encounter',
    author: {
      name: 'Lila_PetitsBoisFrais',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
      badge: '🌿',
    },
    date: '22/03/2026',
    location: 'Bois de Lanvaux',
    title: 'Chevreuil au matin',
    content: 'Surpris en plein brame — silence total dans la forêt.',
    weather: 'cloudy',
    timeOfDay: 'morning',
    category: { icon: '🐿️', label: 'Mammifères' },
    species: 'Chevreuil européen',
    scientific_name: 'Capreolus capreolus',
    taxref_id: '61057',
    taxonomic_group: 'mammals',
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?w=1200&h=675&fit=crop',
        alt: 'Chevreuil dans la prairie',
        width: 1200,
        height: 675,
      },
    ],
    reactions: { love: 25, admire: 16, fire: 4, wow: 10, curious: 1 },
    userReaction: null,
    totalReactions: 56,
    comments: 8,
  },
]

// ─── Communauté : Migrateurs / Migrations (followers list) ─────────────────────

/**
 * Carte communauté — version "rich" avec banner + compteur own followers.
 * Utilisée par ProfileCommunity pour afficher les Migrateurs/Migrations.
 *
 * Backend cible (Phase 2) :
 *   SELECT p.username, p.avatar_url, p.banner_url, p.followers_count
 *   FROM follows f JOIN profiles p ON p.id = f.follower_id
 *   WHERE f.following_id = $1 ORDER BY f.created_at DESC LIMIT 20 OFFSET $cursor;
 */
export interface CommunityUser {
  id: string
  username: string
  avatar_url: string
  banner_url: string
  followers_count: number
  /** L'utilisateur connecté suit-il déjà cette personne ? */
  is_followed_by_me: boolean
}

/**
 * Liste fictive de comptes qui suivent ce profil — onglet Communauté.
 * En backend : SELECT depuis `follows` WHERE following_id = profile.id.
 */
export const PROFILE_MOCK_FOLLOWERS: CommunityUser[] = [
  {
    id: 'mock-follower-1',
    username: 'Oiseaux_et_Nature',
    avatar_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1606483956061-46a898dce538?w=600&h=240&fit=crop',
    followers_count: 214,
    is_followed_by_me: true,
  },
  {
    id: 'mock-follower-2',
    username: 'Ciel_Étoilé',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=600&h=240&fit=crop',
    followers_count: 324,
    is_followed_by_me: false,
  },
  {
    id: 'mock-follower-3',
    username: 'Ailes_de_Lumière',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=240&fit=crop',
    followers_count: 217,
    is_followed_by_me: false,
  },
  {
    id: 'mock-follower-4',
    username: 'Trousseaux_de_Nuages',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1493514789931-586cb221d7a7?w=600&h=240&fit=crop',
    followers_count: 452,
    is_followed_by_me: true,
  },
  {
    id: 'mock-follower-5',
    username: 'Voyageurs_Silencieux',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=240&fit=crop',
    followers_count: 189,
    is_followed_by_me: false,
  },
  {
    id: 'mock-follower-6',
    username: 'Danseurs_de_Vent',
    avatar_url: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=600&h=240&fit=crop',
    followers_count: 301,
    is_followed_by_me: false,
  },
  {
    id: 'mock-follower-7',
    username: 'Lumières_du_Sous-Bois',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=240&fit=crop',
    followers_count: 178,
    is_followed_by_me: false,
  },
  {
    id: 'mock-follower-8',
    username: 'Plumes_Discrètes',
    avatar_url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=600&h=240&fit=crop',
    followers_count: 256,
    is_followed_by_me: false,
  },
  {
    id: 'mock-follower-9',
    username: 'Sous_le_Roseau',
    avatar_url: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600&h=240&fit=crop',
    followers_count: 145,
    is_followed_by_me: true,
  },
]

/**
 * Comptes que ce profil suit (Migrations / following).
 * Backend : SELECT depuis `follows` WHERE follower_id = profile.id.
 */
export const PROFILE_MOCK_FOLLOWING: CommunityUser[] = [
  {
    id: 'mock-following-1',
    username: 'Forêts_Anciennes',
    avatar_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&h=240&fit=crop',
    followers_count: 1208,
    is_followed_by_me: true,
  },
  {
    id: 'mock-following-2',
    username: 'Brumes_Matinales',
    avatar_url: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=600&h=240&fit=crop',
    followers_count: 689,
    is_followed_by_me: true,
  },
  {
    id: 'mock-following-3',
    username: 'Petits_Riens',
    avatar_url: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=120&h=120&fit=crop',
    banner_url: 'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=600&h=240&fit=crop',
    followers_count: 432,
    is_followed_by_me: true,
  },
]
