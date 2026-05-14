import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Eco-conception: avoid heavy patterns
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Allow hooks export alongside components in context files
      // BATCH 25 / T-092 : extended allowExportNames pour Context+Hook + helpers
      // collocate (source de verite). N'impacte que HMR dev, pas la prod.
      'react-refresh/only-export-components': [
        'warn',
        {
          allowExportNames: [
            // Auth + theme hooks
            'useAuth',
            'useThemeContext',
            // Context+Hook collocate
            'useAccessibility',
            'useLocation',
            'useSpecies',
            'useToast',
            // Custom hooks collocate with components
            'useAuthOrbTracking',
            // Helpers/constants collocate as source of truth
            'REACTION_CONFIG',
            'postFeedItemToMockPost',
            'getMessage',
            'resolveDeepLink',
          ],
        },
      ],
      // Autoriser les variables prefixees par _ comme intentionnellement inutilisees (ex: props TODO BACKEND)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
    },
  },
])
