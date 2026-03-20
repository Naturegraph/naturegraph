import { forwardRef, type InputHTMLAttributes } from "react";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, id, checked, className = "", ...props }, ref) => {
    const switchId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <label
        htmlFor={switchId}
        className={`flex items-center justify-between gap-3 cursor-pointer group ${className}`}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {label}
          </span>
          {description && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
              {description}
            </span>
          )}
        </span>
        <span className="relative inline-flex shrink-0">
          <input
            ref={ref}
            id={switchId}
            type="checkbox"
            role="switch"
            aria-checked={checked}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <span
            className="w-10 h-6 rounded-full border-2 border-transparent transition-colors duration-200 bg-[var(--color-border)] peer-checked:bg-[var(--color-action-default)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-action-default)] peer-focus-visible:ring-offset-2"
            aria-hidden="true"
          />
          <span
            className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-4"
            aria-hidden="true"
          />
        </span>
      </label>
    );
  },
);

Switch.displayName = "Switch";
export { Switch };
export type { SwitchProps };
