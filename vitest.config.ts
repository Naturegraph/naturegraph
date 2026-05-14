/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    // BATCH 23 / T-008 : coverage gate progressif.
    // Cible MVP : 30% sur services + utils (cible critique).
    // Cible globale : commencer bas, augmenter au fil des batches refacto.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/services/**/*.{ts,tsx}', 'src/utils/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/index.ts', // barrels
        'src/services/storageService.ts', // Supabase Storage wrappers
      ],
      thresholds: {
        // Seuils progressifs : decommenter au fil des batches refacto.
        // Pour activer le fail-on-low-coverage en CI :
        //   lines: 30,
        //   functions: 30,
        //   branches: 30,
        //   statements: 30,
      },
    },
  },
})
