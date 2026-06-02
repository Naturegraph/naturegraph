/**
 * NotebookPublishDialog, V1.2.0 Phase 4 (NG-005/006)
 *
 * Dialog de publication du carnet actif. Recap + confirmation, puis :
 *   1. Crée 1 post (type='nature_encounter') avec notebook_id = carnet.id
 *      - species_name / scientific_name / taxref_id = espece principale
 *        (celle avec le plus d individus, fallback la premiere)
 *      - description auto si non fournie : "Sortie nature de N especes"
 *   2. Update carnet : status='published' + post_id = newPost.id
 *   3. Invalide les caches feed + redirige vers la page du post
 *
 * Version MVP V1.2.0 : pas de photos ni location avancee dans ce dialog.
 * Les enrichissements (photos, location_lat/lng precis, weather, habitat)
 * peuvent etre ajoutes via l edition du post apres publication (NG-002).
 */

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Send, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotebook } from '@/contexts/NotebookContext'
import { createPost } from '@/services/postService'
import { updateNotebook } from '@/services/notebookService'
import { useToast } from '@/contexts/ToastContext'
import { NotebookSpeciesList } from './NotebookSpeciesList'

interface NotebookPublishDialogProps {
  onClose: () => void
  onPublished?: (postId: string) => void | Promise<void>
}

export function NotebookPublishDialog({ onClose, onPublished }: NotebookPublishDialogProps) {
  const { user } = useAuth()
  const { activeNotebook, refresh } = useNotebook()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [title, setTitle] = useState(activeNotebook?.title ?? '')
  const [description, setDescription] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Espece principale = celle avec le + d individus (sinon premiere)
  const primarySpecies = useMemo(() => {
    if (!activeNotebook || activeNotebook.observations.length === 0) return null
    return [...activeNotebook.observations].sort(
      (a, b) => b.individuals_count - a.individuals_count,
    )[0]
  }, [activeNotebook])

  if (!activeNotebook) return null

  const totalIndividuals = activeNotebook.observations_count
  const totalSpecies = activeNotebook.species_count

  async function handlePublish() {
    if (!user?.id || !activeNotebook || !primarySpecies) return
    setError(null)
    setIsPublishing(true)
    try {
      const autoDescription =
        description.trim() ||
        `Sortie nature : ${totalSpecies} espèce${totalSpecies > 1 ? 's' : ''} observée${
          totalSpecies > 1 ? 's' : ''
        }, ${totalIndividuals} individu${totalIndividuals > 1 ? 's' : ''} au total.`

      // 1. Create post avec lien vers le carnet via notebook_id
      const post = await createPost(user.id, {
        type: 'nature_encounter',
        title: title.trim() || undefined,
        description: autoDescription,
        visibility: 'public',
        encounter_date: activeNotebook.started_at ?? new Date().toISOString(),
        location_name: activeNotebook.location_name ?? undefined,
        city: activeNotebook.city ?? undefined,
        region: activeNotebook.region ?? undefined,
        country: activeNotebook.country ?? undefined,
        latitude: activeNotebook.latitude ?? undefined,
        longitude: activeNotebook.longitude ?? undefined,
        species_name: primarySpecies.species_name,
        scientific_name: primarySpecies.scientific_name ?? undefined,
        taxref_id: primarySpecies.taxref_id,
        individuals_count: primarySpecies.individuals_count,
      })

      // 2. Patcher notebook_id sur le post + status carnet
      // Note : on fait cela en 2 etapes car createPost n accepte pas notebook_id
      // dans son payload (champ V1.2.0 absent de CreatePostPayload). On passe
      // par un UPDATE direct, RLS autorise (owner du post).
      const { supabase } = await import('@/lib/supabase')
      if (supabase) {
        const { error: linkErr } = await supabase
          .from('posts')
          .update({ notebook_id: activeNotebook.id })
          .eq('id', post.id)
        if (linkErr) throw new Error(linkErr.message)
      }

      // 3. Marquer le carnet comme publie + lien post
      await updateNotebook(activeNotebook.id, {
        status: 'published',
        post_id: post.id,
        title: title.trim() || activeNotebook.title || null,
        finished_at: new Date().toISOString(),
      })

      // 4. Refresh context (le carnet n est plus actif)
      await refresh()

      // 5. Invalide cache feed + profile pour rafraichir les vues
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-posts'] }),
      ])

      showToast({
        message: 'Carnet publié dans le feed',
        variant: 'success',
      })
      if (onPublished) await onPublished(post.id)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      showToast({ message: `Erreur publication : ${msg}`, variant: 'error' })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={isPublishing ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Publier le carnet"
        className="fixed inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[8vh] sm:top-[12vh] bottom-2 sm:bottom-auto sm:max-h-[80vh] z-[80] w-auto sm:w-[440px] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-title font-bold text-lg">Publier le carnet</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            aria-label="Fermer"
            className="size-9 rounded-full flex items-center justify-center hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {/* Recap */}
          <div className="text-sm text-muted-foreground">
            Ton carnet sera publié sous forme d&apos;un post enrichi avec la liste catégorisée de
            tes {totalSpecies} espèce{totalSpecies > 1 ? 's' : ''}.
          </div>

          {/* Titre */}
          <div className="flex flex-col gap-1">
            <label htmlFor="publish-title" className="text-sm font-medium">
              Titre <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <input
              id="publish-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex : Rencontre matinale en forêt"
              disabled={isPublishing}
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label htmlFor="publish-desc" className="text-sm font-medium">
              Description <span className="text-muted-foreground font-normal">(optionnel)</span>
            </label>
            <textarea
              id="publish-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Raconte ta sortie en quelques mots…"
              rows={3}
              disabled={isPublishing}
              className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Si vide, une description sera générée automatiquement.
            </p>
          </div>

          {/* Recap liste espece */}
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="font-title font-bold text-base">Espèces ({totalSpecies})</h3>
            <NotebookSpeciesList observations={activeNotebook.observations} compact />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <footer className="border-t border-border px-5 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="flex-1 h-11 rounded-full border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || !primarySpecies}
            className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Publier
          </button>
        </footer>
      </div>
    </>
  )
}
