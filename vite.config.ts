import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import pkg from './package.json'

export default defineConfig({
  // Injection de la version du package à la compilation
  // Usage dans les composants : __APP_VERSION__ (string, ex: "0.1.0")
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
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
