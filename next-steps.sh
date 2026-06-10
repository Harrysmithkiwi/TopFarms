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
  [x] RLS-MKT-01 fixed — migration 038 view APPLIED + 4 embeds repointed
      (8bfbe08); e2e marketplace guard now genuine
  [ ] PUSH to main — SAFE (verified: migrations job double-gated; push runs
      functions deploy + CI only). Deploys BOTH webhook fixes: verify_jwt
      gate (7539c85) + constructEventAsync (75e301a). Until pushed, Stripe
      deliveries 401 at the gateway.
      ⚠ NEVER use the Actions 'Run workflow' button on supabase-deploy.yml —
        workflow_dispatch is exactly what UN-gates the migrations job (the
        incomplete-repair trap). Plain git push only.
  [ ] AFTER PUSH: re-probe live endpoint — missing/bad sig must return 400
      from the handler (today: 401 from the gateway)
  [ ] PRE-LAUNCH: apply migrations/037_definer_function_hardening.sql (F7/F8,
      staged c4e660e — checklist in file header) + registry repair per
      .planning/REGISTRY-REPAIR-PLAN-2026-06-10.md (now incl. 036 AND 038)
  [ ] PRE-LAUNCH: SEEKER-PROFILE-EXPOSURE-01 — seekers can read all 39
      employer_profiles columns incl. stripe_customer_id (filed 2026-06-10)
  [ ] Set E2E_* GitHub secrets so role-gated e2e flows run in CI
EOF
echo "Done. Re-run this script after Milestone 0 to confirm gates are green."
