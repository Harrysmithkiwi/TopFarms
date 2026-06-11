#!/usr/bin/env bash
# Replay synthetic intake payloads against a live lead-intake endpoint to
# verify the L2 wiring after Apify + secrets are configured (leads L2).
#
# Usage: scripts/verify-lead-intake.sh <FUNCTION_URL> <LEAD_INTAKE_SECRET>
#   FUNCTION_URL e.g. https://inlagtgpynemhipnqvty.functions.supabase.co/lead-intake
#
# It does NOT need an Apify account: the direct-paste lane proves structuring +
# staging end-to-end. The Apify-event lane is exercised with a fake datasetId,
# which proves auth + the fetch path (expect a 502 'apify dataset fetch 4xx'
# unless APIFY_TOKEN + a real datasetId are supplied — that 502 is success for
# this check: it means the branch authorized and reached Apify).
set -euo pipefail

URL="${1:?FUNCTION_URL required}"
SECRET="${2:?LEAD_INTAKE_SECRET required}"
H=(-H "X-Webhook-Secret: ${SECRET}" -H "Content-Type: application/json")

echo "── 1) direct paste lane (structuring + staging) ──"
curl -s -w "\n[%{http_code}]\n" "${H[@]}" -X POST "${URL}" \
  --data '{"source":"fb_own_group","items":[{"raw_text":"Sharemilker wanted, 450 cows OAD, Southland. Ph 021 555 0000","source_ref":"verify://direct-1"}]}'

echo "── 2) Apify event lane (auth + dataset-fetch branch; fake datasetId) ──"
curl -s -w "\n[%{http_code}]\n" "${H[@]}" -X POST "${URL}?source=seek" \
  --data '{"eventType":"ACTOR.RUN.SUCCEEDED","resource":{"defaultDatasetId":"VERIFY_FAKE_DATASET"}}'

echo "── 3) wrong secret must be refused ──"
curl -s -w "\n[%{http_code}]\n" -H "X-Webhook-Secret: wrong" -H "Content-Type: application/json" \
  -X POST "${URL}" --data '{"source":"seek","items":[]}'

echo
echo "Expectations: (1) 200 with results; (2) 502 'apify dataset fetch ...' OR"
echo "200 if a real datasetId+APIFY_TOKEN; (3) 403 forbidden."
echo "Then confirm row(s) from (1) appear in /admin/leads/staging."
