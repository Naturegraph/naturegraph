import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { resolve } from 'path'
import pkg from './package.json'

// Upload des source maps vers Sentry UNIQUEMENT si le token de build est present
// (secret Vercel `SENTRY_AUTH_TOKEN`). En local/dev sans token : plugin
// desactive, build normal. Sans ces source maps, les stacks Sentry restent
// minifiees (illisibles : `?<anonymous>`), d'ou l'impossibilite passee de
// localiser un crash. Le token n'existe qu'au BUILD (jamais expose au client).
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN

export default defineConfig({
  // Injection de la version du package à la compilation
  // Usage dans les composants : __APP_VERSION__ (string, ex: "0.1.0")
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    // Doit rester le DERNIER plugin (recommandation Sentry) : il lit le bundle
    // final pour associer les source maps. Ternaire (et non `&&`) pour ne jamais
    // produire une chaine vide, que Vite refuse comme plugin.
    sentryAuthToken
      ? sentryVitePlugin({
          org: 'naturegraph',
          project: 'javascript-react',
          authToken: sentryAuthToken,
          // La release DOIT etre identique a celle passee a Sentry.init
          // (monitoring.ts : `release = __APP_VERSION__`) pour associer les
          // source maps a la bonne version.
          release: { name: pkg.version },
          // On genere les .map pour l'upload, puis on les SUPPRIME du dist :
          // le code source ne fuit pas cote client, seul Sentry le detient.
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          telemetry: false,
        })
      : null,
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    // Source maps ACTIVEES : indispensable pour des stacks Sentry lisibles
    // (fichier + ligne + fonction). Les .map sont supprimees du dist apres
    // upload par le plugin ci-dessus, donc aucun impact sur la taille servie.
    sourcemap: true,
    // BATCH 115 : cible explicite cross-browser pour le bundle prod.
    // Couvre Safari 14+ (sept 2020), iOS 14+, Chrome 87+, Firefox 78+, Edge 88+
    // = ~99% des utilisateurs actifs en 2026. Évite que esbuild émette
    // du code ES2022+ que Safari 14 ne comprend pas.
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
})
