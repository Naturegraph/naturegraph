/**
 * Onboarding (page) : Wrapper standalone du composant d'onboarding 4 étapes
 *
 * Cette route `/onboarding` est utilisée comme cible de redirection par
 * `OnboardingGuard` et `ProtectedRoute` pour les utilisateurs authentifiés
 * dont le profil contient encore un username temporaire (`user_xxxxxxxx`).
 *
 * Le composant `OnboardingComponent` (src/components/onboarding) gère
 * les 4 étapes (interests → frequency → motivations → username) et l'upsert
 * Supabase du profil. Cette page le wrappe et navigue vers /home à la fin.
 */

import { useNavigate } from 'react-router-dom'
import OnboardingComponent from '@/components/onboarding'
import { useAuth } from '@/contexts/AuthContext'

export default function Onboarding() {
  const navigate = useNavigate()
  const { completeOnboarding } = useAuth()

  async function handleComplete() {
    // Rafraîchit le profil pour mettre à jour onboardingCompleted dans le contexte
    await completeOnboarding()
    navigate('/home', { replace: true })
  }

  return (
    <div className="min-h-screen bg-warm-beige flex items-center justify-center p-0 lg:p-6">
      <div className="w-full lg:w-auto lg:h-[832px] flex items-center justify-center">
        <OnboardingComponent
          onComplete={handleComplete}
          onGoHome={() => navigate('/home')}
          onGoLogin={() => navigate('/login')}
        />
      </div>
    </div>
  )
}
