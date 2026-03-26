/**
 * AuthInput — Champ de formulaire pour les pages d'authentification
 * Affiche un label, un input, un texte d'aide et un message d'erreur.
 */

interface AuthInputProps {
  label: string
  helperText?: string
  isRequired?: boolean
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  id?: string
}

export function AuthInput({
  label,
  helperText,
  isRequired,
  type = 'text',
  value,
  onChange,
  error,
  disabled,
  placeholder,
  autoComplete,
  inputMode,
  id,
}: AuthInputProps) {
  const inputId = id ?? `auth-input-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label */}
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-[var(--color-text-primary)] leading-none"
      >
        {label}
        {isRequired && (
          <span className="text-[var(--color-error)] ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Input */}
      <input
        id={inputId}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={isRequired}
        className={`h-12 w-full rounded-button border-[0.5px] px-6 text-base bg-off-white text-foreground placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-[var(--color-error)]' : 'border-border'
        }`}
      />

      {/* Helper text */}
      {helperText && !error && (
        <p className="text-xs italic text-[var(--color-text-tertiary)] leading-tight">
          {helperText}
        </p>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs text-[var(--color-error)] leading-tight">
          {error}
        </p>
      )}
    </div>
  )
}
