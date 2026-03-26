/**
 * Onboarding — Orchestrateur 4 étapes
 *
 * Étapes : interests → frequency → motivations → username
 * Gère la navigation entre étapes, la persistance des données
 * et la sauvegarde du profil Supabase à la fin.
 *
 * Props :
 *  - onComplete  : appelé une fois le profil sauvegardé
 *  - onGoHome    : naviguer vers l'accueil/invité
 *  - onGoLogin   : naviguer vers le login
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Interest } from '@/types/database'
import { OnboardingInterests } from './OnboardingInterests'
import { OnboardingStep2 } from './OnboardingStep2'
import { OnboardingStep3 } from './OnboardingStep3'
import { OnboardingStep4 } from './OnboardingStep4'
import { OnboardingExitModal } from './OnboardingExitModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'interests' | 'frequency' | 'motivations' | 'username'
type FrequencyOption = 'daily' | 'weekly' | 'monthly' | 'occasionally'

interface OnboardingProps {
  onComplete: () => void | Promise<void>
  onGoHome?: () => void
  onGoLogin?: () => void
}

interface UserData {
  interests: string[]
  frequency?: FrequencyOption
  motivations: string[]
  username?: string
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function OnboardingComponent({ onComplete, onGoHome, onGoLogin }: OnboardingProps) {
  const [step, setStep] = useState<Step>('interests')
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [userData, setUserData] = useState<UserData>({ interests: [], motivations: [] })

  // ─── Handlers étape 1
  function handleInterestsContinue(interests: string[]) {
    setUserData((prev) => ({ ...prev, interests }))
    setStep('frequency')
  }

  function handleInterestsSkip() {
    setStep('frequency')
  }

  // ─── Handlers étape 2
  function handleFrequencyNext(frequency: FrequencyOption) {
    setUserData((prev) => ({ ...prev, frequency }))
    setStep('motivations')
  }

  // ─── Handlers étape 3
  function handleMotivationsContinue(motivations: string[]) {
    setUserData((prev) => ({ ...prev, motivations }))
    setStep('username')
  }

  // ─── Handler étape 4 + sauvegarde Supabase
  async function handleUsernameComplete(username: string) {
    setUserData((prev) => ({ ...prev, username }))

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        /**
         * TODO [BACKEND] — Étendre l'upsert avec les champs manquants :
         *   - `notification_frequency` : mapper FrequencyOption → ENUM DB
         *     ('daily' → 'realtime', 'weekly' → 'daily_digest',
         *      'monthly' → 'weekly_digest', 'occasionally' → 'disabled')
         *     Créer également une entrée dans `notification_settings` pour
         *     les préférences push/email initiales selon la fréquence choisie.
         *   - `motivations` : tableau ENUM[] dans `profiles` (ou table dédiée
         *     `user_motivations` si évolution future vers pondération ML).
         *   Schéma DB : ALTER TABLE profiles
         *     ADD COLUMN notification_frequency TEXT DEFAULT 'weekly',
         *     ADD COLUMN motivations TEXT[] DEFAULT '{}';
         */
        // @ts-expect-error – incompatibilité de type Supabase upsert
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            username: username,
            email: user.email ?? '',
            first_name: username,
            last_name: '',
            interests: userData.interests as Interest[],
            // TODO [BACKEND] — Mapper vers ENUM DB (voir commentaire ci-dessus)
            notification_frequency: userData.frequency ?? 'weekly',
            // TODO [BACKEND] — Stocker dans profiles.motivations TEXT[]
            motivations: userData.motivations,
            city: null,
            region: null,
            country: null,
            instagram: null,
            twitter: null,
            website: null,
            avatar_url: null,
            banner_url: null,
          },
          { onConflict: 'id' },
        )
      }
    }

    await onComplete()
  }

  return (
    <div className="flex items-center overflow-clip relative rounded-card md:rounded-[32px] w-full h-full">
      {/* Fond blanc — contenu centré */}
      <div className="bg-off-white flex flex-col items-center justify-center w-full md:w-[636px] h-full">
        {step === 'interests' && (
          <OnboardingInterests
            onContinue={handleInterestsContinue}
            onSkip={handleInterestsSkip}
            onExit={() => setExitModalOpen(true)}
          />
        )}

        {step === 'frequency' && (
          <OnboardingStep2
            onNext={handleFrequencyNext}
            onBack={() => setStep('interests')}
            initialValue={userData.frequency}
            onExit={() => setExitModalOpen(true)}
          />
        )}

        {step === 'motivations' && (
          <OnboardingStep3
            onContinue={handleMotivationsContinue}
            onBack={() => setStep('frequency')}
            initialMotivations={userData.motivations}
            onExit={() => setExitModalOpen(true)}
          />
        )}

        {step === 'username' && (
          <OnboardingStep4
            onComplete={handleUsernameComplete}
            onBack={() => setStep('motivations')}
            initialUsername={userData.username}
            onExit={() => setExitModalOpen(true)}
          />
        )}
      </div>

      {/* Modal de sortie */}
      <OnboardingExitModal
        isOpen={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        onGoHome={() => {
          setExitModalOpen(false)
          onGoHome?.()
        }}
        onGoLogin={() => {
          setExitModalOpen(false)
          onGoLogin?.()
        }}
      />
    </div>
  )
}
