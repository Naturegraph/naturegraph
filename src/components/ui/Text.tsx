import { type ElementType, type HTMLAttributes } from "react";

type TextSize = "xs" | "sm" | "md" | "lg";
type TextWeight = "regular" | "medium" | "semibold" | "bold";
type TextColor = "primary" | "secondary" | "tertiary" | "disabled" | "inverse" | "error" | "success" | "inherit";

interface TextProps extends HTMLAttributes<HTMLElement> {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  as?: ElementType;
  truncate?: boolean | number;
}

const sizeClasses: Record<TextSize, string> = {
  xs: "text-xs",    // 12px
  sm: "text-sm",    // 14px
  md: "text-base",  // 16px
  lg: "text-lg",    // 18px
};

const weightClasses: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const colorClasses: Record<TextColor, string> = {
  primary: "text-[var(--color-text-primary)]",
  secondary: "text-[var(--color-text-secondary)]",
  tertiary: "text-[var(--color-text-tertiary)]",
  disabled: "text-[var(--color-text-disabled)]",
  inverse: "text-[var(--color-text-inverse)]",
  error: "text-[var(--color-error)]",
  success: "text-[var(--color-success)]",
  inherit: "text-inherit",
};

function Text({
  size = "md",
  weight = "regular",
  color = "primary",
  as: Component = "p",
  truncate,
  className = "",
  children,
  ...props
}: TextProps) {
  const truncateClass =
    truncate === true
      ? "truncate"
      : typeof truncate === "number"
        ? `line-clamp-${truncate}`
        : "";

  return (
    <Component
      className={`font-[var(--font-body)] ${sizeClasses[size]} ${weightClasses[weight]} ${colorClasses[color]} ${truncateClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export { Text };
export type { TextProps };
