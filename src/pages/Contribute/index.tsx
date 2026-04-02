/**
 * Contribute — Page shell des formulaires de contribution
 *
 * Lit le paramètre ?type pour rendre le formulaire adapté :
 *   - nature_instant   → ContributeInstantForm
 *   - nature_encounter → ContributeEncounterForm
 *
 * Redirige vers /home si le type est absent ou invalide.
 * La protection authentification est gérée par ProtectedRoute dans le router.
 *
 * Le lazy loading est géré ici (et non dans le router) pour garder
 * des chunks distincts selon le type de contribution.
 */

import { lazy, Suspense } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'

// Chargés à la demande — séparation de bundle pour l'éco-conception
const ContributeInstantForm = lazy(() =>
  import('@/components/contribute/ContributeInstantForm').then((m) => ({
    default: m.ContributeInstantForm,
  })),
)
const ContributeEncounterForm = lazy(() =>
  import('@/components/contribute/ContributeEncounterForm').then((m) => ({
    default: m.ContributeEncounterForm,
  })),
)

const VALID_TYPES = ['nature_instant', 'nature_encounter'] as const
type ContributionType = (typeof VALID_TYPES)[number]

function isValidType(v: string | null): v is ContributionType {
  return VALID_TYPES.includes(v as ContributionType)
}

/** Spinner de chargement partagé entre les deux formulaires */
function FormFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-lighter">
      <div
        className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Chargement"
      />
    </div>
  )
}

export default function Contribute() {
  const [params] = useSearchParams()
  const type = params.get('type')

  // Type invalide ou absent → retour au fil
  if (!isValidType(type)) {
    return <Navigate to="/home" replace />
  }

  return (
    <Suspense fallback={<FormFallback />}>
      {type === 'nature_instant' ? <ContributeInstantForm /> : <ContributeEncounterForm />}
    </Suspense>
  )
}
