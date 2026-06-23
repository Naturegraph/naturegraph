// BATCH 115 : Config PostCSS explicite : garantit l'exécution d'autoprefixer.
//
// Sans ce fichier, Vite 7 + @tailwindcss/vite gère les @tailwind directives,
// mais autoprefixer n'est PAS exécuté automatiquement. Or autoprefixer est
// nécessaire pour :
//   - -webkit-backdrop-filter (Safari < 18 sur certaines propriétés)
//   - -webkit-mask-* (Safari)
//   - -webkit-appearance / -moz-appearance (forms, range, etc.)
//   - autres prefixes legacy selon .browserslistrc
//
// Le plugin '@tailwindcss/postcss' intercepte les @tailwind directives ;
// autoprefixer s'exécute ensuite sur le CSS produit en se basant sur
// .browserslistrc.

export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
