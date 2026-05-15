/**
 * AdminLayout — Layout pour toutes les routes /admin/*
 *
 * BATCH 90 (Nicolas decision 2026-05-15) : redesign moderne.
 *   - Suppression du gros header noir "Naturegraph Admin / SUPER_ADMIN / Retour app"
 *   - Garde sidebar gauche claire avec logo + nav + footer admin info
 *   - Bouton "Retour à l'app" deplacé en footer de sidebar
 *   - Body principal a droite, fond cream cohérent app
 *   - Responsive : sidebar collapse en bottom nav sur mobile
 */

import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Users, ShieldAlert, Key, FileText, ArrowLeft } from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { usePageTitle } from '@/hooks/usePageTitle'
import hermineIcon from '@/assets/images/hermine-icon.png'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users, end: false },
  { to: '/admin/moderation', label: 'Modération', icon: ShieldAlert, end: false },
  { to: '/admin/beta', label: 'Beta', icon: Key, end: false },
  { to: '/admin/audit', label: 'Audit', icon: FileText, end: false },
] as const

export default function AdminLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { role } = useIsAdmin()
  usePageTitle(t('admin.title', { defaultValue: 'Administration' }))

  return (
    <div className="min-h-screen bg-[var(--color-bg-secondary)] flex flex-col md:flex-row">
      {/* ════════ Sidebar desktop (gauche) ════════ */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)] sticky top-0 h-screen">
        {/* Header sidebar : logo hermine Naturegraph + brand + role (BATCH 105b) */}
        <div className="px-6 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 mb-2">
            <img
              src={hermineIcon}
              alt=""
              className="size-7 shrink-0"
              width={28}
              height={28}
              aria-hidden="true"
            />
            <span className="font-bold text-base text-[var(--color-text-primary)]">
              Naturegraph
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">
            {role === 'super_admin' ? 'Super-admin' : (role ?? 'Admin')}
          </p>
        </div>

        {/* Navigation principale */}
        <nav
          className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto"
          aria-label="Navigation admin"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] ${
                    isActive
                      ? 'bg-[var(--color-action-default)] text-[var(--color-text-white)]'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                  }`
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Footer sidebar : retour app */}
        <div className="px-3 py-4 border-t border-[var(--color-border)]">
          <Link
            to="/home"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)]"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span>Retour à l'app</span>
          </Link>
        </div>
      </aside>

      {/* ════════ Main content (droite) ════════ */}
      <main id="main-content" className="flex-1 p-4 md:p-8 overflow-x-hidden pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* ════════ Mobile bottom nav ════════ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-[var(--color-bg-primary)] border-t border-[var(--color-border)] flex items-stretch h-16 px-1 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.06)]"
        aria-label="Navigation admin mobile"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] rounded transition-colors ${
                isActive
                  ? 'text-[var(--color-action-default)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {/* BATCH 114 : truncate au lieu de slice() — préserve l'accent + responsive */}
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
