/**
 * ContributeEncounterForm : Panel latéral Rencontre Nature (3 étapes)
 *
 * Rendu sous forme de panneau droit fixe superposé au feed (design Figma v2).
 * Sur mobile le panneau prend toute la largeur de l'écran.
 *
 * Étape 1 : Photos + format d'affichage
 * Étape 2 : Carnet d'observations (espèces + compteurs)
 * Étape 3 : Contexte & détails (titre, description, date, lieu, visibilité)
 *
 * TODO [BACKEND] :
 *   1. Upload médias → Supabase Storage 'post-media'
 *   2. POST /posts { type: 'nature_encounter', ... }
 *   3. queryClient.invalidateQueries({ queryKey: ['feed'] })
 */

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, X, ImageOff, RotateCcw, ImageUp, Loader2 } from 'lucide-react'
import type { TimeOfDay, WeatherCondition, HabitatType, DisplayFormat } from '@/types/database'
import { EncounterStep1 } from './EncounterStep1'
import { EncounterStep2 } from './EncounterStep2'
import { EncounterStep3 } from './EncounterStep3'
import type { ObservationEntry } from './EncounterStep2'
import type { NotebookObservation } from '@/services/notebookService'
import type { TaxonomicGroup } from '@/types/database'
import type { PhotoMetadata } from '@/utils/extractPhotoMetadata'
import { toStorageTimestamp, toDateInputValue } from '@/utils/observationDate'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
// Pipeline submit factorisé : partagé avec ContributeInstantPanel pour
// garantir que les deux flows restent strictement alignés (Nicolas
// 2026-05-23 audit final : single source of truth pour compression,
// upload, watchdog, rollback).
import { useContributePostSubmit } from '@/hooks/useContributePostSubmit'
import { readDraft, useDraftAutoSave, clearDraft } from '@/hooks/useContributeDraft'
// NG-038 : persistance des PHOTOS de brouillon via IndexedDB (les File ne
// tiennent pas en localStorage -> photos perdues au refresh sans ce store).
import { loadDraftPhotos, saveDraftPhotos, clearDraftPhotos } from '@/lib/draftPhotoStore'
import { trackAction, trackFailure } from '@/lib/monitoring'
import { NOTEBOOKS_ENABLED } from '@/lib/featureFlags'
import { POST_LIMITS } from '@/lib/postValidation'
import { createProposal } from '@/services/identificationService'
import { Button } from '@/components/ui/Button'
// V1.2.0 NG-005 : sauvegarde reelle multi-especes via carnet.
import {
  createPublishedNotebookFromEncounter,
  publishExistingNotebookForPost,
  replaceNotebookObservations,
  listUserNotebooks,
  getNotebookWithObservations,
  type Notebook,
} from '@/services/notebookService'

// V1.2.0 : mapping interne TaxonomicGroup -> iNat class pour vernacular_class.
// Symetrique au CLASS_TO_GROUP de EncounterStep2 mais en sens inverse.
const GROUP_TO_INAT_CLASS: Record<string, string> = {
  birds: 'Aves',
  mammals: 'Mammalia',
  insects: 'Insecta',
  amphibians: 'Amphibia',
  reptiles: 'Reptilia',
  fish: 'Actinopterygii',
  arachnids: 'Arachnida',
  mollusks: 'Mollusca',
  plants: 'Plantae',
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * État du formulaire Rencontre : Figma v3 (complet) :
 *   Étape 3 collecte Titre (optionnel), Description*, Date, Localisation +
 *   Options avancées repliables : habitat / météo / moment de la journée.
 *   Visibilité pilotée par le switch de localisation ; défaut 'public'.
 */
interface EncounterFormData {
  // Étape 1
  files: File[]
  /** Format d'affichage choisi par l'utilisateur (Figma 6385:47324) : Paysage
   *  16:9 par défaut, l'utilisateur peut basculer en Portrait 3:4 ou Carré 1:1. */
  displayFormat: DisplayFormat
  /** Métadonnées EXIF agrégées (date/GPS/time-of-day) pour l'étape 3. */
  photoMetadata: PhotoMetadata
  // Étape 2
  observations: ObservationEntry[]
  helpIdentification: boolean
  // Étape 3
  title: string
  description: string
  encounterDate: string
  timeOfDay: TimeOfDay | ''
  weather: WeatherCondition | ''
  habitat: HabitatType | ''
  locationName: string
  /** Coordonnées GPS de la ville sélectionnée via autocomplete API Adresse -
   *  utilisées par le serveur pour reverse-geocoding cohérent (city, region). */
  locationLat: number | null
  locationLng: number | null
  /** Pays déduit de la source autocomplete (« France » / « Canada »).
   *  Persisté avec le post pour afficher au moins le pays en mode privé. */
  locationCountry: string | null
  /** Région / province issue de l'autocomplete (ex « Québec », « Pays de la
   *  Loire »). Sert au format « Ville, Région, Pays » en mode public. */
  locationRegion: string | null
  /** true = lat/lng masquées publiquement (seule la région est visible). */
  locationHidden: boolean
}

const TOTAL_STEPS = 3

// ─── Composant ────────────────────────────────────────────────────────────────

interface ContributeEncounterFormProps {
  /** Ferme le panneau (retour au feed) */
  onClose: () => void
  /**
   * Si défini : panneau en mode ÉDITION du post existant. Les champs sont
   * pré-remplis depuis la base au mount, et le submit appelle updatePost()
   * au lieu de createPost() (Nicolas 2026-05-24).
   */
  editingPostId?: string
}

export function ContributeEncounterForm({ onClose, editingPostId }: ContributeEncounterFormProps) {
  const { t } = useTranslation()
  const { user } = useAuth()

  // Pipeline submit factorisé : identique à ContributeInstantPanel.
  const { submit, isSubmitting, uploadProgress, uploadError, clearError } =
    useContributePostSubmit('ContributeEncounterForm')

  // V1.2.0 (Nicolas 2026-06-09) : carnet PUBLIE dedie du post, uniquement en
  // mode EDITION (= post.notebook_id charge au mount). Sert a re-synchroniser
  // CE carnet en place au save. Les carnets de travail importes via le bouton
  // livre NE sont PAS lies au post : leurs especes sont COPIEES dans le post
  // (donnees independantes, comme une saisie manuelle). Donc supprimer un
  // carnet de travail n'impacte jamais le post.
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null)
  // Liste des carnets draft/active du user pour le picker (lazy fetch au mount).
  const [availableNotebooks, setAvailableNotebooks] = useState<Notebook[]>([])
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    // 'finished' inclus : un carnet "Termine" est un enregistrement prive que
    // l'user vient justement rattacher ici a sa Rencontre (Nicolas 2026-06-08).
    listUserNotebooks(user.id, { statuses: ['draft', 'active', 'finished'], limit: 10 })
      .then((nbs) => {
        if (!cancelled) setAvailableNotebooks(nbs)
      })
      .catch(() => {
        if (!cancelled) setAvailableNotebooks([])
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const isEditing = !!editingPostId

  // NG-004 (Nicolas 2026-05-31) : auto-save brouillon en localStorage (TTL 30 min)
  // pour ne pas perdre le travail en cas d erreur de submit ou refresh accidentel.
  // Pas en mode edition (les valeurs viennent de la DB, pas pertinent).
  // Inclut maintenant `step` pour reprendre l user a l etape ou il etait
  // (retour QA Nicolas : "j ai du me refaire les 3 etapes pour comprendre").
  const DRAFT_KEY = 'encounter-v1'
  type DraftPayload = Omit<EncounterFormData, 'files'> & { step?: number }
  const restoredDraft = !editingPostId ? readDraft<DraftPayload>(DRAFT_KEY) : null

  // En mode edition -> step 3 force. Sinon : si brouillon avec step memorise,
  // on reprend ou l user etait. Sinon : step 1 (debut neuf).
  // Cap a 2 max : sans photos persistees on ne peut pas valider step 3, donc
  // on s arrete a step 2 (especes) qui permet de continuer logiquement.
  const [step, setStep] = useState<number>(() => {
    if (editingPostId) return 3
    if (restoredDraft?.step && restoredDraft.step > 1) {
      return Math.min(restoredDraft.step, 2)
    }
    return 1
  })
  const [form, setForm] = useState<EncounterFormData>(() => {
    const defaults: EncounterFormData = {
      files: [],
      displayFormat: '16:9',
      photoMetadata: {},
      observations: [],
      helpIdentification: false,
      title: '',
      description: '',
      encounterDate: new Date().toISOString().slice(0, 10),
      timeOfDay: '',
      weather: '',
      habitat: '',
      locationName: '',
      locationLat: null,
      locationLng: null,
      locationCountry: null,
      locationRegion: null,
      // Par défaut la localisation précise est masquée (sobriété privacy) ;
      // l'utilisateur peut activer le switch « rendre public » à l'étape 3.
      locationHidden: true,
    }
    return restoredDraft ? { ...defaults, ...restoredDraft, files: [] } : defaults
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Gate l'affichage des erreurs inline (second-agent/30) : passe à true au
  // premier handleSubmit ; remis à false sur navigation entre étapes.
  const [submitAttempted, setSubmitAttempted] = useState(false)
  // V1.1.4 NG-024 (Nicolas 2026-06-01) : photos existantes en mode edition.
  // Charge des qu on a un editingPostId pour les afficher en step 1 + step 3.
  // Le storage_path est RECONSTRUIT depuis l URL publique (la colonne
  // n existe pas en DB, seul url est stocke).
  const [existingMedia, setExistingMedia] = useState<
    Array<{ id: string; url: string; storagePath: string }>
  >([])

  // ── Pré-remplissage en mode édition ─────────────────────────────────────
  // Quand editingPostId est défini au mount, on fetch les valeurs courantes
  // du post + sa première observation (species) et on initialise le form
  // pour que l'utilisateur retrouve son contenu et puisse corriger.
  // Les photos existantes ne sont PAS re-injectées dans `files` (on ne sait
  // pas reconstruire un File depuis une URL distante facilement) : les
  // nouvelles photos uploadées seront ajoutées en append.
  useEffect(() => {
    if (!editingPostId || !supabase) return
    let cancelled = false
    // L etape est deja sur 3 via le lazy init du useState plus haut.
    // Ici on charge les valeurs du post pour pre-remplir le form.
    ;(async () => {
      // Cast `any` car les types supabase générés sont en retard sur
      // certaines colonnes (individuals_count, display_format) : runtime OK.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: postRaw, error } = await (supabase as any)
        .from('posts')
        .select(
          'title, description, encounter_date, time_of_day, weather, habitat, location_name, latitude, longitude, country, region, city, location_hidden, species_name, scientific_name, taxonomic_group, taxref_id, individuals_count, display_format, notebook_id',
        )
        .eq('id', editingPostId)
        .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const post = postRaw as any
      if (cancelled || error || !post) {
        if (error) console.error('[ContributeEncounterForm] edit fetch error :', error)
        if (!post) console.warn('[ContributeEncounterForm] post introuvable :', editingPostId)
        return
      }
      // Reconstruit la première observation à partir des species_* du post
      // (si l'espèce était identifiée). Sinon on injecte une observation
      // « inconnue » pour rester cohérent avec le carnet.
      const initialObs: ObservationEntry[] = post.species_name
        ? [
            {
              id: `obs-edit-${editingPostId}`,
              species: post.taxref_id
                ? {
                    id: post.taxref_id,
                    commonName: post.species_name,
                    scientificName: post.scientific_name ?? '',
                    group: (post.taxonomic_group ??
                      'other') as ObservationEntry['species'] extends infer S
                      ? S extends { group: infer G }
                        ? G
                        : never
                      : never,
                  }
                : null,
              isUnknown: !post.taxref_id,
              count: post.individuals_count ?? 1,
            },
          ]
        : []
      setForm((prev) => ({
        ...prev,
        title: post.title ?? '',
        description: post.description ?? '',
        // V1.1.4 NG-027 round 12 : lecture date-only sans decalage timezone
        // (cf utils/observationDate.toDateInputValue). Avant : encounter_date est TIMESTAMPTZ
        // en DB, Supabase renvoie un ISO complet ("2026-05-15T00:00:00.000Z").
        // L'<input type="date"> exige strict YYYY-MM-DD : sans slice, certains
        // navigateurs rejettent et l'input apparait reinitialise.
        encounterDate: toDateInputValue(post.encounter_date) || prev.encounterDate,
        timeOfDay: (post.time_of_day ?? '') as EncounterFormData['timeOfDay'],
        weather: (post.weather ?? '') as EncounterFormData['weather'],
        habitat: (post.habitat ?? '') as EncounterFormData['habitat'],
        locationName: post.location_name ?? '',
        locationLat: post.latitude ?? null,
        locationLng: post.longitude ?? null,
        locationCountry: post.country ?? null,
        locationRegion: post.region ?? null,
        locationHidden: post.location_hidden ?? true,
        displayFormat: (post.display_format ?? '16:9') as DisplayFormat,
        observations: initialObs,
      }))

      // V1.2.0 : post issu d'un carnet -> on charge TOUTES ses especes (pas
      // seulement species_name) pour permettre l'edition complete de la liste,
      // et on memorise le carnet DEDIE du post (editingNotebookId) pour le
      // re-synchroniser en place a la sauvegarde.
      if (post.notebook_id) {
        setEditingNotebookId(post.notebook_id)
        try {
          const full = await getNotebookWithObservations(post.notebook_id)
          if (!cancelled && full && full.observations.length > 0) {
            const nbEntries: ObservationEntry[] = full.observations.map((obs) => ({
              id: obs.id,
              isUnknown: false,
              count: obs.individuals_count,
              sourceNotebookId: post.notebook_id,
              species: {
                id: obs.taxref_id,
                commonName: obs.species_name,
                scientificName: obs.scientific_name ?? '',
                group: (() => {
                  const cls = obs.vernacular_class ?? ''
                  const map: Record<string, TaxonomicGroup> = {
                    Aves: 'birds',
                    Mammalia: 'mammals',
                    Insecta: 'insects',
                    Amphibia: 'amphibians',
                    Reptilia: 'reptiles',
                    Actinopterygii: 'fish',
                    Arachnida: 'arachnids',
                    Mollusca: 'mollusks',
                    Plantae: 'plants',
                  }
                  return map[cls] ?? ('other' as TaxonomicGroup)
                })(),
                rank: 'species',
              },
            }))
            setForm((prev) => ({ ...prev, observations: nbEntries }))
          }
        } catch (e) {
          console.warn('[ContributeEncounterForm] chargement especes carnet (edit) échoué', e)
        }
      }

      // V1.1.4 NG-024 : charge aussi les medias existants pour les afficher
      // dans l UI d edition. Sans ce fetch, l user voyait son post sans
      // aucune photo et pensait qu elles avaient ete perdues.
      // FIX 2026-06-01 : la colonne storage_path n existe PAS sur la table
      // media (seule url est stockee). On reconstruit le path depuis l URL
      // publique : tout ce qui suit /post-media/ dans l URL est le path.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mediaRaw, error: mediaErr } = await (supabase as any)
        .from('media')
        .select('id, url, display_order')
        .eq('post_id', editingPostId)
        .order('display_order', { ascending: true })
      if (mediaErr) {
        console.error('[ContributeEncounterForm] fetch media error :', mediaErr)
      }
      if (!cancelled && Array.isArray(mediaRaw)) {
        setExistingMedia(
          mediaRaw.map((m: { id: string; url: string }) => {
            // Extrait le path depuis l URL publique Supabase Storage
            // Format : .../storage/v1/object/public/post-media/USER_ID/POST_ID/file.webp
            const marker = '/post-media/'
            const idx = m.url.indexOf(marker)
            const storagePath = idx >= 0 ? m.url.slice(idx + marker.length).split('?')[0] : ''
            return { id: m.id, url: m.url, storagePath }
          }),
        )
      }
      // setStep(3) deja appele plus haut (avant le fetch async) pour
      // garantir que l user est sur l etape details meme si le fetch
      // post echoue (data partielle vs aucune visibilite UI).
    })()
    return () => {
      cancelled = true
    }
  }, [editingPostId])

  // NG-004 auto-save brouillon : ecrit toutes les ~1s dans localStorage
  // un snapshot du form sans les Files. Restauration au prochain mount
  // via le lazy init du useState plus haut. Desactive en mode edition.
  useDraftAutoSave<DraftPayload>(
    DRAFT_KEY,
    {
      displayFormat: form.displayFormat,
      photoMetadata: form.photoMetadata,
      observations: form.observations,
      helpIdentification: form.helpIdentification,
      title: form.title,
      description: form.description,
      encounterDate: form.encounterDate,
      timeOfDay: form.timeOfDay,
      weather: form.weather,
      habitat: form.habitat,
      locationName: form.locationName,
      locationLat: form.locationLat,
      locationLng: form.locationLng,
      locationCountry: form.locationCountry,
      locationRegion: form.locationRegion,
      locationHidden: form.locationHidden,
      step,
    },
    !isEditing,
  )

  // NG-038 : restauration des photos de brouillon (IndexedDB) au mount.
  // Uniquement hors edition + si le form n'a pas deja des photos (evite
  // d'ecraser une saisie en cours). Best-effort.
  useEffect(() => {
    if (isEditing) return
    let cancelled = false
    loadDraftPhotos(DRAFT_KEY)
      .then((files) => {
        if (!cancelled && files.length > 0) {
          setForm((prev) => (prev.files.length > 0 ? prev : { ...prev, files }))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // NG-038 : sauvegarde des photos en IndexedDB des qu'elles changent (hors
  // edition). Complete l'auto-save texte (localStorage) qui ne porte pas les File.
  // On SAUTE le tout premier run (mount) : sinon il sauvegarderait files=[] ->
  // effacerait les photos AVANT que la restauration au mount ne les lise (race).
  const skipFirstPhotoSaveRef = useRef(true)
  useEffect(() => {
    if (isEditing) return
    if (skipFirstPhotoSaveRef.current) {
      skipFirstPhotoSaveRef.current = false
      return
    }
    void saveDraftPhotos(DRAFT_KEY, form.files)
  }, [form.files, isEditing, DRAFT_KEY])

  // Fermer sur Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Bloquer le scroll du body quand le panneau est ouvert
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function set<K extends keyof EncounterFormData>(key: K, value: EncounterFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key as string])
      setErrors((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([k]) => k !== (key as string))),
      )
  }

  // ── Gestion carnet d'observations (étape 2) ──────────────────────────────

  function handleAddObservation(entry: ObservationEntry) {
    setForm((prev) => ({ ...prev, observations: [...prev.observations, entry] }))
  }

  function handleRemoveObservation(id: string) {
    setForm((prev) => ({
      ...prev,
      observations: prev.observations.filter((o) => o.id !== id),
    }))
  }

  function handleCountChange(id: string, delta: number) {
    setForm((prev) => ({
      ...prev,
      observations: prev.observations.map((o) =>
        o.id === id ? { ...o, count: Math.max(1, o.count + delta) } : o,
      ),
    }))
  }

  // ── Navigation entre étapes ──────────────────────────────────────────────

  /** Validation step 3 avant soumission.
   *  Phase test (second-agent/30) : description NON obligatoire.
   *  Retour testeur 2026-06-11 : on borne aussi le titre (160 = colonne DB) et
   *  on bloque la publication d'un post strictement vide. Defense en profondeur
   *  alignee sur POST_LIMITS (memes bornes que le service createPost). */
  function validateStep3() {
    const e: Record<string, string> = {}
    if (form.title.trim().length > POST_LIMITS.TITLE_MAX)
      e.title = t('contribute.errors.titleTooLong', {
        max: POST_LIMITS.TITLE_MAX,
        defaultValue: `Le titre ne peut pas dépasser ${POST_LIMITS.TITLE_MAX} caractères.`,
      })
    if (form.description.length > POST_LIMITS.DESCRIPTION_MAX)
      e.description = t('contribute.errors.descriptionTooLong', {
        max: POST_LIMITS.DESCRIPTION_MAX,
      })

    // Post vide : au moins UN parmi { photo, espece IDENTIFIEE, titre, description }.
    // BUGFIX 2026-06-11 (Nicolas a pu publier "sans rien" en prod) : pour
    // atteindre l'etape 3 sans saisir d'espece, l'user clique "Je ne sais pas"
    // qui ajoute une observation `isUnknown`. On ne peut donc PAS compter
    // observations.length (toujours >= 1 ici) -> le check ne se declenchait
    // jamais. Une obs "inconnue" SANS photo ni texte n'a aucun contenu reel
    // (rien a identifier), donc on ne la compte pas. Une obs inconnue AVEC photo
    // reste valide via hasMedia. En EDITION on ne verifie pas (photos/especes en
    // DB, hors form.files -> faux positif).
    if (!isEditing) {
      const hasMedia = form.files.length > 0
      const hasIdentifiedSpecies = form.observations.some((o) => !o.isUnknown && o.species)
      const hasText = form.title.trim().length > 0 || form.description.trim().length > 0
      if (!hasMedia && !hasIdentifiedSpecies && !hasText)
        e.empty = t('contribute.errors.emptyPost', {
          defaultValue:
            'Ajoute au moins une photo, une espèce ou une description avant de publier.',
        })
    }
    return e
  }

  function handleNext(e?: React.MouseEvent | React.SyntheticEvent) {
    // Sécurité : si le bouton héritait par mégarde d'un type=submit (button
    // dans <form>), preventDefault empêche la soumission native du form.
    e?.preventDefault?.()
    setErrors({})
    setSubmitAttempted(false)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  /** Retour à l'étape précédente, ou ferme le panneau depuis l'étape 1 */
  function handleBack(e?: React.MouseEvent | React.SyntheticEvent) {
    e?.preventDefault?.()
    setErrors({})
    setSubmitAttempted(false)
    if (step === 1) {
      onClose()
      return
    }
    setStep((s) => s - 1)
  }

  async function handleSubmit(e: React.FormEvent | React.SyntheticEvent) {
    e.preventDefault()
    // Garde-fou : la soumission ne doit JAMAIS partir avant l'étape finale.
    // Si l'utilisateur appuie sur Entrée dans un input à l'étape 1 ou 2 (ce
    // qui déclencherait un submit natif HTML), on intercepte et on avance
    // simplement à l'étape suivante (second-agent/34).
    if (step < TOTAL_STEPS) {
      handleNext()
      return
    }
    // Le clic Publier a bien atteint le code : si ce breadcrumb manque dans une
    // session ou "le bouton ne fait rien", c'est que le clic n'arrive meme pas
    // au handler (piste DOM/state fige). Sinon, les trackFailure ci-dessous
    // disent OU ca bail (retour Nicolas 2026-07-30).
    trackAction('encounter.publish.click', { step, observations: form.observations.length })
    setSubmitAttempted(true)
    const errs = validateStep3()
    if (Object.keys(errs).length > 0) {
      // Bouton qui "ne fait rien" alors qu'il manque juste un champ : on le voit.
      trackFailure('encounter.publish', 'validation-etape3', { champs: Object.keys(errs) })
      setErrors(errs)
      return
    }
    if (!user?.id) {
      // LE bug "j'ai quitte l'app, je reviens, Publier est mort" : la session a
      // saute (user.id vide) et on bail ici, en silence, AVANT le hook. Trace +
      // video de session desormais.
      trackFailure('encounter.publish', 'session-perdue-composant')
      setErrors({
        description: t('contribute.errors.notAuthenticated', 'Connecte-toi pour publier'),
      })
      return
    }

    // Premier observation identifiée → champs species_* du post.
    const firstKnown = form.observations.find((o) => !o.isUnknown && o.species)

    // time-of-day : valeur saisie > fallback EXIF (ex : photo du matin).
    const timeOfDay = form.timeOfDay || form.photoMetadata.timeOfDay || undefined

    // Décompose le label « Ville, Département, Région » en composants distincts
    // pour persister `city` et `region` séparément (FeedPost lit `city`).
    const locSegments = form.locationName
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const cityFromInput = locSegments[0] || undefined
    const regionFromInput = locSegments[locSegments.length - 1] || undefined

    // Délégation au hook factorisé : gère watchdog, timeouts, compression,
    // strip EXIF, upload, rollback, invalidation feed. La proposition
    // d'identification collaborative est lancée dans onSuccess avec le
    // post.id retourné par le hook.
    await submit({
      payload: {
        type: 'nature_encounter',
        title: form.title.trim() || undefined,
        description: form.description.trim(),
        visibility: 'public',
        // V1.1.4 NG-027 round 12 : ancre midi UTC pour eviter le decalage -1
        // jour (colonne timestamptz, cf utils/observationDate).
        encounter_date: toStorageTimestamp(form.encounterDate),
        time_of_day: timeOfDay,
        weather: form.weather || undefined,
        habitat: form.habitat || undefined,
        location_name: form.locationName || undefined,
        city: cityFromInput,
        // Priorité à la région issue de l'autocomplete (info fiable) ;
        // fallback sur le dernier segment du libellé saisi en texte libre.
        region:
          form.locationRegion ??
          (regionFromInput && regionFromInput !== cityFromInput ? regionFromInput : undefined),
        latitude: form.locationLat ?? undefined,
        longitude: form.locationLng ?? undefined,
        country: form.locationCountry ?? undefined,
        location_hidden: form.locationHidden,
        species_name: firstKnown?.species?.commonName ?? undefined,
        scientific_name: firstKnown?.species?.scientificName ?? undefined,
        taxonomic_group: firstKnown?.species?.group ?? undefined,
        taxref_id: firstKnown?.species?.id ?? undefined,
        individuals_count: firstKnown?.count && firstKnown.count > 0 ? firstKnown.count : undefined,
        display_format: form.displayFormat,
      },
      files: form.files,
      editingPostId,
      onSuccess: async (post) => {
        // Aide à l'identification : crée une proposition vide pour signaler
        // que le post attend une identification collaborative.
        if (form.helpIdentification && !firstKnown && user?.id) {
          try {
            await createProposal(user.id, {
              post_id: post.id,
              species_name: '?',
              notes: "Aide à l'identification demandée par l'auteur",
            })
          } catch (err) {
            // Best-effort : l'utilisateur pourra renouveler la demande
            // depuis le post si la proposition n'a pas été créée.
            console.warn('[ContributeEncounterForm] createProposal failed:', err)
          }
        }

        // V1.2.0 (Nicolas 2026-06-09) : sauvegarde multi-especes DECOUPLEE.
        // Le post possede son PROPRE carnet publie dedie, alimente par
        // form.observations (= ce que l'user a valide, qu'il vienne d'une saisie
        // manuelle OU de l'import d'un carnet de travail via le bouton livre).
        // Les carnets de travail ne sont JAMAIS lies au post : leurs especes
        // sont copiees -> donnees independantes. Supprimer un carnet de travail
        // n'impacte donc jamais un post deja publie.
        //
        // Cas :
        //  - Edition d'un post deja multi-espece (editingNotebookId) -> resync
        //    en place de SON carnet dedie.
        //  - Nouveau post (ou mono->multi) avec > 1 espece -> creation d'un
        //    carnet publie dedie au post.
        //  - 1 seule espece -> post mono-espece classique (rien a faire).
        try {
          // NG (Nicolas 2026-06-11) : carnets masques en prod -> on ne cree
          // JAMAIS de carnet publie multi-especes. Le post reste mono-espece
          // (species_name = firstKnown, deja dans le payload). Reversible (flag).
          if (NOTEBOOKS_ENABLED && user?.id && supabase) {
            const knownEntries = form.observations.filter((o) => !o.isUnknown && o.species)
            const speciesPayload = knownEntries.map((entry) => {
              const sp = entry.species!
              return {
                taxref_id: sp.id,
                species_name: sp.commonName,
                scientific_name: sp.scientificName,
                vernacular_class: GROUP_TO_INAT_CLASS[sp.group] ?? null,
                individuals_count: entry.count > 0 ? entry.count : 1,
              }
            })
            const nbMeta = {
              title: form.title.trim() || null,
              location_name: form.locationName || null,
              city: cityFromInput ?? null,
              region:
                form.locationRegion ??
                (regionFromInput && regionFromInput !== cityFromInput ? regionFromInput : null),
              country: form.locationCountry ?? null,
              latitude: form.locationLat ?? null,
              longitude: form.locationLng ?? null,
            }

            if (editingNotebookId) {
              // Edition : on met a jour EN PLACE le carnet dedie du post.
              await publishExistingNotebookForPost(editingNotebookId, post.id, nbMeta)
              await replaceNotebookObservations(editingNotebookId, speciesPayload)
              await supabase
                .from('posts')
                .update({ notebook_id: editingNotebookId })
                .eq('id', post.id)
            } else if (knownEntries.length > 1) {
              // Nouveau post multi-especes -> carnet publie DEDIE au post (copie
              // independante des especes validees).
              const newNotebook = await createPublishedNotebookFromEncounter(
                user.id,
                { postId: post.id, started_at: new Date().toISOString(), ...nbMeta },
                speciesPayload,
              )
              await supabase.from('posts').update({ notebook_id: newNotebook.id }).eq('id', post.id)
            }
            // 1 seule espece -> mono-espece classique (rien a faire).
          }
        } catch (err) {
          // Best-effort : si le carnet echoue, le post est quand meme cree.
          // L user voit son post (mono-espece via firstKnown) sans la carte
          // carnet enrichie, ce qui est moins pire qu une publication ratee.
          console.warn('[ContributeEncounterForm] carnet save failed:', err)
        }

        // NG-004 : succes -> purge le brouillon (on a publie, plus besoin).
        clearDraft(DRAFT_KEY)
        // NG-038 : purge aussi les photos de brouillon (IndexedDB).
        void clearDraftPhotos(DRAFT_KEY)
        onClose()
      },
    })
  }

  // ── Titres par étape ─────────────────────────────────────────────────────

  const stepTitles: Record<number, string> = {
    1: t('contribute.panel.immortaliseEncounter'),
    2: t('contribute.panel.whatObserved'),
    3: t('contribute.panel.moreDetails'),
  }

  return (
    <>
      {/* ── Backdrop : clic ferme le panneau ────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:block hidden"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Panneau droit ──────────────────────────────────────────────────
          z-[60] sur mobile pour passer au-dessus de la MobileBottomNav (z-50)
          et garantir que les CTA "Suivant" / "Précédent" en bas du formulaire
          restent tactiles. Sur desktop la navbar bottom n'existe pas, comportement
          identique. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('contribute.encounterTitle')}
        className="fixed inset-y-0 right-0 z-[60] w-full md:w-[440px] bg-background flex flex-col shadow-2xl"
      >
        {/* ── Header sticky ──────────────────────────────────────────────────
            Figma : gap 12px entre la row top et la progress bar, padding 24/16px,
            badge teal pill ~134x32, titre étape Muli 16 foreground, bouton close
            rond 32px fond #F0F0F5, progress 3 segments h-1.5 rounded-full. */}
        <div className="shrink-0 pt-6 px-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {/* Badge type : pill teal avec label */}
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-teal-dark text-[var(--color-on-highlight)] text-sm leading-none">
              <span className="font-body">{t('contribute.encounterTitle')}</span>
            </span>

            {/* Étape X/N + bouton close */}
            <div className="flex items-center gap-4">
              <span
                className="font-body text-base text-foreground whitespace-nowrap"
                aria-live="polite"
              >
                {t('contribute.step', { current: step, total: TOTAL_STEPS })}
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                /* Rond neutre subtil. Token `bg-muted` (et non un hex en dur)
                   pour s'adapter au theme : en sombre, un #F0F0F5 fige laissait
                   un rond blanc avec un X invisible (retour Nicolas 2026-07-30). */
                className="size-8 shrink-0 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Barre de progression : 3 segments h-1.5 rounded-full, gap-1 (4px) */}
          <div
            className="flex gap-1"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={TOTAL_STEPS}
            aria-label={t('contribute.step', { current: step, total: TOTAL_STEPS })}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={[
                  'h-1.5 flex-1 rounded-full transition-colors duration-300',
                  step >= i ? 'bg-teal-dark' : 'bg-border',
                ].join(' ')}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* ── Contenu scrollable ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form
            id="encounter-panel-form"
            onSubmit={handleSubmit}
            noValidate
            className="px-5 pt-5 pb-4 flex flex-col gap-1"
          >
            {/* Titre de l'étape */}
            <h2 className="font-title font-bold text-lg text-foreground mb-1">
              {stepTitles[step]}
            </h2>

            {step === 1 && (
              <EncounterStep1
                files={form.files}
                onFilesChange={(f) => set('files', f)}
                displayFormat={form.displayFormat}
                onDisplayFormatChange={(f) => set('displayFormat', f)}
                onMetadataExtracted={(meta) => {
                  // Pré-remplit l'étape 3 avec les métadonnées EXIF, sans
                  // écraser une valeur déjà saisie manuellement par l'user.
                  setForm((prev) => ({
                    ...prev,
                    photoMetadata: meta,
                    encounterDate: meta.date ?? prev.encounterDate,
                    timeOfDay: prev.timeOfDay || meta.timeOfDay || '',
                  }))
                }}
                error={errors.files}
                // V1.1.4 NG-024 : photos existantes affichees aussi en step 1
                // pour permettre la suppression OU l ajout depuis l etape photos.
                existingMedia={isEditing ? existingMedia : undefined}
                onRemoveExistingMedia={async (mediaId, storagePath) => {
                  setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId))
                  try {
                    const { deletePostMedia } = await import('@/services/mediaService')
                    await deletePostMedia(mediaId, storagePath)
                  } catch (err) {
                    console.error('[ContributeEncounterForm] delete media failed:', err)
                  }
                }}
              />
            )}

            {step === 2 && (
              <EncounterStep2
                observations={form.observations}
                onAdd={handleAddObservation}
                onRemove={handleRemoveObservation}
                onCountChange={handleCountChange}
                helpIdentification={form.helpIdentification}
                onHelpIdentificationChange={(v) => set('helpIdentification', v)}
                notebooks={availableNotebooks}
                onPickNotebook={async (notebookId) => {
                  // V1.2.0 NG-005/006 (Nicolas 2026-06-08) : "ajouter un carnet
                  // existant" via le bouton livre. On charge ses observations et
                  // on les FUSIONNE (dedup par espece) avec les especes deja
                  // saisies -> l'user voit tout pour validation, sans rien faire
                  // d'autre. Memorise le carnet pour le lier au post a la
                  // publication (publishExistingNotebookForPost, inchange).
                  const full = await getNotebookWithObservations(notebookId)
                  if (!full) return
                  const entries: ObservationEntry[] = full.observations.map(
                    (obs: NotebookObservation) => ({
                      id: obs.id,
                      isUnknown: false,
                      count: obs.individuals_count,
                      // Marque l'origine carnet -> on pourra remplacer ces
                      // especes (et garder les ajouts manuels) au changement.
                      sourceNotebookId: notebookId,
                      species: {
                        id: obs.taxref_id,
                        commonName: obs.species_name,
                        scientificName: obs.scientific_name ?? '',
                        // best-effort : remap vernacular_class -> TaxonomicGroup
                        group: (() => {
                          const cls = obs.vernacular_class ?? ''
                          const map: Record<string, TaxonomicGroup> = {
                            Aves: 'birds',
                            Mammalia: 'mammals',
                            Insecta: 'insects',
                            Amphibia: 'amphibians',
                            Reptilia: 'reptiles',
                            Actinopterygii: 'fish',
                            Arachnida: 'arachnids',
                            Mollusca: 'mollusks',
                            Plantae: 'plants',
                          }
                          return map[cls] ?? ('other' as TaxonomicGroup)
                        })(),
                        rank: 'species',
                      },
                    }),
                  )
                  const nb = availableNotebooks.find((n) => n.id === notebookId)
                  // Decouplage (Nicolas 2026-06-09) : on NE lie PAS le carnet de
                  // travail au post. On COPIE seulement ses especes dans le
                  // formulaire -> a la publication elles deviennent les donnees
                  // independantes du post (carnet supprimable sans impact).
                  setForm((prev) => ({
                    ...prev,
                    // On retire les especes issues d'un carnet precedent et on
                    // garde les ajouts MANUELS (sans sourceNotebookId), puis on
                    // ajoute le carnet choisi. Changer de carnet remplace donc
                    // uniquement la partie carnet, jamais les ajouts manuels
                    // (Nicolas 2026-06-08 ; a l'user de les retirer s'il veut).
                    observations: [
                      ...prev.observations.filter((o) => !o.sourceNotebookId),
                      ...entries,
                    ],
                    title: prev.title.trim() ? prev.title : (nb?.title?.trim() ?? prev.title),
                    locationName: prev.locationName.trim()
                      ? prev.locationName
                      : (nb?.location_name ?? prev.locationName),
                    locationLat: prev.locationLat ?? nb?.latitude ?? null,
                    locationLng: prev.locationLng ?? nb?.longitude ?? null,
                    locationCountry: prev.locationCountry ?? nb?.country ?? null,
                    locationRegion: prev.locationRegion ?? nb?.region ?? null,
                  }))
                }}
              />
            )}

            {step === 3 && (
              <EncounterStep3
                submitAttempted={submitAttempted}
                title={form.title}
                onTitleChange={(v) => set('title', v)}
                description={form.description}
                onDescriptionChange={(v) => set('description', v)}
                errors={errors}
                encounterDate={form.encounterDate}
                onDateChange={(v) => set('encounterDate', v)}
                timeOfDay={form.timeOfDay}
                onTimeChange={(v) => set('timeOfDay', v)}
                weather={form.weather}
                onWeatherChange={(v) => set('weather', v)}
                habitat={form.habitat}
                onHabitatChange={(v) => set('habitat', v)}
                locationName={form.locationName}
                onLocationChange={(v) => set('locationName', v)}
                onLocationCoordsChange={(lat, lng, country, region) => {
                  setForm((prev) => ({
                    ...prev,
                    locationLat: lat,
                    locationLng: lng,
                    // Conserve le pays/région existants si le caller ne les
                    // précise pas (cas du reset coords).
                    locationCountry: country ?? prev.locationCountry,
                    locationRegion: region ?? prev.locationRegion,
                  }))
                }}
                locationHidden={form.locationHidden}
                onLocationHiddenChange={(v) => set('locationHidden', v)}
              />
            )}
          </form>
        </div>

        {/* Toast erreur upload (Figma node 6385:56334) : affiché au-dessus du
            footer quand l'upload échoue. Pas de toast de succès : la photo
            apparaît dans le feed → confirmation visuelle suffisante. */}
        {uploadError && (
          <div
            role="alert"
            aria-live="assertive"
            className="shrink-0 mx-5 mb-3 rounded-card bg-background border border-border shadow-md overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="size-10 shrink-0 rounded-full bg-[var(--color-error)]/15 text-[var(--color-error)] flex items-center justify-center">
                <ImageOff className="size-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {t('contribute.media.uploadErrorTitle', {
                    defaultValue: 'Erreur lors du chargement',
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{uploadError}</p>
              </div>
              <button
                type="button"
                onClick={clearError}
                aria-label={t('common.dismiss', { defaultValue: 'Fermer' })}
                className="size-8 shrink-0 rounded-full hover:bg-muted/50 flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            </div>
            {/* Barre rouge bas (status visuel) */}
            <div className="h-1 bg-[var(--color-error)]" />
          </div>
        )}

        {/* Toast progression upload (Figma node 6385:48726) : informe l'user
            sur connexion lente. Affiché uniquement durant le submit, masqué
            dès que la promesse upload résout. */}
        {uploadProgress && (
          <div
            role="status"
            aria-live="polite"
            className="shrink-0 mx-5 mb-3 rounded-card bg-background border border-border shadow-md overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4">
              <div className="size-10 shrink-0 rounded-full bg-primary-light/40 text-[var(--color-link)] flex items-center justify-center">
                <ImageUp className="size-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {t('contribute.media.uploadingTitle', {
                      defaultValue: 'Importation en cours !',
                    })}
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('contribute.media.uploadingHint', {
                    defaultValue: 'Nous importons tes photos. Cela peut prendre quelques secondes…',
                  })}
                </p>
              </div>
            </div>
            {/* Barre de progression : bleu primary, % à droite */}
            <div className="px-4 pb-3 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)} %
              </span>
            </div>
          </div>
        )}

        {/* ── Footer sticky ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border bg-background px-5 py-4 flex flex-col gap-2">
          {/* Erreur « post vide » (retour testeur 2026-06-11) : affichee apres
              une tentative de publication d'un post sans aucun contenu. */}
          {submitAttempted && errors.empty && (
            <p role="alert" className="text-xs text-[var(--color-error)] text-center">
              {errors.empty}
            </p>
          )}
          <div className="flex items-center gap-3">
            {/* Bouton retour : BATCH 99 : style btn-press-secondary (cohérence DS) */}
            <button
              type="button"
              onClick={handleBack}
              aria-label={step === 1 ? t('common.close') : t('common.back')}
              className="size-11 shrink-0 rounded-full btn-press btn-press-secondary bg-transparent flex items-center justify-center text-[var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>

            {/* CTA principal : composant Button DS (effet btn-press 3D).
                IMPORTANT (second-agent/34) :
                - TOUS les boutons sont type="button" (jamais "submit"). La
                  soumission ne passe PAS par le submit natif HTML : elle est
                  déclenchée par onClick → handleSubmit, ce qui élimine le risque
                  d'auto-soumission lors de la transition step 2 → step 3
                  (React réutilisait le même <button> DOM en changeant le type).
                - Une `key` distincte force React à démonter / remonter le bouton
                  entre les étapes pour éviter toute réutilisation d'instance. */}
            {step < TOTAL_STEPS ? (
              step === 2 && form.observations.length === 0 ? (
                <Button
                  key="cta-dontknow"
                  type="button"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={(e) => {
                    e.preventDefault()
                    handleAddObservation({
                      id: `obs-unknown-${Date.now()}`,
                      species: null,
                      isUnknown: true,
                      count: 1,
                    })
                    handleNext()
                  }}
                >
                  {t('contribute.panel.dontKnow')}
                </Button>
              ) : (
                <Button
                  key="cta-next"
                  type="button"
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={handleNext}
                >
                  {t('common.next')}
                </Button>
              )
            ) : (
              <Button
                key="cta-publish"
                type="button"
                variant="primary"
                size="md"
                className="flex-1"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                onClick={(e) => {
                  // Soumission programmatique via React (pas de form natif HTML)
                  // : handleSubmit accepte un FormEvent-like mais on lui passe
                  // une SyntheticEvent qui supporte preventDefault.
                  handleSubmit(e as unknown as React.FormEvent)
                }}
              >
                {/* BATCH 9 / T-023 : spinner pendant upload + soumission.
                    Icone motion-safe (respecte prefers-reduced-motion). */}
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="size-4 motion-safe:animate-spin"
                      aria-hidden="true"
                      strokeWidth={2.5}
                    />
                    {t('common.loading')}
                  </span>
                ) : isEditing ? (
                  t('contribute.panel.updateBtn', { defaultValue: 'Mettre à jour' })
                ) : (
                  t('contribute.panel.publishBtn')
                )}
              </Button>
            )}
          </div>

          {/* Lien "continuer sans photo" : étape 1 uniquement */}
          {step === 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors focus-visible:outline-none focus-visible:underline"
            >
              {t('contribute.panel.skipPhotos')}
            </button>
          )}

          {/* Attribution sources données en pied de page (étape 2 uniquement).
              V1.1.0 (Nicolas 2026-05-26) : ajout iNaturalist en source principale
              (CC-BY 4.0) + GBIF (CC0) + Wikidata (CC0). */}
          {step === 2 && (
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              {t('contribute.species.dataCredit', {
                defaultValue: 'Données espèces : iNaturalist (CC-BY) + GBIF + Wikidata',
              })}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
