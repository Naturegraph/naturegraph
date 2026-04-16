/**
 * TaxrefCredit — Attribution légale TAXREF / INPN obligatoire
 * ============================================================
 * Mention CC-BY à afficher partout où des données TAXREF apparaissent :
 *   - SpeciesSearch (contribution)
 *   - SearchPanel (résultats espèces)
 *   - Fiche espèce (Phase 2)
 *
 * Conformément à la licence CC-BY INPN et aux règles CLAUDE.md.
 *
 * @see https://inpn.mnhn.fr/telechargement/cadreReglementaire/referentielEspece/TAXREF
 */

interface TaxrefCreditProps {
  /** Variante compacte (une ligne, sans lien explicite) — pour les champs de saisie */
  compact?: boolean
  /** Classe CSS additionnelle */
  className?: string
}

/**
 * TaxrefCredit — Badge d'attribution CC-BY INPN.
 *
 * @example
 * // Dans SpeciesSearch :
 * <TaxrefCredit compact />
 *
 * // Dans une fiche espèce :
 * <TaxrefCredit />
 */
export function TaxrefCredit({ compact = false, className = '' }: TaxrefCreditProps) {
  if (compact) {
    return (
      <p className={`text-[10px] text-muted-foreground leading-tight ${className}`}>
        Données{' '}
        <a
          href="https://inpn.mnhn.fr/telechargement/cadreReglementaire/referentielEspece/TAXREF"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
        >
          TAXREF — INPN
        </a>{' '}
        · Licence CC-BY
      </p>
    )
  }

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="note"
      aria-label="Source des données espèces"
    >
      {/* Icône CC-BY en SVG inline (pas de dépendance externe) */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-muted-foreground"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 9.5C10 8.12 11.12 7 12.5 7C13.88 7 15 8.12 15 9.5M9 14.5C9 12.57 10.57 11 12.5 11C14.43 11 16 12.57 16 14.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-[11px] text-muted-foreground leading-tight">
        Données espèces :{' '}
        <a
          href="https://inpn.mnhn.fr/telechargement/cadreReglementaire/referentielEspece/TAXREF"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
        >
          TAXREF (INPN)
        </a>{' '}
        — Licence CC-BY · Inventaire National du Patrimoine Naturel
      </p>
    </div>
  )
}
