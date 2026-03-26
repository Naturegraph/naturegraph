/**
 * Mock posts — partages fictifs pour dev/tests
 * Utilisés pour le feed en mode invité et en développement.
 */

export interface MockPost {
  id: string
  author: {
    name: string
    avatar: string
    badge?: string
  }
  date: string
  location: string
  title: string
  content: string
  weather?: string
  clouds?: string
  timeOfDay?: string
  category: {
    icon: string
    label: string
  }
  species: string
  format: '16:9' | 'portrait' | '1:1'
  images: Array<{ url: string; alt: string }>
  reactions: {
    love: number
    admire: number
    fire: number
    wow: number
    curious: number
  }
  comments: number
}

export const mockPosts: MockPost[] = [
  {
    id: 'p1',
    author: {
      name: 'Marie_Nature',
      avatar:
        'https://images.unsplash.com/photo-1644313720910-9a2520bbd28f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      badge: '🦉',
    },
    date: '02/02/2025',
    location: 'Ploërmel, Bretagne',
    title: 'Rencontre matinale en forêt',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim.',
    weather: '☀️ Ensoleillé',
    clouds: '⛅ Nuageux',
    timeOfDay: 'Après-midi',
    category: { icon: '🦌', label: 'Mammifères' },
    species: 'Chevreuil européen (4)',
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1511172889608-21d24d0d1995?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Chevreuil en forêt',
      },
      {
        url: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Cerf dans la forêt',
      },
      {
        url: 'https://images.unsplash.com/photo-1474511320723-9a56873867b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Renard roux',
      },
      {
        url: 'https://images.unsplash.com/photo-1507666664098-cc3f0bc2e75d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Écureuil',
      },
    ],
    reactions: { love: 19, admire: 14, fire: 42, wow: 7, curious: 19 },
    comments: 8,
  },
  {
    id: 'p2',
    author: {
      name: 'Thomas.Wildlife',
      avatar:
        'https://images.unsplash.com/photo-1726167400703-240b34c4bc17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      badge: '🐛',
    },
    date: '01/02/2025',
    location: 'Forêt de Brocéliande',
    title: "Première sortie de l'année",
    content:
      "Superbe matinée dans la forêt de Brocéliande. La brume du matin offrait un spectacle absolument féerique entre les vieux chênes. J'ai pu observer plusieurs espèces de passereaux nicheurs ainsi qu'une magnifique buse variable planant au-dessus de la cime des arbres.",
    weather: '🌫️ Brumeux',
    timeOfDay: 'Matin',
    category: { icon: '🦜', label: 'Oiseaux' },
    species: 'Buse variable',
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Oiseau dans la brume',
      },
      {
        url: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Forêt matinale',
      },
    ],
    reactions: { love: 34, admire: 28, fire: 15, wow: 12, curious: 9 },
    comments: 14,
  },
  {
    id: 'p3',
    author: {
      name: 'Lucas_Ornitho',
      avatar:
        'https://images.unsplash.com/photo-1671138552270-207fbe2a498d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      badge: '🦅',
    },
    date: '31/01/2025',
    location: 'Lac de Grand-Lieu, Loire-Atlantique',
    title: 'Hivernants sur le lac',
    content:
      "Une journée exceptionnelle au Lac de Grand-Lieu pour observer les oiseaux hivernants. Des milliers de canards et de foulques macroules couvrent la surface de l'eau. La lumière rasante de fin de journée offrait des conditions photographiques parfaites.",
    weather: '🌤️ Nuageux',
    timeOfDay: 'Soir',
    category: { icon: '🦆', label: 'Oiseaux' },
    species: 'Canard souchet',
    format: '16:9',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Oiseaux sur lac',
      },
    ],
    reactions: { love: 45, admire: 38, fire: 22, wow: 31, curious: 17 },
    comments: 21,
  },
  {
    id: 'p4',
    author: {
      name: 'Sophie_Biodiv',
      avatar:
        'https://images.unsplash.com/photo-1600174097100-3f347cf15996?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    },
    date: '30/01/2025',
    location: 'Marais de Brière',
    title: 'Sortie insectes hivernants',
    content:
      "Malgré les températures fraîches, j'ai découvert plusieurs espèces remarquables dans les zones humides des marais de Brière. Un criquet très coloré se réchauffait au soleil sur une tige sèche.",
    weather: '☀️ Ensoleillé',
    timeOfDay: 'Après-midi',
    category: { icon: '🦗', label: 'Insectes' },
    species: 'Criquet mélodieux',
    format: '1:1',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Insecte sur tige',
      },
    ],
    reactions: { love: 28, admire: 22, fire: 11, wow: 19, curious: 35 },
    comments: 9,
  },
  {
    id: 'p5',
    author: {
      name: 'Oiseaux_et_Nature',
      avatar:
        'https://images.unsplash.com/photo-1569171133563-f562ae163dc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
      badge: '🦉',
    },
    date: '29/01/2025',
    location: 'Côte de Granit Rose, Bretagne',
    title: 'Tempête côtière spectaculaire',
    content:
      "Les vagues déchainées de la tempête offrent un spectacle inoubliable sur la Côte de Granit Rose. J'ai observé plusieurs goélands et fous de Bassan pêcher dans les eaux agitées. La puissance de la nature dans toute sa splendeur.",
    weather: '🌊 Tempête',
    timeOfDay: 'Matin',
    category: { icon: '🌊', label: 'Paysages' },
    species: 'Fou de Bassan',
    format: 'portrait',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Tempête côtière',
      },
      {
        url: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
        alt: 'Vagues sur les rochers',
      },
    ],
    reactions: { love: 67, admire: 54, fire: 38, wow: 49, curious: 12 },
    comments: 33,
  },
]
