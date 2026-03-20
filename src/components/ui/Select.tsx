import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  selectSize?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, selectSize = "md", className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={error || undefined}
        className={`w-full bg-[var(--color-surface)] border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-action-default)] focus:border-transparent appearance-none bg-no-repeat bg-[length:16px] bg-[position:right_12px_center] ${
          error
            ? "border-[var(--color-error)]"
            : "border-[var(--color-border)]"
        } ${sizeClasses[selectSize]} ${className}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237E7E8F' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
);

Select.displayName = "Select";
export { Select };
export type { SelectProps, SelectOption };
