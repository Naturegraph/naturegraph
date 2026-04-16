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

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useNotification } from '@/contexts/NotificationContext'
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
  const { error: notifyError } = useNotification()
  const [step, setStep] = useState<Step>('interests')
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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

  // ─── Handler étape 4 + sauvegarde Supabase ────────────────────────────────
  // La localisation est intentionnellement absente : opt-in post-découverte in-app.
  const handleUsernameComplete = useCallback(
    async (username: string) => {
      if (isSaving) return
      setIsSaving(true)
      setUserData((prev) => ({ ...prev, username }))

      try {
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            /**
             * TODO [BACKEND] — Étendre l'upsert avec les champs manquants :
             *   - `notification_frequency` : mapper FrequencyOption → ENUM DB
             *   - `motivations` : tableau ENUM[] dans `profiles`
             */
            const { error: upsertError } = await supabase.from('profiles').upsert(
              {
                id: user.id,
                username: username,
                email: user.email ?? '',
                first_name: username,
                last_name: '',
                interests: userData.interests as Interest[],
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' },
            )
            if (upsertError) {
              console.error('[onboarding] upsert profile failed', upsertError)
              notifyError('Impossible de sauvegarder le profil. Réessaie.')
              setIsSaving(false)
              return
            }
          }
        }

        await onComplete()
      } catch (err) {
        console.error('[onboarding] unexpected error', err)
        notifyError('Une erreur est survenue. Réessaie.')
        setIsSaving(false)
      }
    },
    [isSaving, userData.interests, onComplete, notifyError],
  )

  return (
    <div className="flex items-center overflow-clip relative rounded-sm md:rounded-xl w-full h-full">
      {/* Fond blanc — contenu centré */}
      <div className="bg-[var(--color-bg-primary)] flex flex-col items-center justify-center w-full md:w-[636px] h-full">
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
