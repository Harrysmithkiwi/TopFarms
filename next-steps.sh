#!/usr/bin/env bash
# TopFarms — first actions from AUDIT-AGENTIC-2026-06-10.md
# All steps are safe (read-only checks or reversible dep fixes). Run from repo root.
# Stop on first failure so each gate is visible.
set -euo pipefail

echo "── Step 1/5: baseline — current typecheck failures (expected: 29 errors) ──"
npm run typecheck || echo ">> tsc failing as documented (audit F1). Fix these first (Milestone 0.1)."

echo "── Step 2/5: dependency vulnerabilities — dry-run preview ──"
npm audit --omit=dev || true
echo ">> When ready, apply with: npm audit fix   (then re-run: npx vitest run)"

echo "── Step 3/5: full test suite (the safety net — must stay green) ──"
npx vitest run

echo "── Step 4/5: build + bundle size check (audit F5: single 1.39MB chunk) ──"
npm run build
ls -lh dist/assets/*.js

echo "── Step 5/5: reminders (manual, one-click each) ──"
cat <<'EOF'
  [x] eslint.config.js (closed 2026-06-10, commit 9b00cc3)
  [x] .github/workflows/ci.yml (closed 2026-06-10, commit dfe2ccb)
  [x] employer-photos listing policy — migration 036 APPLIED (F12, 18700a2)
  [x] Playwright e2e suite committed + CI jobs (F16, aefe255)
  [ ] Supabase dashboard → Auth → enable leaked-password protection (audit F9)
  [ ] PRE-LAUNCH: apply migrations/037_definer_function_hardening.sql (F7/F8,
      staged c4e660e — review checklist in file header) then registry repair
      per .planning/REGISTRY-REPAIR-PLAN-2026-06-10.md (F4)
  [ ] PRE-LAUNCH: decide + apply RLS-MKT-01 fix (anon job marketplace empty);
      then remove test.fail() in tests/e2e/seeker-browse-jobs.spec.ts
  [ ] PUSH to main — deploys the stripe-webhook constructEventAsync fix
      (75e301a); prod webhook 400s ALL events until deployed
  [ ] Set E2E_* GitHub secrets so role-gated e2e flows run in CI
EOF
echo "Done. Re-run this script after Milestone 0 to confirm gates are green."
