import type { HTMLAttributes } from "react";

interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  spacing?: "sm" | "md" | "lg";
}

const spacingClasses = {
  sm: "my-2",
  md: "my-4",
  lg: "my-8",
};

function Divider({ spacing = "md", className = "", ...props }: DividerProps) {
  return (
    <hr
      className={`border-0 border-t border-[var(--color-border-light)] ${spacingClasses[spacing]} ${className}`}
      {...props}
    />
  );
}

export { Divider };
export type { DividerProps };
