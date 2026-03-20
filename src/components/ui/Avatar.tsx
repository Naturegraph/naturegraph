import type { ImgHTMLAttributes } from "react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "size"> {
  size?: AvatarSize;
  fallback?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

function Avatar({ size = "md", src, alt, fallback, className = "", ...props }: AvatarProps) {
  const initials = fallback
    ? fallback
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (!src) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-[var(--color-primary)] text-[var(--color-text-inverse)] inline-flex items-center justify-center font-semibold shrink-0 ${className}`}
        role="img"
        aria-label={alt || fallback || "Avatar"}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Avatar"}
      className={`${sizeClasses[size]} rounded-full object-cover shrink-0 ${className}`}
      {...props}
    />
  );
}

export { Avatar };
export type { AvatarProps };
