import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  resize?: "none" | "vertical" | "both";
}

const resizeClasses = {
  none: "resize-none",
  vertical: "resize-y",
  both: "resize",
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, resize = "vertical", className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={error || undefined}
        className={`w-full px-3 py-2 text-sm bg-[var(--color-surface)] border rounded-lg transition-colors duration-200 placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-action-default)] focus:border-transparent min-h-[80px] ${
          error
            ? "border-[var(--color-error)]"
            : "border-[var(--color-border)]"
        } ${resizeClasses[resize]} ${className}`}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
export { Textarea };
export type { TextareaProps };
