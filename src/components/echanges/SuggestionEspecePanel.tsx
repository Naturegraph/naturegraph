/**
 * SuggestionEspecePanel : proposer une espece depuis le fil d'Echanges
 * =============================================================================
 *
 * Calque sur la maquette Figma 6824:13039 (Nicolas 2026-07-23). Mesures reprises
 * telles quelles : padding 16, champ 48 de haut, pastilles de confiance 40 de
 * haut avec 16 de padding lateral, zone de texte 180, deux boutons de 48 en
 * moitie-moitie separes de 16.
 *
 * Demande initiale : proposer une espece doit chercher dans NOTRE base, pas se
 * contenter de texte libre. Une suggestion ecrite a la main ("un bihoreau je
 * crois") n'est reliee a rien : impossible d'en faire une statistique, de la
 * comparer aux autres, ou de la rattacher au referentiel.
 *
 * Le champ et son bouton de filtre reprennent le motif de recherche du
 * formulaire de contribution : c'est le meme geste, il n'y a rien de nouveau a
 * apprendre.
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
import { Search, Loader2, X, MessageSquarePlus, Filter } from 'lucide-react'
import { searchTaxonomy, type TaxonomyHit } from '@/services/searchService'
import { Button } from '@/components/ui'
import { SpeciesResultsList } from '@/components/ui/SpeciesResultsList'
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

/**
 * Filtre par grande categorie, meme jeu que le formulaire de contribution.
 * La valeur envoyee a `searchTaxonomy` est la classe iNaturalist.
 */
const CATEGORIES: { classe: string; libelle: string }[] = [
  { classe: 'Aves', libelle: 'Oiseaux' },
  { classe: 'Mammalia', libelle: 'Mammifères' },
  { classe: 'Insecta', libelle: 'Insectes' },
  { classe: 'Amphibia', libelle: 'Amphibiens' },
  { classe: 'Reptilia', libelle: 'Reptiles' },
  { classe: 'Arachnida', libelle: 'Arachnides' },
  { classe: 'Mollusca', libelle: 'Mollusques' },
  { classe: 'Actinopterygii', libelle: 'Poissons' },
]

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
  const [filtreOuvert, setFiltreOuvert] = useState(false)
  const [categorie, setCategorie] = useState<string | null>(null)

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
    queryKey: ['echanges', 'especes', saisieDifferee, categorie],
    queryFn: () =>
      searchTaxonomy(saisieDifferee, {
        ranks: ['species', 'genus'],
        classFilter: categorie,
        limit: 8,
      }),
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

  const pret = !!choisie && !tropLong && !doublon

  function valider() {
    if (!pret || !choisie) return
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
    <div className="rounded-md border border-border bg-background p-4">
      <p className="mb-4 flex items-center gap-2 text-base font-bold text-foreground">
        <MessageSquarePlus className="size-5 shrink-0" aria-hidden="true" />
        Suggérer une identification
      </p>

      {/* ── 1. Espece ─────────────────────────────────────────────────────── */}
      {choisie ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-primary-light px-4 py-2 text-sm">
            <span className="truncate font-bold text-foreground">{nomAffiche(choisie)}</span>
            {choisie.common_name_fr && (
              <span className="truncate text-muted-foreground">{choisie.scientific_name}</span>
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
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="relative min-w-0 flex-1">
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
                  placeholder="Nom de l’espèce…"
                  role="combobox"
                  aria-expanded={chercheEnCours}
                  aria-autocomplete="list"
                  aria-controls={idListe}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                {isFetching && (
                  <Loader2
                    className="size-4 shrink-0 text-primary motion-safe:animate-spin"
                    aria-label="Recherche en cours"
                  />
                )}
              </div>
            </div>

            {/* Filtre par categorie : meme bouton rond que le formulaire de
                contribution. Il restreint vraiment la recherche plutot que
                d'etre decoratif, sinon autant ne pas l'afficher. */}
            <button
              type="button"
              onClick={() => setFiltreOuvert((v) => !v)}
              aria-label="Filtrer par catégorie"
              aria-expanded={filtreOuvert}
              className={[
                'relative flex size-12 shrink-0 items-center justify-center rounded-full border transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                filtreOuvert || categorie
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground hover:border-foreground/40 hover:bg-muted/40',
              ].join(' ')}
            >
              <Filter className="size-5" aria-hidden="true" />
            </button>
          </div>

          {filtreOuvert && (
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const actif = categorie === c.classe
                return (
                  <button
                    key={c.classe}
                    type="button"
                    role="checkbox"
                    aria-checked={actif}
                    onClick={() => setCategorie(actif ? null : c.classe)}
                    className={[
                      'inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                      actif
                        ? 'border-primary bg-primary-light text-foreground'
                        : 'border-border text-foreground hover:border-foreground/40',
                    ].join(' ')}
                  >
                    {c.libelle}
                  </button>
                )
              })}
            </div>
          )}

          {chercheEnCours && (resultats.length > 0 || aucunResultat || isFetching) && (
            <div className="mt-3">
              <SpeciesResultsList
                id={idListe}
                resultats={resultats}
                requete={saisieDifferee}
                enChargement={isFetching}
                vide={aucunResultat}
                onChoisir={setChoisie}
              />
            </div>
          )}
        </div>
      )}

      {doublon && (
        <p
          role="alert"
          className="mt-3 rounded-sm bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning)]"
        >
          {MESSAGE_ESPECE_DEJA_PROPOSEE}
        </p>
      )}

      {/* ── 2. Confiance ──────────────────────────────────────────────────── */}
      {/* Pastilles plutot qu'une liste deroulante : les quatre niveaux se
          comparent d'un regard, et le geste tient en un tap sur mobile. */}
      <div className="mt-4">
        <p className="mb-2 text-base text-foreground" id={`${idRecherche}-confiance`}>
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
                  'inline-flex h-10 items-center rounded-full border px-4 text-base transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  actif
                    ? 'border-primary bg-primary-light text-foreground'
                    : 'border-border text-foreground hover:border-foreground/40',
                ].join(' ')}
              >
                {n.libelle}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 3. Mot facultatif ─────────────────────────────────────────────── */}
      <div className="mt-4">
        <label htmlFor={idMot} className="mb-2 block text-base text-foreground">
          Ce qui te met sur la piste
        </label>
        {/* Le compteur vit DANS le cadre, en bas a droite, comme la maquette :
            hors du cadre il flotterait entre deux blocs sans qu'on sache a quoi
            il se rapporte. */}
        <div
          className={[
            'relative min-h-[180px] rounded-sm border bg-background transition-colors',
            'focus-within:ring-2 focus-within:ring-primary',
            tropLong ? 'border-[var(--color-error)]' : 'border-border',
          ].join(' ')}
        >
          <textarea
            id={idMot}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={6}
            placeholder="Le bec, la calotte, le cri…"
            className="w-full resize-none bg-transparent px-3 py-3 pb-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
          <span
            aria-live="polite"
            className={`pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums ${
              tropLong ? 'font-medium text-[var(--color-error)]' : 'text-muted-foreground'
            }`}
          >
            {commentaire.length > 0
              ? `${commentaire.length}/${LONGUEUR_MAX_ECHANGE}`
              : `${LONGUEUR_MAX_ECHANGE} max`}
          </span>
        </div>
      </div>

      {/* Deux boutons de meme largeur, comme la maquette : aucun des deux n'est
          un repli honteux, annuler une suggestion est une decision normale. */}
      {/* Boutons du DESIGN SYSTEM (`Button`), et non des boutons refaits a la
          main : les couleurs, l'arrondi et la hauteur viennent alors d'une
          source unique et ne peuvent plus diverger du reste de l'app.

          `secondary` pour annuler, `primary` pour valider, taille `md` (48px),
          moitie-moitie comme la maquette : annuler une suggestion est une
          decision normale, pas un repli honteux. */}
      <div className="mt-4 flex gap-4">
        <Button variant="secondary" size="md" className="flex-1" onClick={onAnnuler}>
          Annuler
        </Button>
        <Button
          variant="primary"
          size="md"
          // Etat desactive laisse au composant, comme dans l'onboarding.
          className="flex-1"
          disabled={!pret}
          onClick={valider}
        >
          Suggérer
        </Button>
      </div>
    </div>
  )
}
