import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import type { Interest } from '@/types/database'

const TOTAL_STEPS = 4

const INTEREST_KEYS = [
  'birds',
  'mammals',
  'insects',
  'amphibians',
  'reptiles',
  'arachnids',
  'mollusks',
  'fish',
  'plants',
] as const

const INTEREST_EMOJIS: Record<string, string> = {
  birds: '\uD83D\uDC26',
  mammals: '\uD83E\uDD8C',
  insects: '\uD83E\uDD8B',
  amphibians: '\uD83D\uDC38',
  reptiles: '\uD83E\uDD8E',
  arachnids: '\uD83D\uDD77\uFE0F',
  mollusks: '\uD83D\uDC0C',
  fish: '\uD83D\uDC1F',
  plants: '\uD83C\uDF3F',
}

const FREQUENCY_KEYS = ['daily', 'weekly', 'monthly', 'occasionally'] as const

const MOTIVATION_KEYS = ['observe', 'share', 'learn', 'contribute'] as const

export default function Onboarding() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [interests, setInterests] = useState<string[]>([])
  const [frequency, setFrequency] = useState<string | null>(null)
  const [motivations, setMotivations] = useState<string[]>([])
  const [displayName, setDisplayName] = useState('')

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
    } else {
      await handleFinish()
    }
  }

  function handlePrev() {
    if (step > 1) setStep(step - 1)
  }

  function handleSkip() {
    navigate('/home')
  }

  async function handleFinish() {
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            username: displayName.trim(),
            email: user.email ?? '',
            first_name: displayName.trim(),
            last_name: '',
            interests: interests as Interest[],
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
    navigate('/home')
  }

  function toggleInterest(key: string) {
    setInterests((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= 3) return prev
      return [...prev, key]
    })
  }

  function toggleMotivation(key: string) {
    setMotivations((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const canProceed =
    (step === 1 && interests.length > 0) ||
    (step === 2 && frequency !== null) ||
    (step === 3 && motivations.length > 0) ||
    (step === 4 && displayName.trim().length > 0)

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-start lg:items-center justify-center p-0 lg:p-6">
      <div className="w-full lg:max-w-[636px] min-h-screen lg:min-h-0 lg:rounded-2xl bg-[var(--color-surface)] lg:border lg:border-[var(--color-border-light)] flex flex-col">
        {/* Top bar */}
        <div className="px-6 pt-6 lg:px-16 lg:pt-16">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('onboarding.profile')}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--color-text-tertiary)]">
                {t('common.step')} {step}/{TOTAL_STEPS}
              </span>
              <button
                onClick={handleSkip}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-bg-tertiary)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 px-6 py-8 lg:px-16 overflow-y-auto">
          {step === 1 && (
            <StepInterests t={t} interests={interests} toggleInterest={toggleInterest} />
          )}
          {step === 2 && <StepFrequency t={t} frequency={frequency} setFrequency={setFrequency} />}
          {step === 3 && (
            <StepMotivation t={t} motivations={motivations} toggleMotivation={toggleMotivation} />
          )}
          {step === 4 && (
            <StepDisplayName t={t} displayName={displayName} setDisplayName={setDisplayName} />
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-6 pb-6 lg:px-16 lg:pb-16">
          {step === 1 && (
            <p className="text-xs text-center text-[var(--color-text-tertiary)] mb-4">
              {t('onboarding.step1Hint')}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={step === 1 ? handleSkip : handlePrev}
              className="flex-1"
            >
              {step === 1 ? t('common.cancel') : t('common.previous')}
            </Button>
            <Button size="lg" onClick={handleNext} disabled={!canProceed} className="flex-1">
              {step === TOTAL_STEPS ? t('common.finish') : t('common.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 1 — Interests                                                 */
/* ------------------------------------------------------------------ */

function StepInterests({
  t,
  interests,
  toggleInterest,
}: {
  t: (k: string) => string
  interests: string[]
  toggleInterest: (k: string) => void
}) {
  return (
    <>
      <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
        {t('onboarding.step1Title')}
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        {t('onboarding.step1Subtitle')}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {INTEREST_KEYS.map((key) => {
          const selected = interests.includes(key)
          const order = selected ? interests.indexOf(key) + 1 : null

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleInterest(key)}
              className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border transition-all ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              {order && (
                <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
                  {order}
                </span>
              )}
              <span className="text-2xl">{INTEREST_EMOJIS[key]}</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {t(`onboarding.interests.${key}`)}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Frequency                                                 */
/* ------------------------------------------------------------------ */

function StepFrequency({
  t,
  frequency,
  setFrequency,
}: {
  t: (k: string) => string
  frequency: string | null
  setFrequency: (v: string) => void
}) {
  return (
    <>
      <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
        {t('onboarding.step2Title')}
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        {t('onboarding.step2Subtitle')}
      </p>

      <div className="flex flex-col gap-3">
        {FREQUENCY_KEYS.map((key) => {
          const selected = frequency === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFrequency(key)}
              className={`text-left p-5 rounded-xl border transition-all ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t(`onboarding.frequency.${key}`)}
                </span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selected ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
                  }`}
                >
                  {selected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                  )}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t(`onboarding.frequency.${key}Desc`)}
              </p>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Motivation                                                */
/* ------------------------------------------------------------------ */

function StepMotivation({
  t,
  motivations,
  toggleMotivation,
}: {
  t: (k: string) => string
  motivations: string[]
  toggleMotivation: (k: string) => void
}) {
  return (
    <>
      <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
        {t('onboarding.step3Title')}
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        {t('onboarding.step3Subtitle')}
      </p>

      <div className="flex flex-col gap-3">
        {MOTIVATION_KEYS.map((key) => {
          const selected = motivations.includes(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleMotivation(key)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
              }`}
            >
              <span
                className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                  selected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                {selected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="text-white"
                  >
                    <path
                      d="M2 6L5 9L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {t(`onboarding.motivation.${key}`)}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 4 — Display name                                              */
/* ------------------------------------------------------------------ */

function StepDisplayName({
  t,
  displayName,
  setDisplayName,
}: {
  t: (k: string) => string
  displayName: string
  setDisplayName: (v: string) => void
}) {
  const maxLength = 25

  return (
    <>
      <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
        {t('onboarding.step4Title')}
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8">
        {t('onboarding.step4Subtitle')}
      </p>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="displayName"
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          {t('onboarding.usernameLabel')}
        </label>
        <div className="relative">
          <input
            id="displayName"
            type="text"
            maxLength={maxLength}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('onboarding.usernamePlaceholder')}
            className="w-full px-5 py-3 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg transition-colors placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-tertiary)]">
            {displayName.length}/{maxLength}
          </span>
        </div>
      </div>
    </>
  )
}
