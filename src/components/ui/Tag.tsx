import type { HTMLAttributes, ReactNode } from "react";

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  onRemove?: () => void;
  selected?: boolean;
  interactive?: boolean;
}

function Tag({
  icon,
  onRemove,
  selected,
  interactive,
  className = "",
  children,
  ...props
}: TagProps) {
  const baseClass = "inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full border transition-colors";

  const stateClass = selected
    ? "bg-[var(--color-action-default)] text-white border-[var(--color-action-default)]"
    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]";

  const interactiveClass = interactive && !selected
    ? "cursor-pointer hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
    : interactive && selected
      ? "cursor-pointer hover:opacity-90"
      : "";

  return (
    <span
      className={`${baseClass} ${stateClass} ${interactiveClass} ${className}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {icon && <span className="shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5" aria-hidden="true">{icon}</span>}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 ml-0.5 hover:opacity-70 transition-opacity"
          aria-label="Retirer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l6 6M10 4l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}

export { Tag };
export type { TagProps };
