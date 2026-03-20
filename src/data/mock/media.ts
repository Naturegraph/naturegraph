/**
 * Données mockées pour les médias
 * Chaque post contient entre 1 et 4 médias
 */

export type MediaType = 'photo' | 'video'

export type MediaFormat =
  | 'square' // 1:1
  | 'portrait' // 3:4 ou 9:16
  | 'landscape' // 16:9
  | 'free' // Format libre / avancé

export type MediaOrientation = 'horizontal' | 'vertical' | 'square'

export interface Media {
  id: string
  postId: string
  type: MediaType
  format: MediaFormat
  orientation: MediaOrientation
  url: string // URL mockée (placeholder)
  displayOrder: number // Ordre d'affichage (1, 2, 3, 4)
  alt?: string // Description pour l'accessibilité
  width?: number
  height?: number
}

/**
 * Données mockées de médias
 * 1-4 médias par post avec des URLs placeholder
 */
export const mockMedia: Media[] = [
  // Post 001 - Marie - Mésanges charbonnières
  {
    id: 'media_001',
    postId: 'post_001',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1551189305-26d25c2a0eac?w=800',
    displayOrder: 1,
    alt: 'Mésange charbonnière sur une branche',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_002',
    postId: 'post_001',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800',
    displayOrder: 2,
    alt: 'Jeune mésange dans le nid',
    width: 1600,
    height: 900,
  },

  // Post 002 - Marie - Lever de soleil
  {
    id: 'media_003',
    postId: 'post_002',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
    displayOrder: 1,
    alt: 'Lever de soleil sur le parc',
    width: 1600,
    height: 900,
  },

  // Post 003 - Marie - Écureuil roux
  {
    id: 'media_004',
    postId: 'post_003',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1544552866-df4564d6e4d1?w=800',
    displayOrder: 1,
    alt: 'Écureuil roux avec une noisette',
    width: 900,
    height: 1200,
  },
  {
    id: 'media_005',
    postId: 'post_003',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=800',
    displayOrder: 2,
    alt: 'Écureuil en train de manger',
    width: 1000,
    height: 1000,
  },
  {
    id: 'media_006',
    postId: 'post_003',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1582463269797-9e2a63ef4abb?w=800',
    displayOrder: 3,
    alt: 'Écureuil dans un arbre',
    width: 1600,
    height: 900,
  },

  // Post 004 - Marie - Pissenlit
  {
    id: 'media_007',
    postId: 'post_004',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=800',
    displayOrder: 1,
    alt: 'Fleurs de pissenlit',
    width: 1000,
    height: 1000,
  },

  // Post 005 - Marie - Brouillard
  {
    id: 'media_008',
    postId: 'post_005',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800',
    displayOrder: 1,
    alt: 'Forêt dans le brouillard',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_009',
    postId: 'post_005',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
    displayOrder: 2,
    alt: 'Arbres dans le brouillard',
    width: 900,
    height: 1200,
  },

  // Post 006 - Thomas - Martin-pêcheur
  {
    id: 'media_010',
    postId: 'post_006',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800',
    displayOrder: 1,
    alt: 'Martin-pêcheur sur une branche',
    width: 1600,
    height: 900,
  },

  // Post 007 - Thomas - Bernaches
  {
    id: 'media_011',
    postId: 'post_007',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    displayOrder: 1,
    alt: 'Vol de bernaches',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_012',
    postId: 'post_007',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=800',
    displayOrder: 2,
    alt: 'Groupe de bernaches au sol',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_013',
    postId: 'post_007',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800',
    displayOrder: 3,
    alt: 'Bernache en vol',
    width: 1000,
    height: 1000,
  },

  // Post 008 - Thomas - Héron cendré
  {
    id: 'media_014',
    postId: 'post_008',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1580473395885-89efe9370d37?w=800',
    displayOrder: 1,
    alt: "Héron cendré à l'affût",
    width: 900,
    height: 1200,
  },
  {
    id: 'media_015',
    postId: 'post_008',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    displayOrder: 2,
    alt: "Héron au bord de l'eau",
    width: 1600,
    height: 900,
  },

  // Post 009 - Thomas - Rouge-gorge
  {
    id: 'media_016',
    postId: 'post_009',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800',
    displayOrder: 1,
    alt: 'Rouge-gorge sur une branche',
    width: 1000,
    height: 1000,
  },

  // Post 010 - Thomas - Faucon crécerelle
  {
    id: 'media_017',
    postId: 'post_010',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    displayOrder: 1,
    alt: 'Faucon crécerelle en vol',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_018',
    postId: 'post_010',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    displayOrder: 2,
    alt: 'Faucon en vol stationnaire',
    width: 900,
    height: 1200,
  },

  // Post 011 - Sophie - Orchidée
  {
    id: 'media_019',
    postId: 'post_011',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
    displayOrder: 1,
    alt: 'Orchidée sauvage en fleur',
    width: 900,
    height: 1200,
  },
  {
    id: 'media_020',
    postId: 'post_011',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=800',
    displayOrder: 2,
    alt: "Détail de l'orchidée",
    width: 1000,
    height: 1000,
  },

  // Post 012 - Sophie - Abeille
  {
    id: 'media_021',
    postId: 'post_012',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=800',
    displayOrder: 1,
    alt: 'Abeille butinant une fleur',
    width: 1000,
    height: 1000,
  },

  // Post 013 - Sophie - Mousse
  {
    id: 'media_022',
    postId: 'post_013',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=800',
    displayOrder: 1,
    alt: 'Mousse sur un tronc',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_023',
    postId: 'post_013',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800',
    displayOrder: 2,
    alt: 'Gros plan sur la mousse',
    width: 1000,
    height: 1000,
  },
  {
    id: 'media_024',
    postId: 'post_013',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800',
    displayOrder: 3,
    alt: 'Tronc couvert de mousse',
    width: 900,
    height: 1200,
  },

  // Post 014 - Sophie - Fougères
  {
    id: 'media_025',
    postId: 'post_014',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
    displayOrder: 1,
    alt: 'Fougères vertes',
    width: 1600,
    height: 900,
  },

  // Post 015 - Sophie - Arc-en-ciel
  {
    id: 'media_026',
    postId: 'post_015',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
    displayOrder: 1,
    alt: "Arc-en-ciel après l'orage",
    width: 1600,
    height: 900,
  },
  {
    id: 'media_027',
    postId: 'post_015',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800',
    displayOrder: 2,
    alt: 'Paysage avec arc-en-ciel',
    width: 1000,
    height: 1000,
  },

  // Post 016 - Lucas - Chevreuil
  {
    id: 'media_028',
    postId: 'post_016',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1551817958-d9d86fb29431?w=800',
    displayOrder: 1,
    alt: 'Chevreuil mâle en lisière',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_029',
    postId: 'post_016',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=800',
    displayOrder: 2,
    alt: 'Portrait du chevreuil',
    width: 900,
    height: 1200,
  },
  {
    id: 'media_030',
    postId: 'post_016',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    displayOrder: 3,
    alt: 'Chevreuil en forêt',
    width: 1600,
    height: 900,
  },

  // Post 017 - Lucas - Sommet enneigé
  {
    id: 'media_031',
    postId: 'post_017',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800',
    displayOrder: 1,
    alt: 'Sommet du Vercors enneigé',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_032',
    postId: 'post_017',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    displayOrder: 2,
    alt: 'Paysage montagnard',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_033',
    postId: 'post_017',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
    displayOrder: 3,
    alt: 'Neige fraîche',
    width: 1000,
    height: 1000,
  },
  {
    id: 'media_034',
    postId: 'post_017',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    displayOrder: 4,
    alt: 'Vue verticale du sommet',
    width: 900,
    height: 1200,
  },

  // Post 018 - Lucas - Pic épeiche
  {
    id: 'media_035',
    postId: 'post_018',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1551189305-26d25c2a0eac?w=800',
    displayOrder: 1,
    alt: 'Pic épeiche sur un tronc',
    width: 900,
    height: 1200,
  },

  // Post 019 - Lucas - Salamandre
  {
    id: 'media_036',
    postId: 'post_019',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=800',
    displayOrder: 1,
    alt: 'Salamandre tachetée',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_037',
    postId: 'post_019',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
    displayOrder: 2,
    alt: 'Gros plan salamandre',
    width: 1000,
    height: 1000,
  },

  // Post 020 - Lucas - Champignons
  {
    id: 'media_038',
    postId: 'post_020',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800',
    displayOrder: 1,
    alt: 'Champignons en forêt',
    width: 1000,
    height: 1000,
  },
  {
    id: 'media_039',
    postId: 'post_020',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=800',
    displayOrder: 2,
    alt: 'Variété de champignons',
    width: 1600,
    height: 900,
  },

  // Post 021 - Julie - Coccinelle
  {
    id: 'media_040',
    postId: 'post_021',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=800',
    displayOrder: 1,
    alt: 'Coccinelle à sept points',
    width: 1000,
    height: 1000,
  },
  {
    id: 'media_041',
    postId: 'post_021',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=800',
    displayOrder: 2,
    alt: 'Macro coccinelle',
    width: 1600,
    height: 900,
  },

  // Post 022 - Julie - Araignée
  {
    id: 'media_042',
    postId: 'post_022',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
    displayOrder: 1,
    alt: 'Épeire diadème sur sa toile',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_043',
    postId: 'post_022',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800',
    displayOrder: 2,
    alt: 'Détail de la toile',
    width: 1000,
    height: 1000,
  },
  {
    id: 'media_044',
    postId: 'post_022',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=800',
    displayOrder: 3,
    alt: 'Gros plan araignée',
    width: 900,
    height: 1200,
  },

  // Post 023 - Julie - Escargot
  {
    id: 'media_045',
    postId: 'post_023',
    type: 'photo',
    format: 'portrait',
    orientation: 'vertical',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
    displayOrder: 1,
    alt: 'Escargot de Bourgogne',
    width: 900,
    height: 1200,
  },

  // Post 024 - Julie - Libellule
  {
    id: 'media_046',
    postId: 'post_024',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=800',
    displayOrder: 1,
    alt: 'Libellule déprimée',
    width: 1600,
    height: 900,
  },
  {
    id: 'media_047',
    postId: 'post_024',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=800',
    displayOrder: 2,
    alt: 'Détail des ailes',
    width: 1000,
    height: 1000,
  },

  // Post 025 - Julie - Papillon citron
  {
    id: 'media_048',
    postId: 'post_025',
    type: 'photo',
    format: 'square',
    orientation: 'square',
    url: 'https://images.unsplash.com/photo-1558818498-28c1e002b655?w=800',
    displayOrder: 1,
    alt: 'Papillon citron',
    width: 1000,
    height: 1000,
  },
  {
    id: 'media_049',
    postId: 'post_025',
    type: 'photo',
    format: 'landscape',
    orientation: 'horizontal',
    url: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800',
    displayOrder: 2,
    alt: 'Papillon sur une fleur',
    width: 1600,
    height: 900,
  },
]

/**
 * Fonction utilitaire pour simuler un appel API
 */
export async function fetchMedia(): Promise<Media[]> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockMedia
}

/**
 * Fonction utilitaire pour récupérer un média par son ID
 */
export async function fetchMediaById(id: string): Promise<Media | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockMedia.find((media) => media.id === id)
}

/**
 * Fonction utilitaire pour récupérer les médias d'un post
 */
export async function fetchMediaByPostId(postId: string): Promise<Media[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return mockMedia
    .filter((media) => media.postId === postId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
}

/**
 * Fonction utilitaire pour récupérer les médias par type
 */
export async function fetchMediaByType(type: MediaType): Promise<Media[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return mockMedia.filter((media) => media.type === type)
}
