import { forwardRef, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, id, className = "", ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <label
        htmlFor={checkboxId}
        className={`flex items-start gap-3 cursor-pointer group ${className}`}
      >
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className="mt-0.5 w-4 h-4 shrink-0 rounded border-[var(--color-border)] text-[var(--color-action-default)] focus:ring-2 focus:ring-[var(--color-action-default)] focus:ring-offset-0 cursor-pointer accent-[var(--color-action-default)]"
          {...props}
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-text-secondary)]">
            {label}
          </span>
          {description && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {description}
            </span>
          )}
        </span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
export { Checkbox };
export type { CheckboxProps };
