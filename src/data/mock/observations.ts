/**
 * Données mockées pour les observations
 * Structure préparée pour les futures intégrations backend
 */

export interface Observation {
  id: string
  speciesId: string
  userId: string
  date: string
  location: {
    latitude: number
    longitude: number
    name: string
  }
  images?: string[]
  description?: string
  verified: boolean
  likes: number
  comments: number
}

export interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  observations: number
  species: number
  joined: string
  bio?: string
}

/**
 * Données mockées d'utilisateurs
 */
export const mockUsers: User[] = [
  {
    id: 'user1',
    username: 'naturelover42',
    displayName: 'Marie D.',
    observations: 156,
    species: 78,
    joined: '2023-05-12',
    bio: 'Passionnée par la biodiversité locale et la photographie nature.',
  },
  {
    id: 'user2',
    username: 'birder_pro',
    displayName: 'Thomas L.',
    observations: 423,
    species: 142,
    joined: '2022-03-08',
    bio: 'Ornithologue amateur, je partage mes découvertes en forêt.',
  },
  {
    id: 'user3',
    username: 'flora_explorer',
    displayName: 'Sophie M.',
    observations: 289,
    species: 95,
    joined: '2023-01-20',
    bio: 'Botaniste en herbe, amoureuse des plantes sauvages.',
  },
]

/**
 * Données mockées d'observations
 */
export const mockObservations: Observation[] = [
  {
    id: 'obs1',
    speciesId: '1',
    userId: 'user1',
    date: '2024-12-20T10:30:00Z',
    location: {
      latitude: 48.8566,
      longitude: 2.3522,
      name: 'Jardin du Luxembourg, Paris',
    },
    description: "Observation d'une mésange charbonnière en train de se nourrir.",
    verified: true,
    likes: 24,
    comments: 3,
  },
  {
    id: 'obs2',
    speciesId: '2',
    userId: 'user2',
    date: '2024-12-18T07:15:00Z',
    location: {
      latitude: 48.7352,
      longitude: 2.4985,
      name: 'Forêt de Sénart',
    },
    description: 'Cerf observé au petit matin, magnifique spécimen.',
    verified: true,
    likes: 67,
    comments: 8,
  },
  {
    id: 'obs3',
    speciesId: '3',
    userId: 'user3',
    date: '2024-12-15T14:45:00Z',
    location: {
      latitude: 45.764,
      longitude: 4.8357,
      name: "Parc de la Tête d'Or, Lyon",
    },
    description: 'Amanite tue-mouches photographiée sous les chênes.',
    verified: false,
    likes: 12,
    comments: 2,
  },
]

/**
 * Fonction utilitaire pour simuler un appel API
 */
export async function fetchObservations(): Promise<Observation[]> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockObservations
}

/**
 * Fonction utilitaire pour récupérer une observation par son ID
 */
export async function fetchObservationById(id: string): Promise<Observation | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockObservations.find((obs) => obs.id === id)
}

/**
 * Fonction utilitaire pour récupérer un utilisateur par son ID
 */
export async function fetchUserById(id: string): Promise<User | undefined> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockUsers.find((user) => user.id === id)
}
