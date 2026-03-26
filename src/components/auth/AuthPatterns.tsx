/**
 * AuthPatterns — Éléments décoratifs SVG pour le fond desktop de l'AuthPage
 * Affichés derrière la card d'authentification sur fond teal.
 */

export function AuthPatterns() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1728 1024"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {/* Grands cercles décoratifs */}
      <circle
        cx="120"
        cy="120"
        r="200"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="120"
        cy="120"
        r="320"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="1"
        fill="none"
      />
      <circle
        cx="1608"
        cy="904"
        r="260"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="1.5"
        fill="none"
      />
      <circle
        cx="1608"
        cy="904"
        r="400"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="1"
        fill="none"
      />

      {/* Petits cercles remplis */}
      <circle cx="300" cy="820" r="6" fill="rgba(255,255,255,0.12)" />
      <circle cx="340" cy="760" r="4" fill="rgba(255,255,255,0.08)" />
      <circle cx="1420" cy="180" r="5" fill="rgba(255,255,255,0.10)" />
      <circle cx="1480" cy="240" r="8" fill="rgba(255,255,255,0.06)" />
      <circle cx="200" cy="600" r="3" fill="rgba(255,255,255,0.15)" />
      <circle cx="1550" cy="500" r="4" fill="rgba(255,255,255,0.10)" />

      {/* Feuille gauche */}
      <path
        d="M80 480 C80 380 160 320 240 340 C180 400 160 460 200 520 C140 510 100 490 80 480Z"
        fill="rgba(255,255,255,0.06)"
      />
      <path
        d="M60 500 C80 430 140 390 200 410"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Feuille droite */}
      <path
        d="M1640 200 C1640 100 1560 40 1480 60 C1540 120 1560 180 1520 240 C1580 230 1620 210 1640 200Z"
        fill="rgba(255,255,255,0.06)"
      />
      <path
        d="M1660 220 C1640 150 1580 110 1520 130"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Lignes diagonales subtiles */}
      <line x1="0" y1="1024" x2="400" y2="0" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      <line x1="1328" y1="0" x2="1728" y2="1024" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
    </svg>
  )
}
