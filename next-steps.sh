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
  [ ] Supabase dashboard → Auth → enable leaked-password protection (audit F9)
  [ ] DB hardening migration via Studio SQL Editor (audit F7/F8, task 1.1)
      — GATED to pre-launch per operator 2026-06-10; verify afterwards with
        read-only MCP get_advisors
EOF
echo "Done. Re-run this script after Milestone 0 to confirm gates are green."
