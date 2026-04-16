/**
 * CityAutocomplete — Saisie ville avec autocomplete ARIA
 * =======================================================
 * Pattern ARIA combobox (WAI-ARIA 1.2) :
 *   - role="combobox" sur l'input
 *   - role="listbox" sur la liste de suggestions
 *   - role="option" sur chaque suggestion
 *   - aria-expanded, aria-activedescendant, aria-controls
 *
 * Navigation clavier :
 *   ↓ / ↑  → parcourir les suggestions
 *   Enter   → sélectionner la suggestion active
 *   Escape  → fermer la liste
 *   Tab     → fermer et déplacer le focus
 *
 * Accessibilité :
 *   - Contraste ≥ 4.5:1 sur toutes les variantes (texte)
 *   - focus-visible ring sur l'input et les options
 *   - aria-busy pendant le chargement
 *   - prefers-reduced-motion respecté (pas d'animation de liste)
 */

import { useState, useRef, useId, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, MapPin, Loader2, X } from 'lucide-react'
import { useLocationAutocomplete } from '@/hooks/useLocationAutocomplete'
import type { CityResult } from '@/types/location'

// ─── Types ────────────────────────────────────────────────────

interface CityAutocompleteProps {
  /** Ville actuellement sélectionnée */
  value: CityResult | null
  /** Callback quand l'utilisateur sélectionne une ville */
  onChange: (city: CityResult | null) => void
  /** Désactive le composant */
  disabled?: boolean
  /** ID HTML de l'input (pour <label htmlFor>) */
  id?: string
  /** Placeholder de l'input */
  placeholder?: string
}

// ─── Composant ───────────────────────────────────────────────

export function CityAutocomplete({
  value,
  onChange,
  disabled = false,
  id,
  placeholder,
}: CityAutocompleteProps) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState(value?.name ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // ID unique pour aria-controls / aria-activedescendant
  const listId = useId()
  const optionId = (i: number) => `${listId}-option-${i}`

  const { suggestions, isLoading } = useLocationAutocomplete(
    // Ne pas rechercher si l'utilisateur a déjà sélectionné (label figé)
    value ? '' : inputValue,
  )

  // ─── Sélection d'une ville ─────────────────────────────────

  const selectCity = useCallback(
    (city: CityResult) => {
      onChange(city)
      setInputValue(city.name)
      setIsOpen(false)
      setActiveIndex(-1)
      inputRef.current?.blur()
    },
    [onChange],
  )

  // ─── Effacer la sélection ─────────────────────────────────

  const clearSelection = useCallback(() => {
    onChange(null)
    setInputValue('')
    setIsOpen(false)
    setActiveIndex(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [onChange])

  // ─── Handlers clavier ─────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true)
        setActiveIndex(0)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectCity(suggestions[activeIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIndex(-1)
        break
      case 'Tab':
        setIsOpen(false)
        setActiveIndex(-1)
        break
    }
  }

  // ─── Handler input ────────────────────────────────────────

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    // Si l'utilisateur retape après une sélection → reset la sélection
    if (value) onChange(null)
    setIsOpen(val.trim().length >= 2)
    setActiveIndex(-1)
  }

  // ─── Affichage département (disambiguïté homonymes) ───────

  function cityOptionLabel(city: CityResult): string {
    // Si plusieurs résultats ont le même nom → afficher le département
    const hasDuplicate = suggestions.filter((s) => s.name === city.name).length > 1
    if (hasDuplicate) {
      return `${city.name} (${city.departmentCode})`
    }
    return city.name
  }

  // ─── Render ───────────────────────────────────────────────

  const showList = isOpen && suggestions.length > 0 && !value

  return (
    <div className="relative w-full">
      {/* Input combobox */}
      <div
        className={[
          'flex items-center gap-3 h-12 px-4 rounded-lg border transition-all',
          'bg-[var(--color-bg-secondary)]',
          disabled
            ? 'opacity-50 cursor-not-allowed border-[var(--color-border)]'
            : 'border-[var(--color-border)] focus-within:border-[var(--color-action-default)] focus-within:ring-2 focus-within:ring-[var(--color-action-default)] focus-within:ring-offset-1',
          value ? 'border-[var(--color-action-default)] bg-[var(--color-action-light)]' : '',
        ].join(' ')}
      >
        {/* Icône gauche : MapPin si sélectionné, Search sinon */}
        {value ? (
          <MapPin
            size={16}
            className="shrink-0 text-[var(--color-action-default)]"
            aria-hidden="true"
          />
        ) : isLoading ? (
          <Loader2
            size={16}
            className="shrink-0 text-[var(--color-text-secondary)] animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <Search
            size={16}
            className="shrink-0 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
        )}

        {/* Input ARIA combobox */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-busy={isLoading}
          aria-label={t('location.autocomplete.ariaLabel')}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!value && inputValue.trim().length >= 2) setIsOpen(true)
          }}
          onBlur={() => {
            // Délai pour laisser le click sur une option s'enregistrer
            setTimeout(() => setIsOpen(false), 150)
          }}
          disabled={disabled}
          placeholder={placeholder ?? t('location.autocomplete.placeholder')}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent focus:outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] text-sm disabled:cursor-not-allowed"
        />

        {/* Bouton effacer — visible uniquement si sélection active */}
        {value && (
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            aria-label={t('location.autocomplete.clear')}
            className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Sous-label : ville sélectionnée avec région + département */}
      {value && (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]" aria-live="polite">
          {value.regionName}
          {value.departmentName && value.departmentName !== value.regionName
            ? ` · ${value.departmentName} (${value.departmentCode})`
            : ''}
        </p>
      )}

      {/* Liste de suggestions */}
      {showList && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t('location.autocomplete.listLabel')}
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-lg overflow-hidden"
        >
          {suggestions.map((city, i) => (
            <li
              key={city.inseeCode}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                // Empêche le blur de l'input avant le click
                e.preventDefault()
                selectCity(city)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={[
                'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors text-sm',
                i === activeIndex
                  ? 'bg-[var(--color-action-light)] text-[var(--color-action-default)]'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]',
              ].join(' ')}
            >
              <MapPin
                size={14}
                className="shrink-0 mt-0.5 text-[var(--color-text-tertiary)]"
                aria-hidden="true"
              />
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{cityOptionLabel(city)}</span>
                <span className="text-xs text-[var(--color-text-secondary)] truncate">
                  {city.regionName}
                  {city.departmentCode ? ` · ${city.departmentCode}` : ''}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
