import { type ElementType, type HTMLAttributes } from "react";

type HeadingLevel = "display" | "h1" | "h2" | "h3" | "h4";
type HeadingColor = "primary" | "secondary" | "inverse" | "inherit";

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  as?: ElementType;
  color?: HeadingColor;
}

const levelClasses: Record<HeadingLevel, string> = {
  display: "text-4xl md:text-5xl lg:text-6xl font-bold leading-tight",
  h1: "text-3xl md:text-4xl font-bold leading-tight",
  h2: "text-2xl md:text-3xl font-bold leading-tight",
  h3: "text-xl md:text-2xl font-semibold leading-snug",
  h4: "text-lg md:text-xl font-semibold leading-normal",
};

const defaultTags: Record<HeadingLevel, ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
};

const colorClasses: Record<HeadingColor, string> = {
  primary: "text-[var(--color-text-primary)]",
  secondary: "text-[var(--color-text-secondary)]",
  inverse: "text-[var(--color-text-inverse)]",
  inherit: "text-inherit",
};

function Heading({
  level = "h2",
  as,
  color = "primary",
  className = "",
  children,
  ...props
}: HeadingProps) {
  const Component = as || defaultTags[level];

  return (
    <Component
      className={`font-[family-name:var(--font-title)] ${levelClasses[level]} ${colorClasses[color]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export { Heading };
export type { HeadingProps };
