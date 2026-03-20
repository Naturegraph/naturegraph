import type { HTMLAttributes } from "react";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  label?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
};

function Spinner({ size = "md", label = "Chargement", className = "", ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
      {...props}
    >
      <div
        className={`${sizeClasses[size]} border-[var(--color-action-default)] border-t-transparent rounded-full animate-spin`}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { Spinner };
export type { SpinnerProps };
