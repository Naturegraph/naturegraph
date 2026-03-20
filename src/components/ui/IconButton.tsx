import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type IconButtonVariant = "default" | "ghost" | "outline";
type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  "aria-label": string;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default: "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]",
  ghost: "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
  outline: "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "w-8 h-8 [&>svg]:w-4 [&>svg]:h-4",
  md: "w-10 h-10 [&>svg]:w-5 [&>svg]:h-5",
  lg: "w-12 h-12 [&>svg]:w-6 [&>svg]:h-6",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant = "ghost", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`inline-flex items-center justify-center rounded-lg transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action-default)] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";
export { IconButton };
export type { IconButtonProps };
