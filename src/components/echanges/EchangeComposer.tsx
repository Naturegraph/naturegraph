/**
 * EchangeComposer : champ de saisie d'un Echange
 * =============================================================================
 *
 * Deux partis pris.
 *
 * 1. On demande l'INTENTION avant le texte. Le champ vide est le premier frein
 *    sur une jeune communaute ; choisir "Aider a identifier" ou "Info du coin"
 *    suggere quoi ecrire, et l'invite du champ change en consequence.
 *
 * 2. Le compteur de caracteres n'apparait qu'a l'approche de la limite. Afficher
 *    "0 / 1000" des le depart donne l'impression d'un devoir a rendre, ce qui
 *    est exactement l'inverse de l'effet recherche.
 *
 * Le visiteur non connecte voit le champ mais est redirige vers l'inscription
 * au premier geste, comme partout ailleurs dans l'app (regle Nicolas : pas de
 * banniere, l'invitation vient a l'action).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { INTENTIONS, trouverIntention } from './intentions'
import type { IntentionEchange } from '@/services/echangeService'
import { LONGUEUR_MAX_ECHANGE } from '@/services/echangeService'

interface EchangeComposerProps {
  peutEcrire: boolean
  enCours: boolean
  onPublier: (contenu: string, intention: IntentionEchange) => void
}

/** Seuil d'apparition du compteur : on ne stresse qu'a l'approche de la limite. */
const SEUIL_COMPTEUR = LONGUEUR_MAX_ECHANGE - 150

export function EchangeComposer({ peutEcrire, enCours, onPublier }: EchangeComposerProps) {
  const navigate = useNavigate()
  const [intention, setIntention] = useState<IntentionEchange>('reaction')
  const [contenu, setContenu] = useState('')

  const config = trouverIntention(intention)
  const trop = contenu.length > LONGUEUR_MAX_ECHANGE
  const pret = contenu.trim().length > 0 && !trop && !enCours

  function auGeste() {
    if (!peutEcrire) navigate('/signup')
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (!peutEcrire) return navigate('/signup')
    if (!pret) return
    onPublier(contenu, intention)
    setContenu('')
    setIntention('reaction')
  }

  return (
    <form onSubmit={soumettre} className="rounded-2xl border border-border bg-cream-lighter p-4">
      {/* Choix de l'intention */}
      <div
        role="radiogroup"
        aria-label="Type d’échange"
        className="flex gap-2 overflow-x-auto pb-3 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {INTENTIONS.map((i) => {
          const actif = i.cle === intention
          return (
            <button
              key={i.cle}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => (peutEcrire ? setIntention(i.cle) : navigate('/signup'))}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                actif
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span aria-hidden="true">{i.emoji}</span>
              {i.libelle}
            </button>
          )
        })}
      </div>

      <label htmlFor="echange-contenu" className="sr-only">
        Ton échange
      </label>
      <textarea
        id="echange-contenu"
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        onFocus={auGeste}
        placeholder={config.invite}
        rows={3}
        // maxLength volontairement absent : on prefere laisser depasser et le
        // dire clairement plutot que bloquer la frappe sans explication.
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          className={`text-xs tabular-nums ${trop ? 'text-[var(--color-error)] font-medium' : 'text-muted-foreground'}`}
          aria-live="polite"
        >
          {contenu.length > SEUIL_COMPTEUR ? `${contenu.length} / ${LONGUEUR_MAX_ECHANGE}` : ''}
        </span>

        <button
          type="submit"
          disabled={peutEcrire && !pret}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Send className="size-4" aria-hidden="true" />
          {enCours ? 'Envoi…' : 'Partager'}
        </button>
      </div>
    </form>
  )
}
