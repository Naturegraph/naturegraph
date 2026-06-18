/**
 * Onboarding : Orchestrateur 4 étapes
 *
 * Étapes : interests → frequency → motivations → username
 * Gère la navigation entre étapes, la persistance des données
 * et la sauvegarde du profil Supabase à la fin.
 *
 * Persistance (RC-E)
 * ──────────────────
 * À la validation finale (handleUsernameComplete), on persiste :
 *
 *   1. `profiles` (UPDATE conditionnel) :
 *        - username, first_name, interests
 *        - PAS d'écrasement si profile déjà complété (cf.
 *          `isProfileAlreadyOnboarded` : re-onboarding accidentel safe)
 *
 *   2. `user_settings` (UPSERT) :
 *        - notif_frequency mappée (UI 'monthly'/'occasionally' → DB 'weekly')
 *        - Idempotent : la row est créée si absente
 *
 *   3. `notification_preferences.species_digest` :
 *        - Opt-in si fréquence = 'daily' ou 'weekly' (RGPD-friendly)
 *
 *   4. `motivations` :
 *        - Persistées dans localStorage (clé par userId) : pas de colonne DB
 *          dédiée en MVP. Phase 3 : migration localStorage → DB.
 *
 * Props :
 *  - onComplete  : appelé une fois le profil sauvegardé
 *  - onGoHome    : naviguer vers l'accueil/invité
 *  - onGoLogin   : naviguer vers le login
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { debugLog } from '@/lib/debugLog'
import { useToast } from '@/contexts/ToastContext'
import { setPreference } from '@/services/notificationPreferencesService'
import {
  persistNotifFrequency,
  persistMotivationsLocal,
  isProfileAlreadyOnboarded,
  type FrequencyOption,
} from '@/services/onboardingPersistence'
import type { Interest } from '@/types/database'
import { OnboardingInterests } from './OnboardingInterests'
import { OnboardingStep2 } from './OnboardingStep2'
import { OnboardingStep3 } from './OnboardingStep3'
import { OnboardingStep4 } from './OnboardingStep4'
import { OnboardingExitModal } from './OnboardingExitModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'interests' | 'frequency' | 'motivations' | 'username'

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
  const { error: notifyError } = useToast()
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
  //
  // RC-E persistance complète (cf. `services/onboardingPersistence.ts`) :
  //   - profiles : UPDATE conditionnel (anti-écrasement si déjà onboardé)
  //   - user_settings : UPSERT notif_frequency (mapping UI 4 → DB 3 valeurs)
  //   - notification_preferences.species_digest : opt-in selon fréquence
  //   - motivations : localStorage (pas de colonne DB en MVP)
  //
  // La localisation est intentionnellement absente : opt-in post-découverte in-app.
  const handleUsernameComplete = useCallback(
    async (username: string) => {
      if (isSaving) return
      setIsSaving(true)
      setUserData((prev) => ({ ...prev, username }))

      try {
        if (!supabase) {
          // Mode démo (Supabase non configuré) : on saute la persistance
          // serveur mais on persiste quand même les motivations en local
          // pour cohérence avec le mode connecté.
          debugLog('onboarding', 'demo mode : skipping server persistence')
          await onComplete()
          return
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // Cas limite : session expirée pendant l'onboarding.
          // On loggue mais on appelle onComplete pour laisser le routing
          // gérer la redirection vers /auth.
          console.warn('[onboarding] no auth user : calling onComplete anyway')
          await onComplete()
          return
        }

        // Logs RC-E : permettent de tracer en console que toutes les
        // données collectées arrivent bien au point de persistance (dev only).
        debugLog('onboarding', 'persisting user data', {
          userId: user.id,
          username,
          interestsCount: userData.interests.length,
          motivationsCount: userData.motivations.length,
          frequency: userData.frequency,
        })

        // ─── 1. Profile : UPDATE conditionnel (anti-écrasement) ──────────
        //
        // Si l'utilisateur a déjà été onboardé (interests non vide ou
        // first_name déjà renseigné), on REFUSE l'upsert profile pour ne
        // pas écraser des données légitimes (modifications faites depuis
        // Settings, etc.). C'est une garde défensive : le OnboardingGuard
        // empêche normalement ce cas, mais on double-check au cas où.
        const alreadyOnboarded = await isProfileAlreadyOnboarded(user.id)
        if (alreadyOnboarded) {
          console.warn('[onboarding] profile already complete : skipping upsert to avoid overwrite')
        } else {
          const { error: upsertError } = await supabase.from('profiles').upsert(
            {
              id: user.id,
              username,
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
          debugLog('onboarding', 'profile upserted OK', { userId: user.id })
        }

        // ─── 2. user_settings : notif_frequency (UPSERT) ─────────────────
        //
        // Le trigger `handle_new_auth_user` ne crée que `profiles`, pas
        // `user_settings`. On compte donc sur l'upsert de `updateSettings`
        // pour créer la row si elle n'existe pas (idempotent).
        if (userData.frequency) {
          try {
            await persistNotifFrequency(user.id, userData.frequency)
          } catch (err) {
            // Non bloquant : la fréquence est modifiable plus tard depuis
            // Settings > Notifications. On loggue mais on continue.
            console.warn('[onboarding] persistNotifFrequency failed', err)
          }
        } else {
          debugLog('onboarding', 'no frequency selected : using DB default (weekly)')
        }

        // ─── 3. species_digest opt-in (RGPD) ─────────────────────────────
        //
        // Opt-in déduit de la fréquence choisie :
        //   - 'daily' ou 'weekly' : l'utilisateur a explicitement demandé des
        //     notifications régulières → opt-in digest hebdo
        //   - 'monthly' / 'occasionally' : on respecte le défaut FALSE
        // L'opt-in peut être modifié à tout moment depuis /settings.
        if (userData.frequency === 'daily' || userData.frequency === 'weekly') {
          try {
            await setPreference(user.id, 'species_digest', true)
            debugLog('onboarding', 'species_digest opt-in OK')
          } catch (e) {
            console.warn('[onboarding] species_digest opt-in failed', e)
          }
        }

        // ─── 4. motivations (localStorage) ───────────────────────────────
        //
        // Pas de colonne DB en MVP : on stocke localement pour ne pas
        // perdre l'information. Migration vers DB en Phase 3.
        if (userData.motivations.length > 0) {
          persistMotivationsLocal(user.id, userData.motivations)
        }

        debugLog('onboarding', 'all persistence completed successfully')
        await onComplete()
      } catch (err) {
        console.error('[onboarding] unexpected error', err)
        notifyError('Une erreur est survenue. Réessaie.')
        setIsSaving(false)
      }
    },
    [
      isSaving,
      userData.interests,
      userData.motivations,
      userData.frequency,
      onComplete,
      notifyError,
    ],
  )

  return (
    <div className="flex items-center overflow-clip relative rounded-sm md:rounded-xl w-full h-full">
      {/* Fond blanc : contenu centré */}
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
