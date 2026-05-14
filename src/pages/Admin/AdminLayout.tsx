/**
 * AdminLayout — Layout pour toutes les routes /admin/*
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 + BATCH 31
 *
 * Structure :
 *   - Header top : titre + status systeme + user admin
 *   - Sidebar gauche : 5 modules (Dashboard, Users, Moderation, Beta, Audit)
 *   - Main : <Outlet /> pour la route active
 *
 * Responsive : sidebar passe en bottom nav sur mobile (md:hidden / md:flex).
 */

import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Shield,
  Key,
  FileText,
  Home as HomeIcon,
} from 'lucide-react'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { usePageTitle } from '@/hooks/usePageTitle'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users, end: false },
  { to: '/admin/moderation', label: 'Moderation', icon: ShieldAlert, end: false },
  { to: '/admin/beta', label: 'Beta', icon: Key, end: false },
  { to: '/admin/audit', label: 'Audit', icon: FileText, end: false },
] as const

export default function AdminLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { role, adminUser } = useIsAdmin()
  usePageTitle(t('admin.title', { defaultValue: 'Admin' }))

  return (
    <div className="min-h-screen bg-cream-lighter flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-foreground text-background border-b border-border h-14 flex items-center px-4 md:px-6">
        <div className="flex-1 flex items-center gap-3">
          {/* BATCH 42 : remplace emoji 🛡️ par icone Lucide (coherence DS, accessible). */}
          <span className="font-bold text-base inline-flex items-center gap-2">
            <Shield className="size-4 text-primary" aria-hidden="true" />
            Naturegraph Admin
          </span>
          <span className="hidden md:inline-block text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wide">
            {role ?? 'role'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <NavLink
            to="/home"
            className="hidden md:inline-flex items-center gap-1.5 text-background/80 hover:text-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <HomeIcon className="size-4" aria-hidden="true" />
            <span>Retour app</span>
          </NavLink>
          <span className="text-background/60 text-xs hidden md:inline">
            {adminUser?.notes ?? 'Admin'}
          </span>
        </div>
      </header>

      {/* ── Body : sidebar + main ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar desktop */}
        <nav className="hidden md:flex flex-col gap-1 w-56 shrink-0 p-4 border-r border-border bg-background">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted/50'
                  }`
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Main content */}
        <main id="main-content" className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden sticky bottom-0 z-10 bg-background border-t border-border flex items-stretch h-14 px-1">
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
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label.slice(0, 8)}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
