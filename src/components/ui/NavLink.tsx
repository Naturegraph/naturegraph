import { NavLink as RouterNavLink, type NavLinkProps as RouterNavLinkProps } from "react-router-dom";
import type { ReactNode } from "react";

interface NavLinkProps extends RouterNavLinkProps {
  icon?: ReactNode;
  size?: "sm" | "md";
}

const sizeClasses = {
  sm: "text-sm px-2 py-1",
  md: "text-sm px-3 py-2",
};

function NavLink({ icon, size = "md", className = "", children, ...props }: NavLinkProps) {
  return (
    <RouterNavLink
      className={({ isActive }) =>
        `inline-flex items-center gap-2 font-medium rounded-lg transition-colors ${sizeClasses[size]} ${
          isActive
            ? "text-[var(--color-action-default)] bg-[var(--color-action-light)]"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
        } ${className}`
      }
      {...props}
    >
      {icon && <span className="shrink-0 [&>svg]:w-5 [&>svg]:h-5" aria-hidden="true">{icon}</span>}
      {children}
    </RouterNavLink>
  );
}

export { NavLink };
export type { NavLinkProps };
