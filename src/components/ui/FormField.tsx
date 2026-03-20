import type { HTMLAttributes, ReactNode } from "react";

interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  className = "",
  children,
  ...props
}: FormFieldProps) {
  const fieldId = htmlFor || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} {...props}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          {label}
          {required && (
            <span className="text-[var(--color-error)] ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p
          id={fieldId ? `${fieldId}-hint` : undefined}
          className="text-xs text-[var(--color-text-tertiary)]"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={fieldId ? `${fieldId}-error` : undefined}
          role="alert"
          className="text-xs text-[var(--color-error)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
