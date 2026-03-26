/**
 * Configuration pour les données mockées
 * Permet de contrôler les délais, erreurs et comportements simulés
 */

export const MOCK_CONFIG = {
  /**
   * Délais de simulation réseau (en millisecondes)
   */
  delays: {
    network: 500, // Requête réseau standard
    database: 300, // Requête base de données
    cache: 100, // Accès cache
    upload: 1500, // Upload fichier
  },

  /**
   * Configuration des erreurs simulées
   */
  errors: {
    /**
     * Taux d'échec réseau (0 = jamais, 0.1 = 10% du temps, 1 = toujours)
     * Utile pour tester la robustesse des composants
     */
    networkFailureRate: 0,

    /**
     * Simuler un timeout réseau
     */
    simulateTimeout: false,

    /**
     * Durée du timeout (si activé)
     */
    timeoutDuration: 5000,

    /**
     * Simuler une erreur serveur (500)
     */
    simulateServerError: false,
  },

  /**
   * Pagination
   */
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const

/**
 * Simuler un délai réseau
 */
export async function simulateNetworkDelay(
  type: keyof typeof MOCK_CONFIG.delays = 'network',
): Promise<void> {
  // Vérifier si on doit simuler un timeout
  if (MOCK_CONFIG.errors.simulateTimeout) {
    await new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), MOCK_CONFIG.errors.timeoutDuration),
    )
    return
  }

  // Vérifier si on doit simuler une erreur réseau
  if (Math.random() < MOCK_CONFIG.errors.networkFailureRate) {
    throw new Error('Network error: Failed to fetch data')
  }

  // Simuler une erreur serveur
  if (MOCK_CONFIG.errors.simulateServerError) {
    throw new Error('Server error: Internal server error (500)')
  }

  // Délai normal
  await new Promise((resolve) => setTimeout(resolve, MOCK_CONFIG.delays[type]))
}

/**
 * Calculer la pagination
 */
export function calculatePagination<T>(
  data: T[],
  page: number = 1,
  limit: number = MOCK_CONFIG.pagination.defaultPageSize,
) {
  const total = data.length
  const start = (page - 1) * limit
  const end = start + limit
  const paginatedData = data.slice(start, end)
  const totalPages = Math.ceil(total / limit)

  return {
    data: paginatedData,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: end < total,
      hasPrevious: page > 1,
    },
  }
}
