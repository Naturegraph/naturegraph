/**
 * FeedPost : Carte d'un partage dans le feed
 *
 * Reproduit le design Figma : header auteur, contenu, météo/moment,
 * badges catégorie/espèce, slider d'images, réactions, actions.
 *
 * Accessibilité :
 * - Boutons réactions avec aria-label
 * - Images avec alt descriptif
 * - "Voir plus / Voir moins" annonce le changement d'état
 */

import React, { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bookmark,
  BookmarkCheck,
  Share2,
  MoreHorizontal,
  Bird,
  MountainSnow,
  Heart,
  MessageCircle,
} from 'lucide-react'
import { SharePopover } from './SharePopover'
import { useSavedPostIds, useToggleSavedPost } from '@/hooks/useSavedPosts'
import { PostOptionsMenu } from './PostOptionsMenu'
import { ImageSlider } from './ImageSlider'
import hermineIcon from '@/assets/images/hermine-icon.png'

import { ImagePresets } from '@/lib/supabaseImage'
import type { ReactionType } from '@/types/database'
import { useSpecies } from '@/contexts/SpeciesContext'
import { TAXONOMIC_GROUP_CONFIG } from '@/constants/commonSpecies'
import { buildPostPath } from '@/lib/postSlug'
import { NotebookCardInFeed } from '@/components/notebook/NotebookCardInFeed'
import { NOTEBOOKS_ENABLED } from '@/lib/featureFlags'
import { RevealableText } from '@/components/ui/RevealableText'

/**
 * Fil d'Echanges charge a la DEMANDE (NG-049).
 *
 * Le fil, sa recherche d'especes et son panneau de suggestion pesent plus lourd
 * qu'une carte de publication. Les embarquer dans le paquet du feed ferait payer
 * a chaque visiteur du code que la plupart n'ouvriront jamais : contraire au
 * budget de performance du projet. `lazy` le charge au premier clic sur
 * "Échanges", et une seule fois pour toute la session.
 */
const EchangesSection = lazy(() =>
  import('@/components/echanges/EchangesSection').then((m) => ({ default: m.EchangesSection })),
)

// ─── Type UI pour les posts du feed ──────────────────────────────────────────
// Bridge entre le type DB (PostFeedItem) et le composant FeedPost.
// TODO : refactoriser FeedPost pour accepter PostFeedItem directement.

export interface MockPost {
  id: string
  /**
   * ID Supabase de l'auteur du post : utilisé pour calculer `isOwnPost` au
   * niveau parent (FeedSection) et adapter le menu PostOptionsMenu en
   * conséquence (second-agent/12).
   */
  authorId: string
  /**
   * Type du post DB : détermine l'icône d'en-tête (Bird vert / MountainSnow
   * orange). Aligné sur Post['type'] de @/types/database.
   * Voir second-agent/04-feedpost-icon-color-by-type.md.
   */
  postType: 'nature_encounter' | 'nature_instant'
  /**
   * Auteur du post :
   * - `name`    : nom affiché (« first_name last_name » ou fallback username)
   * - `username`: pseudo officiel : TOUJOURS utilisé pour les liens /profile/:username
   *               (sinon les liens cassent quand un user change son pseudo).
   * - `avatar`  : URL avatar, fallback hermine côté composant
   * - `badge`   : emoji du centre d'intérêt #1 (décoratif)
   */
  author: { name: string; username: string; avatar: string; badge?: string }
  date: string
  /** NG-009 (2026-05-31) : date reelle d observation, affichee uniquement si
   *  differente de la date de publication. Format identique au champ `date`
   *  (deja formate cote postFeedItemToMockPost). */
  encounterDate?: string
  location: string
  title: string
  content: string
  /** Enum DB brut (`'sunny' | 'cloudy' | 'rainy' | 'windy' | 'snowy'`) : traduit côté composant. */
  weather?: string
  clouds?: string
  /** Enum DB brut (`'morning' | 'afternoon' | 'dusk' | 'evening' | 'night'`) : traduit côté composant. */
  timeOfDay?: string
  /** Enum DB brut (`'forest' | 'sea_coast' | 'park_garden' | ...`) : traduit côté composant. */
  habitat?: string
  category: { icon: string; label: string }
  /** Nom commun (si identifié) : sinon laisser undefined / null pour fallback i18n. */
  species?: string | null
  /** Nom scientifique latin (optionnel : enrichit le SpeciesHit pour le filtre) */
  scientific_name?: string | null
  /** Identifiant taxonomique (cd_nom legacy ou GBIF taxonKey : Phase 2). Optionnel. */
  taxref_id?: string | null
  /** Groupe taxonomique de l'espèce (optionnel : emoji dans le chip) */
  taxonomic_group?: string | null
  /**
   * Plusieurs individus observés (DB `posts.multiple_observations`).
   * @deprecated Retiré 2026-05-02 : utiliser `individualsCount` exclusivement.
   *   Le champ a été nettoyé des mocks et de FeedSection. Cette prop reste
   *   dans l'interface uniquement le temps de la migration backend (la colonne
   *   `posts.multiple_observations` peut encore exister côté DB).
   *   À supprimer définitivement quand `posts.individuals_count` est en prod.
   */
  multipleObservations?: never
  /**
   * Nombre exact d'individus observés (DB `posts.individuals_count` à créer
   * en Phase 2, cf. second-agent/02). Si > 1, affiche `({N})` dans le chip
   * espèce. Si null/1, pas de suffixe.
   */
  individualsCount?: number
  /**
   * V1.2.0 (NG-005/006) : si non null, ce post est issu d un carnet
   * d observations. Affiche la NotebookCardInFeed avec la liste categorisee
   * d especes a la place du chip espece classique.
   */
  notebookId?: string | null
  /** Compteur d especes du carnet (pre-charge depuis notebooks.species_count). */
  notebookSpeciesCount?: number | null
  format: '16:9' | 'portrait' | '1:1'
  images: Array<{
    url: string
    alt: string
    /** Dimensions natives : déterminent l'aspect ratio dans le feed. */
    width?: number
    height?: number
  }>
  reactions: {
    love: number
    admire: number
    fire: number
    wow: number
    curious: number
  }
  /** Réaction de l'utilisateur connecté sur ce post (null si aucune) */
  userReaction: ReactionType | null
  /** Total des réactions (likes_count) */
  totalReactions: number
  /** Nombre d'echanges sous la publication (NG-049). */
  comments: number
}

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Source unique des emojis et labels de réactions (second-agent/10).
 * Doit rester alignée avec ReactionType dans @/types/database.
 *
 * Ordre Figma 6385:103293 : love → fire → admire → wow → curious.
 * Emoji curious = 🤨 (Figma) : était 🧐 avant.
 *
 * Note : 'disappointed' (😕) existe encore dans ReactionType côté DB pour
 * compatibilité, mais n'est PLUS dans REACTION_CONFIG (pas dans le Figma).
 * Si un post historique a une réaction 'disappointed' en DB, elle ne sera
 * pas affichée. Quand le backend décidera de la retirer, on supprimera
 * aussi 'disappointed' de ReactionType.
 *
 * Exporté pour réutilisation par d'autres composants (jamais redéfinir un
 * mapping local) : règle d'unification "source de vérité unique".
 */
export const REACTION_CONFIG = [
  { key: 'love' as const, emoji: '❤️', labelKey: 'home.post.reactions.love' },
  { key: 'fire' as const, emoji: '🔥', labelKey: 'home.post.reactions.fire' },
  { key: 'admire' as const, emoji: '😍', labelKey: 'home.post.reactions.admire' },
  { key: 'wow' as const, emoji: '😱', labelKey: 'home.post.reactions.wow' },
  { key: 'curious' as const, emoji: '🤨', labelKey: 'home.post.reactions.curious' },
]

/**
 * Emojis météo : conformes Figma 6385:55806 (second-agent/05).
 * Source unique : si modifié, mettre à jour aussi EncounterStep3.tsx.
 *
 * Note Figma : pas d'emoji pour le moment de la journée : uniquement le label.
 * Donc TIME_OF_DAY_EMOJI a été retiré pour rester conforme.
 */
const WEATHER_EMOJI: Record<string, string> = {
  sunny: '☀️',
  cloudy: '⛅',
  rainy: '🌧️',
  windy: '🌬️',
  snowy: '🌨️',
  foggy: '🌫️',
}

/** Emoji par type d'habitat : affiche en premier dans la rangee meta du post. */
const HABITAT_EMOJI: Record<string, string> = {
  forest: '🌳',
  park_garden: '🌷',
  prairie_heath: '🌾',
  urban: '🏙️',
  river: '🏞️',
  lake_pond: '💧',
  wetland_marsh: '🪷',
  lake_wetland: '💧',
  mountain: '⛰️',
  sea_coast: '🌊',
  rural_agricultural: '🚜',
  care_center: '🏥',
}

/**
 * Icône d'en-tête + couleur par type de post (règle globale projet).
 * Voir second-agent/04-feedpost-icon-color-by-type.md.
 *   · nature_encounter → Bird teal/vert (token --color-highlight-primary)
 *   · nature_instant   → MountainSnow amber/orange (#cc7a00)
 */
const POST_TYPE_ICON: Record<MockPost['postType'], { Icon: typeof Bird; colorClass: string }> = {
  nature_encounter: {
    Icon: Bird,
    colorClass: 'text-[var(--color-highlight-primary)]',
  },
  nature_instant: {
    Icon: MountainSnow,
    // Amber brand primary : token CSS (BATCH 42).
    colorClass: 'text-[var(--color-amber-primary)]',
  },
}

// Tailwind du chip Figma (node 6385:60456) : bg Content/Action/Light, h-32,
// px-12 py-8, rounded-99, Mulish Bold 16px. Réutilisé pour catégorie + espèce.
const CHIP_BASE_CLASS =
  'bg-primary-light text-foreground text-base font-bold px-3 py-2 h-8 rounded-full leading-tight inline-flex items-center gap-2'
const CHIP_INTERACTIVE_CLASS =
  'hover:bg-primary/15 transition-colors cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1'
// Variante neutre : utilisée pour "Espèce non déterminée" qui n'est PAS un filtre
// activable. Garde la hauteur/forme pour rester aligné avec les chips voisins,
// mais retire le langage "bouton" (fond plein, texte gras).
const CHIP_PASSIVE_CLASS =
  'bg-transparent border border-border text-muted-foreground text-base font-medium px-3 py-2 h-8 rounded-full leading-tight inline-flex items-center gap-2'

interface FeedPostProps extends MockPost {
  /** true = utilisateur connecté : boutons actifs. false = redirige /signup */
  canInteract?: boolean
  /** true = post de l'utilisateur connecté (Modifier / Supprimer) */
  isOwnPost?: boolean
  /** Callback pour réagir à un post (emoji picker → type) */
  onReact?: (postId: string, type: ReactionType) => void
  /**
   * Masque la bordure de fin de carte (Nicolas 2026-05-22) :
   *   - true sur PostDetail (post seul, la bordure flottait dans le vide)
   *   - true sur le dernier post du feed (cohérence visuelle, pas de
   *     bordure orpheline en bas de liste).
   */
  hideEndBorder?: boolean
  /**
   * V1.1.5 NG-028 : titre cliquable vers la page detail /post/:id.
   * true par defaut (feed, profil) ; false sur PostDetail (on est deja sur
   * la page, pas de lien vers soi-meme).
   */
  linkToDetail?: boolean
  /**
   * Callback édition post : remonté jusqu'à Home pour rouvrir le panel de
   * création (Encounter/Instant) pré-rempli. Affiche le bouton « Modifier »
   * dans le PostOptionsMenu uniquement si défini ET si isOwnPost.
   */
  onEditPost?: (postId: string, postType: MockPost['postType']) => void
  /**
   * V1.1.4 NG-023 ext final (Nicolas 2026-06-01) : click chip categorie ->
   * coche la categorie dans les filtres du feed (FeedFilterPanel). Si non
   * fourni (Profile, PostDetail), le chip categorie reste passif.
   */
  onSelectCategory?: (group: string) => void
  /**
   * V1.1.5 (Nicolas 2026-06-04) : sur la page detail, on affiche TOUTE la
   * description d'emblee (pas de clamp 2 lignes ni de bouton "Voir plus") :
   * l'utilisateur est deja sur la page du post, il doit tout voir sans clic
   * supplementaire.
   */
  expandContent?: boolean
  /**
   * V1.1.5 (Nicolas 2026-06-04) : rend les chips categorie ET espece PASSIFS
   * (non cliquables). Utilise sur le post principal de PostDetail : on est
   * deja sur la page du post, le filtre espece/categorie n'a pas de sens ici.
   */
  disableChipFilters?: boolean
  /**
   * NG-026 : true uniquement pour le 1er post du feed (above-the-fold, LCP).
   * Propage `priority` a l'ImageSlider pour charger sa cover en `eager` ; tous
   * les autres posts chargent en `lazy`. Defaut false.
   */
  priority?: boolean
  /**
   * Ouvre le fil d'Echanges des l'affichage.
   *
   * Sert a l'arrivee depuis une notification d'echange : la personne vient
   * pour un message precis, lui faire cliquer une fois de plus pour le voir
   * donnerait l'impression d'une notification cassee. Non pilote ensuite :
   * c'est une valeur INITIALE, la carte garde la main sur son etat.
   */
  echangesOuvertsParDefaut?: boolean
}

export function FeedPost({
  id,
  authorId,
  postType,
  author,
  date,
  encounterDate,
  location,
  title,
  content,
  weather,
  clouds,
  timeOfDay,
  habitat,
  // category : prop conservée dans l'interface mais l'affichage est maintenant
  // dérivé de taxonomic_group + species (cf. règle catégorie+espèce unifiée).
  category: _category,
  species,
  scientific_name,
  taxref_id,
  taxonomic_group,
  // multipleObservations supprimé du destructuring (deprecated, plus utilisé).
  individualsCount,
  notebookId,
  notebookSpeciesCount,
  format,
  images,
  reactions,
  userReaction,
  totalReactions,
  comments,
  canInteract = true,
  linkToDetail = true,
  isOwnPost = false,
  onReact,
  hideEndBorder = false,
  onEditPost,
  onSelectCategory,
  expandContent = false,
  disableChipFilters = false,
  priority = false,
  echangesOuvertsParDefaut = false,
}: FeedPostProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  /**
   * Fil d'Echanges ouvert sous la publication.
   *
   * L'etat vit DANS la carte, pas chez le parent : le feed et la page detail se
   * comportent alors exactement pareil, sans que chaque appelant ait a recabler
   * la meme mecanique. C'est aussi ce qui evite qu'un ecran oublie de la
   * brancher et renvoie l'utilisateur ailleurs pour une action identique.
   */
  const [echangesOuverts, setEchangesOuverts] = useState(echangesOuvertsParDefaut)
  const { setActiveSpecies } = useSpecies()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showShare, setShowShare] = useState(false)
  /**
   * État sauvegarde : second-agent/13.
   * Source de vérité : table `saved_posts` (Supabase) via useSavedPostIds.
   * Optimistic update via useToggleSavedPost.
   */
  const { data: savedIds } = useSavedPostIds()
  const isSaved = !!savedIds?.includes(id)
  const toggleSaved = useToggleSavedPost()
  /**
   * Truncation 2 lignes : on mesure le DOM réel pour décider d'afficher
   * "Voir plus" UNIQUEMENT si le texte dépasse 2 lignes (Nicolas 2026-05-01).
   * Approche : line-clamp-2 CSS + comparaison scrollHeight vs clientHeight.
   */
  const contentRef = useRef<HTMLParagraphElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useLayoutEffect(() => {
    function measure() {
      const el = contentRef.current
      if (!el) return
      // Bug fix Nicolas 2026-05-24 : on NE mesure QUE quand le texte est
      // clampé (isExpanded=false). Sinon, en mode expanded, scrollHeight ===
      // clientHeight → setIsOverflowing(false) → l'effet ci-dessous resettait
      // isExpanded → boucle → clic « Voir plus » sans effet sur mobile.
      if (isExpanded) return
      setIsOverflowing(el.scrollHeight - el.clientHeight > 1)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [content, isExpanded])

  // Configuration de la réaction active de l'utilisateur (null si aucune).
  // Permet de remplacer dynamiquement l'emoji + le label "Réagir" par celui de
  // la réaction choisie (ex: "😍 Adoré"), conformément au feedback Nicolas.
  const activeReaction = userReaction ? REACTION_CONFIG.find((r) => r.key === userReaction) : null

  // Redirige vers /signup si l'invité tente d'interagir
  function requireAuth(e: React.MouseEvent) {
    if (!canInteract) {
      e.preventDefault()
      navigate('/signup')
    }
  }

  /** Gère le clic sur une réaction dans le picker ou dans les badges */
  function handleReact(type: ReactionType) {
    if (!canInteract) {
      navigate('/signup')
      return
    }
    onReact?.(id, type)
    setShowReactionPicker(false)
  }

  return (
    // Largeur Figma : colonne post = 656px + p-6 (24px ×2) = 704px max sur desktop.
    // Centré (mx-auto) pour s'aligner dans la zone feed quel que soit son parent.
    // Sur mobile : pleine largeur (rounded-none, le cap ne joue pas).
    <article className="bg-background relative rounded-none md:max-w-[704px] md:mx-auto w-full md:rounded-card">
      {/* Bordure de la carte : quand hideEndBorder=true on retire la
          bordure inférieure mobile (border-b-4) qui flotte dans le vide
          sur PostDetail ou en dernier item de feed. La border-[0.5px]
          desktop reste : c'est un cadre complet, pas une coupure visuelle. */}
      <div
        aria-hidden="true"
        className={[
          'absolute md:border-border md:border-[0.5px] border-border inset-0 pointer-events-none md:rounded-card',
          hideEndBorder ? '' : 'border-b-4',
        ].join(' ')}
      />

      <div className="flex flex-col gap-5 md:p-6 px-5 py-8">
        {/* Header : auteur */}
        <div className="flex items-start justify-between gap-2">
          {/* min-w-0 OBLIGATOIRE : complete la chaine de troncature jusqu'a la
              rangee meta (flex-nowrap). Sans lui, "date • lieu" (nom de ville
              long) ne se tronque pas et POUSSE la largeur au-dela de la carte
              -> scroll horizontal de toute la page + bottom nav qui deborde sur
              mobile (Nicolas 2026-06-08, regression du passage en flex-nowrap). */}
          <div className="flex gap-5 items-center min-w-0">
            {/* Avatar : Figma 48px, badge 24px (Background/Neutral/Secondary).
                Wrapped Link → navigation vers le profil de l'auteur. */}
            <Link
              to={`/profile/${author.username}`}
              aria-label={`Voir le profil de ${author.name}`}
              className="relative size-12 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <div className="size-full rounded-full overflow-hidden">
                <img
                  src={author.avatar ? ImagePresets.avatarSmall(author.avatar) : hermineIcon}
                  alt={author.name}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute border-border border-[0.5px] inset-[-0.5px] rounded-full pointer-events-none"
                />
              </div>
              {author.badge && (
                <div
                  aria-hidden="true"
                  className="absolute bg-cream-lighter bottom-[-4px] right-[-4px] flex items-center justify-center rounded-full size-6"
                >
                  <span className="text-base leading-[1.5]">{author.badge}</span>
                </div>
              )}
            </Link>

            {/* Infos auteur : Figma : nom 18px Quicksand Bold, date 14px Mulish.
                Nom cliquable → profil (cohérence avec l'avatar). */}
            <div className="flex flex-col gap-1 min-w-0">
              <Link
                to={`/profile/${author.username}`}
                className="text-lg leading-[1.2] text-foreground font-bold truncate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
              >
                {author.name}
              </Link>
              {/* Rangee meta sur UNE seule ligne (Nicolas 2026-06-06) : date +
                  lieu ne doivent pas passer sur 2 lignes meme avec un nom de
                  ville long. nowrap + min-w-0 ; la date reste entiere (shrink-0)
                  et c'est le LIEU qui se tronque avec "…" si necessaire. */}
              <div className="flex flex-nowrap gap-2 items-center min-w-0">
                {(() => {
                  // Règle globale (second-agent/04) : icône + couleur par type.
                  const cfg = POST_TYPE_ICON[postType] ?? POST_TYPE_ICON.nature_encounter
                  const Icon = cfg.Icon
                  return (
                    <Icon className={`size-[18px] shrink-0 ${cfg.colorClass}`} aria-hidden="true" />
                  )
                })()}
                {/* Date = permalien vers la page detail (Nicolas 2026-06-04).
                    Garantit un point d'entree vers /post/:id meme quand le post
                    n'a PAS de titre (sinon ces posts, ~19% en beta, etaient
                    totalement inaccessibles : le titre etait le seul lien).
                    Pattern type reseau social. Inactif sur PostDetail
                    (linkToDetail=false) pour ne pas lier vers soi-meme. */}
                {linkToDetail ? (
                  <Link
                    to={buildPostPath(id, { title, species })}
                    aria-label={t('home.post.openDetail', {
                      defaultValue: 'Voir le détail de l’observation',
                    })}
                    className="text-sm text-foreground shrink-0 whitespace-nowrap hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
                  >
                    {date}
                  </Link>
                ) : (
                  <span className="text-sm text-foreground shrink-0 whitespace-nowrap">{date}</span>
                )}
                {/* Localisation : affichée uniquement si publique ET si la
                    ville est connue (second-agent/29). Sinon le post n'affiche
                    que la date : pas de bullet orphelin. */}
                {location && (
                  <>
                    <span aria-hidden="true" className="text-foreground text-xs shrink-0">
                      •
                    </span>
                    {/* Le lieu se tronque (truncate + min-w-0) pour tenir sur une
                        ligne ; title= expose le nom complet au survol/lecteur. */}
                    <span className="text-sm text-foreground truncate min-w-0" title={location}>
                      {location}
                    </span>
                  </>
                )}
              </div>
              {/* NG-009 (2026-05-31) : date reelle d observation si differente
                  de la date de publication. Discrete (text-xs italic muted)
                  pour ne pas alourdir l interface, masquee si identique. */}
              {encounterDate && encounterDate !== date && (
                <p className="text-xs italic text-muted-foreground mt-0.5">
                  {t('home.post.observedOn', {
                    defaultValue: 'Observé le : {{date}}',
                    date: encounterDate,
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Menu contextuel */}
          <div className="relative">
            <button
              type="button"
              aria-label={t('home.post.optionsMenu')}
              aria-expanded={showOptions}
              aria-haspopup="menu"
              onClick={() => setShowOptions((v) => !v)}
              className="flex items-center justify-center size-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <MoreHorizontal className="size-5 text-foreground" aria-hidden="true" />
            </button>

            {showOptions && (
              <PostOptionsMenu
                postId={id}
                postTitle={title}
                postSpecies={species ?? scientific_name ?? null}
                authorUsername={author.username}
                authorId={authorId}
                isOwnPost={isOwnPost}
                onClose={() => setShowOptions(false)}
                onEdit={isOwnPost && onEditPost ? () => onEditPost(id, postType) : undefined}
              />
            )}
          </div>
        </div>

        {/* Contenu : titre & description rendus UNIQUEMENT si non vides
            (Nicolas 2026-05-22 : éviter un bloc blanc quand l'utilisateur
            n'a renseigné ni titre ni description, le post collapse alors
            naturellement vers les meta/chips/image sous le pseudo). */}
        {(title?.trim() || content?.trim()) && (
          <div className="flex flex-col gap-2">
            {title?.trim() &&
              (linkToDetail ? (
                // V1.1.5 NG-028 : titre cliquable -> page detail /post/:id.
                <Link
                  to={buildPostPath(id, { title, species })}
                  className="w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <h3 className="text-lg font-bold leading-[1.2] text-foreground hover:underline">
                    {title}
                  </h3>
                </Link>
              ) : (
                <h3 className="text-lg font-bold leading-[1.2] text-foreground">{title}</h3>
              ))}

            {/*
             * Description : line-clamp-2 + bouton "Voir plus" affiché UNIQUEMENT
             * si le texte déborde réellement après mesure DOM (Nicolas 2026-05-01).
             * Évite "Voir plus" sur des textes qui tiennent en 2 lignes naturellement.
             */}
            {content?.trim() &&
              // V1.1.5 (Nicolas) : sur PostDetail (expandContent), on affiche
              // toute la description, sans clamp ni "Voir plus" : l'utilisateur
              // doit voir l'integralite du post sans clic supplementaire.
              (expandContent ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {content}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <p
                    ref={contentRef}
                    className={`text-sm text-foreground leading-relaxed whitespace-pre-line ${
                      isExpanded
                        ? ''
                        : 'overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]'
                    }`}
                  >
                    {content}
                  </p>
                  {isOverflowing && !isExpanded && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(true)}
                      className="self-start text-sm text-[var(--color-link)] underline decoration-solid focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {t('home.post.seeMore')}
                    </button>
                  )}
                  {isExpanded && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="self-start text-sm text-[var(--color-link)] underline decoration-solid focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {t('home.post.seeLess')}
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Habitat / météo / moment : ordre demandé Nicolas 2026-05-04 :
            1. Habitat (en premier si renseigné)
            2. Météo (avec emoji)
            3. Moment de la journée
            Bloc séparé du titre/description : reste affiché même si l'utilisateur
            n'a pas renseigné de titre/description (collapse propre du bloc texte). */}
        {(() => {
          const labelHabitat = habitat
            ? t(`contribute.habitat.${habitat}`, { defaultValue: habitat })
            : null
          const emojiHabitat = habitat ? HABITAT_EMOJI[habitat] : null

          const labelWeather = weather
            ? t(`contribute.weather.${weather}`, { defaultValue: weather })
            : null
          const emojiWeather = weather ? WEATHER_EMOJI[weather] : null

          const labelTimeOfDay = timeOfDay
            ? t(`contribute.date.${timeOfDay}`, { defaultValue: timeOfDay })
            : null

          const labelClouds = clouds || null

          // Construire le pipeline de segments dans l'ordre demandé
          const segments: React.ReactNode[] = []
          if (labelHabitat) {
            segments.push(
              <span key="habitat" className="inline-flex items-center gap-1">
                {emojiHabitat && <span aria-hidden="true">{emojiHabitat}</span>}
                {labelHabitat}
              </span>,
            )
          }
          if (labelWeather) {
            segments.push(
              <span key="weather" className="inline-flex items-center gap-1">
                {emojiWeather && <span aria-hidden="true">{emojiWeather}</span>}
                {labelWeather}
              </span>,
            )
          }
          if (labelClouds) {
            segments.push(<span key="clouds">{labelClouds}</span>)
          }
          if (labelTimeOfDay) {
            segments.push(<span key="time">{labelTimeOfDay}</span>)
          }

          if (segments.length === 0) return null

          // Joindre avec separateur " • " entre chaque segment
          return (
            <div className="flex gap-2 items-center flex-wrap text-sm text-foreground">
              {segments.map((seg, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span aria-hidden="true" className="text-xs">
                      •
                    </span>
                  )}
                  {seg}
                </React.Fragment>
              ))}
            </div>
          )
        })()}

        {/*
         * Chips catégorie + espèce : règle Nicolas 2026-05-01 :
         * TOUJOURS 2 chips séparés (catégorie d'abord, espèce ensuite),
         * jamais une combinaison fusionnée. La catégorie est cliquable seule,
         * l'espèce identifiée est aussi cliquable seule.
         *
         * Règles :
         *   1. Catégorie connue + espèce identifiée
         *      → 2 chips : "{emoji} {Catégorie}" + "{nomCommun}{(plusieurs)}" (les 2 cliquables)
         *   2. Catégorie connue + espèce non identifiée
         *      → 2 chips : "{emoji} {Catégorie}" + "Espèce non déterminée" (passive)
         *   3. Rien d'identifié
         *      → 1 chip simple "Espèce non déterminée" (passive)
         */}
        {/* V1.2.0 (NG-005/006) : si ce post est issu d un carnet, on
            remplace les chips espece/categorie classiques par la carte
            carnet d observations avec la liste categorisee par classe
            taxonomique. */}
        {/* NG-006B #7 (fallback) : on affiche la carte carnet UNIQUEMENT si le
            carnet a > 1 espece. Avec 0 ou 1 espece, le carnet n'a plus de sens
            -> on retombe sur le chip espece standard (bloc ci-dessous), le post
            portant deja son espece representative. Garde-fou : count inconnu
            (null) => on garde la carte (?? 2) pour ne pas masquer un vrai carnet
            dont le compteur n'aurait pas charge. */}
        {/* NG (Nicolas 2026-06-11) : carnets masques en prod (NOTEBOOKS_ENABLED).
            Les Rencontres multi-especes deja publiees s'affichent alors comme des
            posts standards (chips espece ci-dessous). Reversible via le flag. */}
        {postType !== 'nature_instant' &&
          NOTEBOOKS_ENABLED &&
          notebookId &&
          (notebookSpeciesCount ?? 2) > 1 && (
            <NotebookCardInFeed
              notebookId={notebookId}
              speciesCount={notebookSpeciesCount ?? undefined}
              // Ferme par defaut DANS LE FIL (Nicolas 2026-06-08), ouvert sur la
              // page detail immersive (expandContent).
              defaultOpen={expandContent}
            />
          )}

        {/* Pour les posts nature_instant : pas de chips espèce/catégorie
            : un instant nature ne décrit pas une observation d'espèce
            (Nicolas 2026-05-23). On masque toute la rangée pour éviter
            le « Espèce non déterminée » qui n'a pas de sens ici. */}
        {/* NG-006B #7 : chips standard si PAS de carte carnet (donc : post sans
            carnet, OU carnet retombe a <=1 espece). */}
        {postType !== 'nature_instant' &&
          !(NOTEBOOKS_ENABLED && notebookId && (notebookSpeciesCount ?? 2) > 1) && (
            // nowrap : categorie + espece restent sur UNE ligne (l'espece se tronque
            // pour tenir, cf. RevealableText), au lieu de passer a la ligne sur mobile.
            <div className="flex flex-nowrap items-center gap-2">
              {(() => {
                const taxonomicCfg = taxonomic_group
                  ? TAXONOMIC_GROUP_CONFIG[taxonomic_group]
                  : null
                const categoryLabel = taxonomicCfg?.label ?? null

                // Espèce identifiée = on a au moins le nom commun OU scientifique.
                // V1.1.4 NG-023 (Nicolas 2026-06-01) : reactivation du chip
                // cliquable maintenant que NG-022 a connecte le Species Context
                // Layer au backend (filter par taxref_id). Cliquer sur l espece
                // dans un post -> feed filtre par cette espece + bandeau qui
                // permet de reset au feed global.
                const speciesName = species || scientific_name || null
                const hasIdentifiedSpecies = !!speciesName
                // V1.1.5 (Nicolas) : disableChipFilters rend le chip espece passif
                // (post principal de PostDetail).
                const isSpeciesClickable = !!taxref_id && !disableChipFilters
                const unknownLabel = t('home.post.unknownSpecies', {
                  defaultValue: 'Espèce non déterminée',
                })

                // Suffixe "({count})" SEULEMENT si on a un nombre exact > 1.
                // Pas de "(plusieurs)" : toujours un chiffre exact (Nicolas
                // 2026-05-01) ou rien.
                // TODO Phase 2 backend : exposer `posts.individuals_count` pour
                // que le compteur soit toujours disponible.
                const multipleSuffix =
                  individualsCount && individualsCount > 1 ? ` (${individualsCount})` : ''

                // Chip catégorie : texte uniquement, pas d'emoji (règle DS Nicolas
                // 2026-05-02 : alléger le design, jamais d'emoji dans les chips
                // pour garder la cohérence visuelle avec le reste du produit).
                // V1.1.4 NG-023 ext final (Nicolas 2026-06-01) : click chip cat ->
                // coche la categorie dans FeedFilterPanel (badge "1" naturel).
                // L user reset via le panneau filtres standard. Sur Profile et
                // PostDetail (onSelectCategory undefined), le chip reste passif.
                const isCategoryClickable =
                  !!onSelectCategory && !!taxonomic_group && !disableChipFilters
                const categoryChip = categoryLabel ? (
                  isCategoryClickable ? (
                    <button
                      type="button"
                      onClick={() => onSelectCategory!(taxonomic_group!)}
                      aria-label={t('home.post.filterByCategory', {
                        defaultValue: 'Filtrer par {{category}}',
                        category: categoryLabel,
                      })}
                      className={`${CHIP_BASE_CLASS} ${CHIP_INTERACTIVE_CLASS} shrink-0`}
                    >
                      <span>{categoryLabel}</span>
                    </button>
                  ) : (
                    <span className={`${CHIP_BASE_CLASS} shrink-0`}>
                      <span>{categoryLabel}</span>
                    </span>
                  )
                ) : null

                // ─── Cas 1 : catégorie + espèce identifiée → 2 chips séparés ───
                // Si taxref_id présent → chip cliquable (filtre). Sinon → chip
                // passif qui affiche quand même le nom (anciens posts).
                if (hasIdentifiedSpecies) {
                  return (
                    <>
                      {categoryChip}
                      {isSpeciesClickable ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSpecies({
                              taxref_id: taxref_id!,
                              scientific_name: scientific_name ?? speciesName!,
                              common_name:
                                speciesName !== scientific_name ? (speciesName ?? null) : null,
                              group_label: taxonomic_group ?? null,
                            })
                            // QA Nicolas : scroll up auto, coherence avec chip categorie
                            window.scrollTo({ top: 0, behavior: 'auto' })
                          }}
                          aria-label={t('home.post.filterBySpecies', {
                            species: speciesName ?? '',
                          })}
                          className={`${CHIP_BASE_CLASS} ${CHIP_INTERACTIVE_CLASS} min-w-0 max-w-full`}
                        >
                          <RevealableText text={`${speciesName}${multipleSuffix}`} />
                        </button>
                      ) : (
                        <span className={`${CHIP_BASE_CLASS} min-w-0 max-w-full`}>
                          <RevealableText text={`${speciesName}${multipleSuffix}`} />
                        </span>
                      )}
                    </>
                  )
                }

                // ─── Cas 2 : catégorie connue + espèce non identifiée → 2 chips ──
                if (categoryLabel) {
                  return (
                    <>
                      {categoryChip}
                      <span className={CHIP_PASSIVE_CLASS}>
                        {unknownLabel}
                        {multipleSuffix}
                      </span>
                    </>
                  )
                }

                // ─── Cas 3 : rien d'identifié → 1 chip neutre (non cliquable) ───
                return (
                  <span className={CHIP_PASSIVE_CLASS}>
                    {unknownLabel}
                    {multipleSuffix}
                  </span>
                )
              })()}
            </div>
          )}

        {/* Images : clic ouvre la lightbox plein écran */}
        <ImageSlider
          images={images}
          format={format}
          author={author}
          postId={id}
          postTitle={title}
          // NG-053 : on transmet l'espece et le lieu DEJA affiches par la
          // publication, pour que le plein ecran garde le contexte naturaliste.
          // Reutiliser la meme chaine de lieu garantit que le viewer ne montre
          // jamais plus que l'en-tete du post (filtrage location_hidden en amont).
          speciesName={species}
          location={location}
          priority={priority}
        />

        {/* Compteurs réactions (Figma node 6385:60468 : flex justify-between).
            Le slot droit accueillera le compteur commentaires en post-MVP. */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {totalReactions > 0 ? (
              REACTION_CONFIG.filter(({ key }) => reactions[key] > 0).map(
                ({ key, emoji, labelKey }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleReact(key)}
                    aria-label={`${t(labelKey)} : ${reactions[key]}${userReaction === key ? ` : ${t('home.post.yourReaction')}` : ''}`}
                    className={[
                      'flex gap-1 items-center h-6 px-1 rounded-full text-sm transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                      // Compteurs : pas de background (Figma 6385:97233).
                      // Couleur primary si c'est la réaction posée par l'user, foreground sinon.
                      // Hover discret pour signaler l'interactivité.
                      userReaction === key
                        ? 'text-[var(--color-link)] font-semibold reaction-active hover:bg-primary-light/40'
                        : 'text-foreground hover:bg-muted/30',
                    ].join(' ')}
                  >
                    <span aria-hidden="true" className={userReaction === key ? 'reaction-pop' : ''}>
                      {emoji}
                    </span>
                    <span>{reactions[key]}</span>
                  </button>
                ),
              )
            ) : (
              <span className="text-xs text-muted-foreground">{t('home.post.noReactions')}</span>
            )}
          </div>

          {/*
            Slot droit de la rangee reactions : compteur d'echanges, comme sur
            la maquette. CLIQUABLE (Nicolas 2026-07-28) : ouvre le fil, comme le
            bouton "Échanges" de la rangee du dessous, car apres un refresh le
            panneau est referme et l'utilisateur cherchait a rouvrir ses
            echanges en cliquant le compteur. Masque a zero.
          */}
          {comments > 0 && (
            <button
              type="button"
              onClick={() => setEchangesOuverts((v) => !v)}
              aria-expanded={echangesOuverts}
              className="flex items-center gap-1 rounded text-sm text-foreground transition-colors hover:text-[var(--color-link)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`${comments} échange${comments > 1 ? 's' : ''}, ouvrir le fil`}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              <span className="tabular-nums" aria-hidden="true">
                {comments}
              </span>
            </button>
          )}
        </div>

        {/* Séparateur */}
        <hr className="border-border border-[0.5px]" />

        {/* Actions : réagir, sauvegarder, partager. Slot "Commentaires"
            (Figma node 6385:60494) sera ajouté post-MVP entre Réagir et le
            groupe droit. */}
        <div className="flex items-center justify-between h-8">
          <div className="relative flex gap-1">
            {/* Bouton React : affiche le picker d'emojis au clic */}
            <button
              type="button"
              onClick={(e) => {
                if (!canInteract) {
                  requireAuth(e)
                  return
                }
                setShowReactionPicker((o) => !o)
              }}
              aria-expanded={showReactionPicker}
              aria-label={
                activeReaction
                  ? `${t(activeReaction.labelKey)} : ${t('home.post.yourReaction')}`
                  : t('home.post.react')
              }
              className={[
                'flex gap-2 items-center h-8 px-3 rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                // État actif (réaction posée) : fond primary-light + couleur primary +
                // label toujours visible : second-agent/10 (Figma 6385:128317).
                activeReaction
                  ? 'bg-primary-light text-[var(--color-link)] font-semibold'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              {/*
                État par défaut : icône lucide Heart + label "Réagir" (Figma 6385:97680).
                État actif : emoji de la réaction posée + label de la réaction.
              */}
              {activeReaction ? (
                <span className="text-base" aria-hidden="true">
                  {activeReaction.emoji}
                </span>
              ) : (
                <Heart className="size-4" aria-hidden="true" />
              )}
              {/*
                Label : caché en mobile pour gagner de la place QUAND il n'y a
                pas de réaction active. Mais quand l'utilisateur a réagi, on
                affiche systématiquement le label (même mobile) car c'est un
                signal d'état important.
              */}
              <span
                className={[
                  'text-base font-bold',
                  activeReaction ? 'inline' : 'hidden md:inline',
                ].join(' ')}
              >
                {activeReaction ? t(activeReaction.labelKey) : t('home.post.react')}
              </span>
            </button>

            {/* Picker d'emojis : popup au-dessus du bouton */}
            {showReactionPicker && (
              <>
                {/* Backdrop invisible pour fermer le picker */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowReactionPicker(false)}
                  aria-hidden="true"
                />
                <div
                  role="group"
                  aria-label={t('home.post.chooseReaction')}
                  className="absolute bottom-full left-0 mb-2 z-50 flex gap-1 bg-background border border-border rounded-full px-2 py-1.5 shadow-lg reaction-picker-enter"
                >
                  {REACTION_CONFIG.map(({ key, emoji, labelKey }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleReact(key)}
                      aria-label={t(labelKey)}
                      aria-pressed={userReaction === key}
                      className={[
                        'size-9 flex items-center justify-center rounded-full text-xl transition-transform duration-150',
                        'hover:scale-125 hover:bg-muted/50',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        userReaction === key ? 'bg-primary/15 scale-110' : '',
                      ].join(' ')}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/*
              Bouton Échanges (NG-049), a cote de "Réagir" comme sur la maquette
              (Figma node 6385:60494, slot laisse libre dans le code depuis le
              MVP). Le COMPTEUR, lui, est dans la rangee des reactions au-dessus.

              Deux comportements selon le contexte :
                - page detail : ouvre ou ferme le fil, c'est la qu'il vit ;
                - fil d'accueil : renvoie vers la publication. On ne charge pas
                  les echanges de chaque carte du feed, ce serait autant de
                  requetes pour du contenu que personne ne lit encore.

              Accessible aux visiteurs : LIRE ne demande pas de compte (suite de
              NG-054). C'est ecrire qui en demande un.
            */}
            <button
              type="button"
              onClick={() => setEchangesOuverts((v) => !v)}
              aria-expanded={echangesOuverts}
              className={[
                'flex items-center gap-2 h-8 px-3 rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                // Etat actif des maquettes (Figma 6819-13138) : pastille
                // lavande, texte inchange. Colorer le texte ne suffisait pas,
                // rien ne montrait que le fil etait ouvert JUSTE en dessous.
                echangesOuverts
                  ? 'bg-primary-light text-foreground'
                  : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              {/* Meme typographie et meme comportement que "Réagir" juste a
                  cote : deux actions voisines de la meme barre ne doivent pas
                  se distinguer par leur graisse. */}
              <span className="text-base font-bold hidden md:inline">Échanges</span>
            </button>
          </div>
          <div className="flex gap-1">
            {/*
              Bouton Sauvegarder : second-agent/13.
              État optimiste local, TODO BACKEND : câbler à `saved_posts`.
              Visuel actif : icône BookmarkCheck + couleur primary.
            */}
            <button
              type="button"
              onClick={(e) => {
                if (!canInteract) {
                  requireAuth(e)
                  return
                }
                // Persistance via mutation Supabase (`saved_posts`).
                // Optimistic update géré dans le hook.
                toggleSaved.mutate({ postId: id, currentlySaved: isSaved })
              }}
              aria-pressed={isSaved}
              aria-label={t('home.post.save')}
              className={[
                'flex items-center justify-center h-8 w-8 rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                isSaved ? 'text-[var(--color-link)]' : 'text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              {isSaved ? (
                <BookmarkCheck className="size-4 fill-primary" aria-hidden="true" />
              ) : (
                <Bookmark className="size-4" aria-hidden="true" />
              )}
            </button>

            {/*
              Bouton Partager : second-agent/14.
              Ouvre SharePopover (popover desktop / bottom sheet mobile).
            */}
            {/*
              Partage : accessible même aux invités : un lien public d'observation
              ne nécessite pas d'authentification (URL canonique).
              SharePopover est une modale centrée full-screen, pas besoin de
              wrapper `relative` autour du bouton.
            */}
            <button
              type="button"
              onClick={() => setShowShare((v) => !v)}
              aria-expanded={showShare}
              aria-haspopup="dialog"
              aria-label={t('home.post.share')}
              className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              <Share2 className="size-4 text-foreground" aria-hidden="true" />
            </button>
            {showShare && (
              <SharePopover
                postId={id}
                title={title}
                species={species ?? scientific_name ?? null}
                onClose={() => setShowShare(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/*
        Fil d'Echanges DANS la carte, jamais dans un bloc separe : il prolonge
        la publication au lieu d'ouvrir une nouvelle section, ce qui evite au
        lecteur de se demander a quoi il repond.

        Le repli du Suspense reprend la hauteur du bandeau de saisie pour que la
        page ne saute pas pendant le chargement du morceau de code.
      */}
      {echangesOuverts && (
        <Suspense
          fallback={
            <div className="h-24 animate-pulse bg-surface-bubble md:rounded-b-card" aria-hidden />
          }
        >
          {/* Instant nature (paysage) : pas de proposition d'espece, juste les
              echanges. Une identification n'a pas de sens sur un paysage. */}
          <EchangesSection
            postId={id}
            auteurPublicationId={authorId}
            especesAutorisees={postType !== 'nature_instant'}
          />
        </Suspense>
      )}
    </article>
  )
}
