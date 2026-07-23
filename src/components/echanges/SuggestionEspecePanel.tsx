/**
 * SuggestionEspecePanel : proposer une espece depuis le fil d'Echanges
 * =============================================================================
 *
 * Demande Nicolas 2026-07-22 : proposer une espece doit chercher dans NOTRE
 * base, pas se contenter de texte libre. Une suggestion ecrite a la main
 * ("un bihoreau je crois") n'est reliee a rien : impossible d'en faire une
 * statistique, de la comparer aux autres, ou de la rattacher au referentiel.
 *
 * Le champ reprend exactement le motif de recherche du reste de l'app (pilule
 * bordee, loupe a gauche, spinner a droite, listbox en dessous) : c'est le
 * meme geste que dans le formulaire de contribution, il n'y a rien de nouveau
 * a apprendre.
 *
 * TROIS ETAPES, dans cet ordre :
 *   1. chercher et choisir l'espece ;
 *   2. dire a quel point on en est sur ;
 *   3. ajouter un mot, FACULTATIF.
 *
 * Le mot est facultatif parce qu'obliger a argumenter avant de pouvoir aider
 * decourage exactement les personnes qu'on veut voir participer. Sans texte,
 * une phrase generique est publiee a la place (`phraseGenerique` du service).
 */

import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Loader2, X, MessageSquarePlus } from 'lucide-react'
import { searchTaxonomy, type TaxonomyHit } from '@/services/searchService'
import {
  LONGUEUR_MAX_ECHANGE,
  MESSAGE_ESPECE_DEJA_PROPOSEE,
  NIVEAUX_CONFIANCE,
  cleEspece,
  type NiveauConfiance,
  type SuggestionEspece,
} from '@/services/echangeService'

interface SuggestionEspecePanelProps {
  /** Publie la suggestion. `commentaire` vide = phrase generique cote service. */
  onSuggerer: (suggestion: SuggestionEspece, commentaire: string) => void
  onAnnuler: () => void
  /**
   * Cles des especes que la personne connectee a DEJA proposees sur cette
   * publication (`cleEspece`). Une meme espece ne se propose qu'une fois.
   */
  especesDejaProposees?: string[]
}

/** Delai avant requete : evite une requete par touche frappee (eco-conception). */
const DELAI_FRAPPE = 300

export function SuggestionEspecePanel({
  onSuggerer,
  onAnnuler,
  especesDejaProposees = [],
}: SuggestionEspecePanelProps) {
  const idRecherche = useId()
  const idListe = useId()
  const idMot = useId()
  const champRecherche = useRef<HTMLInputElement>(null)

  const [saisie, setSaisie] = useState('')
  const [saisieDifferee, setSaisieDifferee] = useState('')
  const [choisie, setChoisie] = useState<TaxonomyHit | null>(null)
  const [confiance, setConfiance] = useState<NiveauConfiance>(2)
  const [commentaire, setCommentaire] = useState('')

  // Le focus part sur le champ : le panneau s'ouvre suite a un geste explicite,
  // la personne sait deja ce qu'elle vient y faire.
  useEffect(() => {
    champRecherche.current?.focus()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSaisieDifferee(saisie), DELAI_FRAPPE)
    return () => clearTimeout(t)
  }, [saisie])

  const { data: resultats = [], isFetching } = useQuery({
    queryKey: ['echanges', 'especes', saisieDifferee],
    queryFn: () => searchTaxonomy(saisieDifferee, { ranks: ['species', 'genus'], limit: 8 }),
    // Sous deux caracteres, tout ressort : la requete coute sans rien apprendre.
    enabled: saisieDifferee.trim().length >= 2 && !choisie,
    staleTime: 5 * 60 * 1000,
  })

  const chercheEnCours = saisieDifferee.trim().length >= 2 && !choisie
  const aucunResultat = chercheEnCours && !isFetching && resultats.length === 0
  const tropLong = commentaire.length > LONGUEUR_MAX_ECHANGE

  /** Nom affiche : le nom francais s'il existe, sinon le nom scientifique. */
  function nomAffiche(hit: TaxonomyHit): string {
    return hit.common_name_fr?.trim() || hit.scientific_name
  }

  // Le doublon est signale des le CHOIX de l'espece, pas au moment d'envoyer :
  // laisser rediger un argumentaire complet avant de refuser serait du travail
  // perdu, et se vivrait comme un piege.
  const doublon =
    !!choisie &&
    especesDejaProposees.includes(
      cleEspece({ noeudId: choisie.taxonomy_node_id, label: nomAffiche(choisie) }),
    )

  function valider() {
    if (!choisie || tropLong || doublon) return
    onSuggerer(
      {
        label: nomAffiche(choisie),
        scientifique: choisie.scientific_name,
        noeudId: choisie.taxonomy_node_id,
        confiance,
      },
      commentaire,
    )
  }

  return (
    <div className="rounded-md border border-primary bg-cream-lighter p-3">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <MessageSquarePlus className="size-4 text-primary" aria-hidden="true" />
        Suggérer une identification
      </p>

      {/* ── 1. Espece ─────────────────────────────────────────────────────── */}
      {choisie ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-primary-light px-3 py-1.5 text-sm">
            <span className="truncate font-medium text-foreground">{nomAffiche(choisie)}</span>
            {choisie.common_name_fr && (
              <span className="truncate italic text-muted-foreground">
                {choisie.scientific_name}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setChoisie(null)
              setSaisie('')
              champRecherche.current?.focus()
            }}
            aria-label="Changer d’espèce"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <label htmlFor={idRecherche} className="sr-only">
            Chercher une espèce
          </label>
          <div className="flex h-12 items-center gap-2 rounded-full border border-border bg-background px-4 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              id={idRecherche}
              ref={champRecherche}
              type="search"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Ex : Bihoreau gris, Nycticorax…"
              role="combobox"
              aria-expanded={chercheEnCours}
              aria-autocomplete="list"
              aria-controls={idListe}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {isFetching && (
              <Loader2
                className="size-4 shrink-0 text-primary motion-safe:animate-spin"
                aria-label="Recherche en cours"
              />
            )}
          </div>

          {chercheEnCours && (resultats.length > 0 || aucunResultat) && (
            <ul
              id={idListe}
              role="listbox"
              aria-label="Espèces trouvées"
              className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-md border-[0.5px] border-border bg-background shadow-xl"
            >
              {aucunResultat && (
                <li className="px-4 py-3 text-center text-sm text-muted-foreground">
                  Aucune espèce trouvée. Essaie le nom scientifique.
                </li>
              )}
              {resultats.map((hit) => (
                <li key={hit.taxonomy_node_id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => setChoisie(hit)}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <span className="text-sm font-medium text-foreground">{nomAffiche(hit)}</span>
                    {hit.common_name_fr && (
                      <span className="text-xs italic text-muted-foreground">
                        {hit.scientific_name}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {doublon && (
        <p
          role="alert"
          className="mt-2 rounded-sm border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)]"
        >
          {MESSAGE_ESPECE_DEJA_PROPOSEE}
        </p>
      )}

      {/* ── 2. Confiance ──────────────────────────────────────────────────── */}
      {/* Chips plutot qu'une liste deroulante : les quatre niveaux se comparent
          d'un regard, et le geste tient en un tap sur mobile. */}
      <div className="mt-3">
        <p className="mb-2 text-xs text-muted-foreground" id={`${idRecherche}-confiance`}>
          Niveau de confiance
        </p>
        <div
          role="radiogroup"
          aria-labelledby={`${idRecherche}-confiance`}
          className="flex flex-wrap gap-2"
        >
          {NIVEAUX_CONFIANCE.map((n) => {
            const actif = n.valeur === confiance
            return (
              <button
                key={n.valeur}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => setConfiance(n.valeur)}
                className={[
                  'inline-flex h-8 items-center rounded-full px-3 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  actif
                    ? 'border border-primary bg-primary-light font-medium text-foreground'
                    : 'border border-border bg-transparent text-foreground hover:border-foreground/40',
                ].join(' ')}
              >
                {n.libelle}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3. Mot facultatif ─────────────────────────────────────────────── */}
      <div className="mt-3">
        <label htmlFor={idMot} className="mb-2 block text-xs text-muted-foreground">
          Ce qui te met sur la piste <span className="italic">(facultatif)</span>
        </label>
        <textarea
          id={idMot}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={2}
          placeholder="Le bec, la calotte, le cri…"
          className={[
            'w-full resize-none rounded-md border bg-background px-3 py-2 text-sm text-foreground',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            tropLong ? 'border-[var(--color-error)]' : 'border-border',
          ].join(' ')}
        />
        {commentaire.length > LONGUEUR_MAX_ECHANGE - 150 && (
          <p
            aria-live="polite"
            className={`mt-1 text-right text-xs tabular-nums ${
              tropLong
                ? 'font-medium text-[var(--color-error)]'
                : 'font-medium text-[var(--color-warning)]'
            }`}
          >
            {commentaire.length}/{LONGUEUR_MAX_ECHANGE}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={valider}
          disabled={!choisie || tropLong || doublon}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          Suggérer
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
