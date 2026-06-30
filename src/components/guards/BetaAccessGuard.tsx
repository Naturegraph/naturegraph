/**
 * BetaAccessGuard : passe-plat transparent (acces ouvert, NG-029).
 *
 * Historique : ce guard gardait le site derriere l'ecran /welcome (code beta).
 * Depuis le passage en acces ouvert (early access, plus de beta fermee), il n'y
 * a plus de gate : l'app est accessible librement, l'inscription se fait sans
 * code. L'ecran Welcome a ete supprime.
 *
 * On conserve ce composant comme simple wrapper pour ne pas restructurer le
 * router (BetaGatedLayout). Il rend ses enfants sans condition.
 */

interface BetaAccessGuardProps {
  children: React.ReactNode
}

export function BetaAccessGuard({ children }: BetaAccessGuardProps) {
  return <>{children}</>
}
