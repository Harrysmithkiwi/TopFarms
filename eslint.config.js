// Warning ratchet: `npm run lint` pins --max-warnings to the current count
// (package.json). The backlog (React Compiler diagnostics + exhaustive-deps,
// see rules below) may shrink but never grow — lower the pin when you clear
// warnings; never raise it without a deliberate decision.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      // react-router build output (client + server bundles) and the generated
      // route-type cache — build artefacts, not source.
      'build',
      '.react-router',
      'coverage',
      'TopFarms_Launch_Pack',
      '_archive',
      // Deno runtime (Deno.serve, URL imports) — not lintable with this
      // browser/Node config. Typecheck happens at deploy via Supabase CLI.
      'supabase/functions',
      // Same reason, one file: a Deno CLI check that imports supabase/functions/_shared
      // and prints its results. `deno check` covers it. Named individually rather than
      // ignoring all of scripts/ — the rest of that directory stays linted.
      'scripts/seeker-extraction-check.ts',
      // Vendored skill/agent dirs at any depth (e.g. marketing/video/**/.claude
      // fixture corpora) — not app code, not held to app lint standards.
      '**/.claude',
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
    files: ['src/main.tsx', 'src/root.tsx', 'src/legacyRoutes.tsx', 'src/routes/**'],
    rules: {
      // Entries and route modules export non-components by design: main.tsx
      // boots the root, legacyRoutes hosts the lazy() consts, and a framework-
      // mode route module's loader/meta/clientLoader/HydrateFallback sit beside
      // its component because that colocation IS the routing convention.
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
  {
    // Vendored Tremor copy-paste components + chart utils (third-party-authored,
    // tremor.so distribution model). Same rationale as tests/: their `any`-heavy
    // recharts typings and mixed exports are upstream's style, not our debt.
    files: ['src/components/tremor/**', 'src/lib/chartUtils.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
)
