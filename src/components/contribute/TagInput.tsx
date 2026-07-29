/**
 * TagInput : Saisie de tags libres avec chips supprimables
 *
 * Comportement :
 *   - Entrée ou virgule ajoute le tag (trim + lowercase, pas de doublon)
 *   - Backspace sur champ vide supprime le dernier tag
 *   - Bouton × sur chaque chip pour suppression individuelle
 *   - Limite configurable via maxTags (défaut : 10)
 */

import { useState, useId } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  maxTags?: number
}

/** Longueur max d'un tag : protège contre les tags excessivement longs en base */
const MAX_TAG_LENGTH = 32

/**
 * Sanitise et valide un tag avant ajout.
 * Règles :
 *   - Trim + lowercase
 *   - Suppression des virgules
 *   - Uniquement lettres, chiffres, tirets, underscores (évite XSS et injections)
 *   - Longueur max 32 caractères
 */
function sanitizeTag(raw: string): string | null {
  const tag = raw.trim().toLowerCase().replace(/,/g, '')
  if (!tag) return null
  // Retirer les caractères non autorisés (lettres Unicode incluses pour accents)
  const cleaned = tag.replace(/[^\p{L}\p{N}_-]/gu, '')
  if (!cleaned || cleaned.length > MAX_TAG_LENGTH) return null
  return cleaned
}

export function TagInput({ tags, onTagsChange, maxTags = 10 }: TagInputProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const tag = sanitizeTag(raw)
    if (!tag || tags.includes(tag) || tags.length >= maxTags) return
    onTagsChange([...tags, tag])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      // Supprimer le dernier tag si le champ est vide
      onTagsChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        {t('contribute.tags.label')}
      </label>

      {/* Conteneur unifié : chips + input dans le même "champ" */}
      <div className="min-h-[48px] flex flex-wrap gap-2 items-center px-3 py-2 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-light text-[var(--color-link)] text-xs font-medium"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
              aria-label={t('contribute.tags.remove', { tag })}
              className="size-4 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <X className="size-2.5" aria-hidden="true" />
            </button>
          </span>
        ))}

        {tags.length < maxTags && (
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(input)}
            placeholder={tags.length === 0 ? t('contribute.tags.placeholder') : ''}
            className="flex-1 min-w-[140px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        )}
      </div>
    </div>
  )
}
