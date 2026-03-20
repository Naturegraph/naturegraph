import { type HTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
  onDismiss?: () => void;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]",
  success: "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]",
  error: "bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error)]",
};

const defaultIcons: Record<AlertVariant, ReactNode> = {
  info: <Info className="w-5 h-5 shrink-0" />,
  success: <CheckCircle className="w-5 h-5 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 shrink-0" />,
};

function Alert({
  variant = "info",
  title,
  icon,
  onDismiss,
  className = "",
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex gap-3 p-4 rounded-lg border ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <span aria-hidden="true">{icon || defaultIcons[variant]}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-1">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export { Alert };
export type { AlertProps };
