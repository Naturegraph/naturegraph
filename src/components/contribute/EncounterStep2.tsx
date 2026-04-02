/**
 * EncounterStep2 — Étape 2 du formulaire Rencontre Nature
 *
 * Contenu : identification de l'espèce observée
 *   - Statut : identifiée / en attente / inconnue
 *   - Recherche d'espèce (si identifiée) via SpeciesSearch
 *   - Groupe taxonomique (si identifiée et pas de résultat TAXREF)
 *   - Observations multiples
 *
 * Aucun champ obligatoire à cette étape — l'observation peut rester
 * "en attente d'identification" et être complétée plus tard.
 */

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { TaxonomicGroup } from '@/types/database'
import { SpeciesSearch, type MockSpecies } from './SpeciesSearch'

// Statuts d'identification disponibles à la saisie
type IdentificationChoice = 'identified' | 'pending' | 'unknown'

const TAXONOMIC_GROUPS: TaxonomicGroup[] = [
  'birds',
  'mammals',
  'insects',
  'amphibians',
  'reptiles',
  'arachnids',
  'mollusks',
  'fish',
  'plants',
  'other',
]

interface EncounterStep2Props {
  identificationChoice: IdentificationChoice
  onIdentificationChange: (v: IdentificationChoice) => void
  selectedSpecies: MockSpecies | null
  onSelectSpecies: (s: MockSpecies) => void
  onClearSpecies: () => void
  taxonomicGroup: TaxonomicGroup | ''
  onGroupChange: (g: TaxonomicGroup | '') => void
  multipleObservations: boolean
  onMultipleChange: (v: boolean) => void
}

export function EncounterStep2({
  identificationChoice,
  onIdentificationChange,
  selectedSpecies,
  onSelectSpecies,
  onClearSpecies,
  taxonomicGroup,
  onGroupChange,
  multipleObservations,
  onMultipleChange,
}: EncounterStep2Props) {
  const { t } = useTranslation()
  const groupId = useId()
  const multipleId = useId()

  const STATUS_OPTIONS: { value: IdentificationChoice; label: string; desc: string }[] = [
    {
      value: 'identified',
      label: t('contribute.species.identified'),
      desc: t('contribute.species.identifiedDesc'),
    },
    {
      value: 'pending',
      label: t('contribute.species.pending'),
      desc: t('contribute.species.pendingDesc'),
    },
    {
      value: 'unknown',
      label: t('contribute.species.unknown'),
      desc: t('contribute.species.unknownDesc'),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Choix du statut d'identification */}
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-foreground">
          {t('contribute.species.statusLabel')}
        </span>
        <div
          className="flex flex-col gap-2"
          role="radiogroup"
          aria-label={t('contribute.species.statusLabel')}
        >
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors',
                identificationChoice === opt.value
                  ? 'border-primary bg-primary-light/20'
                  : 'border-border hover:border-primary/40',
              ].join(' ')}
            >
              <input
                type="radio"
                name="identification"
                value={opt.value}
                checked={identificationChoice === opt.value}
                onChange={() => onIdentificationChange(opt.value)}
                className="sr-only"
              />
              <div
                className={[
                  'size-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  identificationChoice === opt.value ? 'border-primary' : 'border-border',
                ].join(' ')}
              >
                {identificationChoice === opt.value && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Recherche d'espèce — visible seulement si "identifiée" */}
      {identificationChoice === 'identified' && (
        <>
          <SpeciesSearch
            selected={selectedSpecies}
            onSelect={onSelectSpecies}
            onClear={onClearSpecies}
          />

          {/* Groupe taxonomique — utilisé si l'espèce n'est pas dans TAXREF */}
          {!selectedSpecies && (
            <div className="flex flex-col gap-2">
              <label htmlFor={groupId} className="text-sm font-semibold text-foreground">
                {t('contribute.species.group')}
              </label>
              <div
                id={groupId}
                role="group"
                aria-label={t('contribute.species.group')}
                className="flex flex-wrap gap-2"
              >
                {TAXONOMIC_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => onGroupChange(taxonomicGroup === g ? '' : g)}
                    aria-pressed={taxonomicGroup === g}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      taxonomicGroup === g
                        ? 'border-primary bg-primary-light text-primary font-medium'
                        : 'border-border text-foreground hover:border-primary/50',
                    ].join(' ')}
                  >
                    {t(`contribute.species.groups.${g}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Observations multiples */}
      <label
        htmlFor={multipleId}
        aria-label={t('contribute.multipleObs')}
        className="flex items-start gap-3 cursor-pointer"
      >
        <div className="relative mt-0.5 shrink-0">
          <input
            id={multipleId}
            type="checkbox"
            checked={multipleObservations}
            onChange={(e) => onMultipleChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="size-5 rounded border border-border bg-cream-lighter peer-checked:bg-primary peer-checked:border-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1 flex items-center justify-center">
            {multipleObservations && (
              <svg
                className="size-3 text-primary-foreground"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{t('contribute.multipleObs')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('contribute.multipleObsDesc')}</p>
        </div>
      </label>
    </div>
  )
}
