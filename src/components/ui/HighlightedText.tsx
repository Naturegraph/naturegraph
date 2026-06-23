/**
 * HighlightedText : Affiche du texte multi-ligne avec surlignage des marqueurs
 *
 * BATCH 68 (Nicolas decision 2026-05-15) : utilise sur Privacy et Legal pour
 * faire ressortir visuellement les sections juridiques a completer
 * (SIRET, adresse postale, etc.) tant que la structure n'est pas immatriculee.
 *
 * Pattern detecte (sensible a la casse) :
 *   [À COMPLÉTER ...] ou [TO BE COMPLETED ...]
 *   -> rendu avec un highlight jaune semi-transparent
 *
 * Whitespace : preserve les sauts de ligne via white-space: pre-line.
 *
 * A11Y : marqueur ajoute en aria-label pour les lecteurs d'ecran.
 */

interface HighlightedTextProps {
  /** Texte brut (potentiellement multi-ligne) */
  text: string
  /** Classe additionnelle a appliquer au paragraphe parent */
  className?: string
}

// Pattern split : capture les blocs [À COMPLÉTER ...] ou [TO BE COMPLETED ...]
// Flag `g` pour split avec capture, regex stateless (creee a chaque appel pour
// eviter toute mutation de lastIndex que ESLint refuse en composant React).
const TODO_PATTERN = '\\[(?:À COMPLÉTER|TO BE COMPLETED)[^\\]]*\\]'

/** Detecte si une chaine est un marqueur "[À COMPLÉTER ...]" */
function isTodoMarker(value: string): boolean {
  return new RegExp(`^${TODO_PATTERN}$`).test(value)
}

export function HighlightedText({ text, className = '' }: HighlightedTextProps) {
  // Split sur les marqueurs en gardant les delimiters (groupe capturant).
  // Regex creee localement pour eviter les warnings ESLint sur l'etat partage.
  const parts = text.split(new RegExp(`(${TODO_PATTERN})`, 'g'))

  return (
    <p
      className={`text-base text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line ${className}`}
    >
      {parts.map((part, i) => {
        if (isTodoMarker(part)) {
          return (
            <mark
              key={i}
              aria-label="Information à compléter"
              className="bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded font-medium not-italic"
            >
              {part}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}
