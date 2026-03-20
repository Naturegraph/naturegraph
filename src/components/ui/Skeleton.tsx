import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
}

function Skeleton({
  variant = "text",
  width,
  height,
  className = "",
  ...props
}: SkeletonProps) {
  const baseClass = "animate-pulse bg-[var(--color-bg-tertiary)]";

  const variantClass =
    variant === "circular"
      ? "rounded-full"
      : variant === "rectangular"
        ? "rounded-lg"
        : "rounded h-4 w-full";

  return (
    <div
      className={`${baseClass} ${variantClass} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
      {...props}
    />
  );
}

function SkeletonGroup({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-busy="true" aria-label="Chargement">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonGroup };
export type { SkeletonProps };
