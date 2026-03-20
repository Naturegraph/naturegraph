import { type ElementType, type HTMLAttributes } from "react";

type StackDirection = "vertical" | "horizontal";
type StackGap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
type StackJustify = "start" | "center" | "end" | "between" | "around";

interface StackProps extends HTMLAttributes<HTMLElement> {
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  as?: ElementType;
}

const gapClasses: Record<StackGap, string> = {
  none: "gap-0",
  xs: "gap-1",     // 4px
  sm: "gap-2",     // 8px
  md: "gap-4",     // 16px
  lg: "gap-6",     // 24px
  xl: "gap-8",     // 32px
  "2xl": "gap-12", // 48px
};

const alignClasses: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyClasses: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

function Stack({
  direction = "vertical",
  gap = "md",
  align = "stretch",
  justify = "start",
  wrap = false,
  as: Component = "div",
  className = "",
  children,
  ...props
}: StackProps) {
  const dirClass = direction === "horizontal" ? "flex-row" : "flex-col";
  const wrapClass = wrap ? "flex-wrap" : "";

  return (
    <Component
      className={`flex ${dirClass} ${gapClasses[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${wrapClass} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export { Stack };
export type { StackProps };
