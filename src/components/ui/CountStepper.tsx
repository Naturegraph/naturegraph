/**
 * CountStepper : compteur d'individus reutilisable (− / champ editable / +)
 *
 * Utilise dans le Carnet d'observations (NotebookSpeciesList) ET dans Rencontre
 * nature (EncounterStep2) pour un comportement + visuel STRICTEMENT identiques
 * (coherence demandee par Nicolas 2026-06-08).
 *
 * Le champ central est EDITABLE : l'utilisateur peut taper directement une
 * valeur (ex : 100 individus) au lieu de cliquer 100 fois sur "+".
 *
 * API volontairement "valeur absolue" (`onChange(next)`) : chaque appelant
 * convertit en delta s'il s'appuie sur un handler delta existant, ce qui evite
 * de toucher a la logique metier (submit Rencontre inchange).
 */

import { useEffect, useId, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface CountStepperProps {
  /** Valeur courante (>= min) */
  value: number
  /** Appele avec la NOUVELLE valeur absolue (deja bornee a [min, max]) */
  onChange: (next: number) => void
  /** Valeur minimale (defaut 1) */
  min?: number
  /** Valeur maximale (defaut 9999, garde-fou saisie) */
  max?: number
  /** Libelle accessible (ex: "Nombre de Mésange bleue") */
  label?: string
  /** Desactive l'ensemble (mutation en cours) */
  disabled?: boolean
}

export function CountStepper({
  value,
  onChange,
  min = 1,
  max = 9999,
  label,
  disabled = false,
}: CountStepperProps) {
  const inputId = useId()
  // Etat local du champ pour autoriser un etat intermediaire (ex: champ vide
  // pendant la saisie) sans perdre la valeur reelle.
  const [draft, setDraft] = useState(String(value))

  // Resynchronise le champ quand la valeur change (via +/- ou parent).
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  function commit(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '')
    if (digits === '') return // saisie intermediaire : on attend
    const n = Math.max(min, Math.min(max, parseInt(digits, 10)))
    if (n !== value) onChange(n)
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Diminuer"
        className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Minus className="size-5" aria-hidden="true" />
      </button>

      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        aria-label={label ?? "Nombre d'individus"}
        onChange={(e) => {
          setDraft(e.target.value)
          commit(e.target.value)
        }}
        onBlur={() => {
          // Champ laisse vide / invalide -> on restaure la valeur reelle.
          if (draft.replace(/[^0-9]/g, '') === '') setDraft(String(value))
        }}
        className="w-10 h-8 text-center text-base tabular-nums text-foreground bg-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
      />

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled}
        aria-label="Augmenter"
        className="size-8 rounded-full border-[0.5px] border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
