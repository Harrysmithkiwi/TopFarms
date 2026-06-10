import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'TopFarms_Launch_Pack',
      // Deno runtime (Deno.serve, URL imports) — not lintable with this
      // browser/Node config. Typecheck happens at deploy via Supabase CLI.
      'supabase/functions',
      '.claude',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Diagnostics belong behind warn/error; anything chattier (log, time,
      // info) is debug residue and must not ship (audit F13 precedent:
      // [AUTH-FIX-02] console.time lived in the prod auth path for a month).
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // React Compiler diagnostics, downgraded to warn: this project does not
      // run the compiler, and the flagged patterns (sync setState in fetch
      // effects, RHF ref access, deliberately-narrow useCallback deps) are
      // pervasive working code. Ratchet back to error if/when the data layer
      // is restructured (audit task 3.3) or the compiler is adopted.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    // App entry: boots the root, has no exports, and hosts the lazy() route
    // consts — fast refresh always falls back to a full reload here, so the
    // react-refresh rule cannot apply.
    files: ['src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Tests run in jsdom with vitest globals (vitest.config.ts globals: true)
    // and routinely use `any` for mock shapes — keep the signal, drop the noise.
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
