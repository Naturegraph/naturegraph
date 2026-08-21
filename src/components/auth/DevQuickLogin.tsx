/**
 * DevQuickLogin : connexion rapide aux comptes de test, RÉSERVÉE au DEV.
 *
 * Sur la base DEV, envoyer un OTP par email est pénible (comptes @dev.local sans
 * vraie boîte mail, limites d'envoi). Ce composant propose des boutons qui
 * connectent directement un compte de test via mot de passe (méthode d'auth
 * standard signInWithPassword). Les comptes @dev.local ont un mot de passe dev
 * connu (défini côté base + seed).
 *
 * SÉCURITÉ : le bouton n'apparaît QUE si l'app est branchée sur le projet Supabase
 * DEV (`nkgdgxwejqqnqmwqwegy`). En prod (`hrxg…`), `IS_DEV_DB` est false -> le
 * composant ne rend RIEN. Aucun risque d'exposition en production.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/** true uniquement si l'app pointe sur la base DEV (jamais la prod). */
const IS_DEV_DB = (import.meta.env.VITE_SUPABASE_URL ?? '').includes('nkgdgxwejqqnqmwqwegy')

/** Mot de passe partagé des comptes de test dev (cf. seed-dev-testdata.sql). */
const DEV_PASSWORD = 'naturedev2026'

const DEV_ACCOUNTS = [
  { email: 'flore@dev.local', label: 'flore_bota' },
  { email: 'marc@dev.local', label: 'marc_ornitho' },
  { email: 'julie@dev.local', label: 'julie_macro' },
  { email: 'sam@dev.local', label: 'sam_nature' },
]

export function DevQuickLogin() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Garde-fou : rien en prod, rien si Supabase absent.
  if (!IS_DEV_DB || !supabase) return null

  async function login(email: string) {
    if (!supabase) return
    setBusy(email)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASSWORD,
    })
    setBusy(null)
    if (err) {
      setError(err.message)
      return
    }
    navigate('/home')
  }

  return (
    <div className="mt-5 w-full rounded-lg border border-dashed border-amber-500/60 bg-amber-500/5 p-3">
      <p className="mb-2 text-xs font-bold text-amber-700">
        🔧 DEV — connexion rapide (base de test, jamais en prod)
      </p>
      <div className="flex flex-wrap gap-2">
        {DEV_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => login(a.email)}
            disabled={busy !== null}
            className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {busy === a.email ? '…' : a.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
