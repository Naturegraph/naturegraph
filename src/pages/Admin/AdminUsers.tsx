/**
 * AdminUsers — Module 2 : Gestion utilisateurs (placeholder MVP)
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 2
 * Statut : BATCH 34 (a venir) — placeholder pour ne pas casser le router.
 */

import { EmptyState } from '@/components/ui'
import { Users } from 'lucide-react'

export default function AdminUsers() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
      <EmptyState
        icon={<Users className="size-12" />}
        title="Module en construction"
        description="La gestion utilisateurs sera livree dans BATCH 34. Pour l'instant, utiliser le Supabase Dashboard."
      />
    </div>
  )
}
