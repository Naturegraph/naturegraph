import type { HTMLAttributes } from "react";

type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  padding?: boolean;
}

const sizeClasses: Record<ContainerSize, string> = {
  sm: "max-w-2xl",     // 672px
  md: "max-w-4xl",     // 896px
  lg: "max-w-6xl",     // 1152px
  xl: "max-w-7xl",     // 1280px
  full: "max-w-full",
};

function Container({
  size = "xl",
  padding = true,
  className = "",
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={`w-full mx-auto ${sizeClasses[size]} ${padding ? "px-5 md:px-10 lg:px-20" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export { Container };
export type { ContainerProps };
