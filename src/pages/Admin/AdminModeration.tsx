/**
 * AdminModeration — Module 3 : Moderation contenu (placeholder MVP)
 *
 * Refs : ADMIN_PRODUCT_CONTROL_CENTER_STRATEGY.md v2.0 Module 3
 * Statut : BATCH 34 (a venir) — placeholder.
 */

import { EmptyState } from '@/components/ui'
import { ShieldAlert } from 'lucide-react'

export default function AdminModeration() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Moderation</h1>
      <EmptyState
        icon={<ShieldAlert className="size-12" />}
        title="Module en construction"
        description="La moderation des signalements sera livree dans BATCH 34. Pour l'instant, consulter `moderation_reports` via Supabase Dashboard."
      />
    </div>
  )
}
