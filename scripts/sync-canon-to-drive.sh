#!/usr/bin/env bash
# sync-canon-to-drive.sh — one-directional publish of docs/_canonical/*.md to a
# READ-ONLY Google Docs mirror. The repo is the ONLY source of truth; the Drive
# Docs are OVERWRITTEN in place (same fileId) on every run — repo wins, no dupes.
#
# Pipeline per file:
#   marked --gfm  ->  HTML (+ a "MIRROR — do not edit" banner)  ->  gws drive
#   files create/update with text/html media  ->  Drive converts to a native Doc.
#
# Usage:
#   scripts/sync-canon-to-drive.sh                      # sync every doc in the manifest
#   scripts/sync-canon-to-drive.sh --only PRD.md        # sync ONE file (manifest 'file' value)
#   scripts/sync-canon-to-drive.sh --dry-run            # convert locally, write HTML, NO Drive calls
#   scripts/sync-canon-to-drive.sh --only Data_Architecture.md   # e.g. the first real-doc gate
#
# Requires: gws (authed), jq, npx (marked is fetched on demand). Reads/writes the
# manifest at docs/_canonical/.drive-mirror.json. mirror_folder_id MUST be set
# (created in the folder-bootstrap step) before a real (non --dry-run) sync.
#
# First sync of a file: CREATE in the mirror folder, then the new id is written
# back into the manifest. Every later sync: UPDATE that same id in place.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"   # gws --upload only accepts paths INSIDE the current directory
MANIFEST="$ROOT/docs/_canonical/.drive-mirror.json"
SRC_DIR="$ROOT/docs/_canonical"
WORK=".canon-sync-tmp"   # repo-local (cwd) so gws --upload accepts it; gitignored
mkdir -p "$WORK"
trap 'rm -rf "$WORK"' EXIT

ONLY=""
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --only)    ONLY="${2:?--only needs a filename}"; shift 2;;
    --dry-run) DRY=1; shift;;
    -h|--help) sed -n '2,18p' "$0"; exit 0;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

for dep in jq npx; do
  command -v "$dep" >/dev/null || { echo "missing dependency: $dep" >&2; exit 1; }
done
[ -f "$MANIFEST" ] || { echo "manifest not found: $MANIFEST" >&2; exit 1; }
if [ "$DRY" -eq 0 ]; then
  command -v gws >/dev/null || { echo "missing dependency: gws (or use --dry-run)" >&2; exit 1; }
  # gws's own OAuth client is broken; borrow a gcloud-minted Drive token (gws honors
  # GOOGLE_WORKSPACE_CLI_TOKEN as highest priority). One token lasts ~1h — fine per run.
  : "${GOOGLE_WORKSPACE_CLI_TOKEN:=$(gcloud auth print-access-token 2>/dev/null)}"
  export GOOGLE_WORKSPACE_CLI_TOKEN
  [ -n "$GOOGLE_WORKSPACE_CLI_TOKEN" ] || {
    echo "no Drive token — run: gcloud auth login --enable-gdrive-access" >&2; exit 1; }
fi

FOLDER_ID="$(jq -r '.mirror_folder_id // ""' "$MANIFEST")"
if [ "$DRY" -eq 0 ] && [ -z "$FOLDER_ID" ]; then
  echo "mirror_folder_id is empty in the manifest." >&2
  echo "Create the 'Canon (mirror)' folder first and set its id in $MANIFEST." >&2
  exit 1
fi

GIT_SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
STAMP="$(date -u '+%Y-%m-%d %H:%M UTC')"

# MIRROR banner prepended to every generated Doc. HTML entities only (keeps this
# script ASCII-clean). This is what makes the mirror drift-proof in practice.
emit_banner() { # $1 = repo-relative source path
  cat <<HTML
<p style="background:#fff3cd;border:1px solid #ffe69c;padding:10px;border-radius:6px;font-family:sans-serif;font-size:13px">
<strong>&#9888;&#65039; AUTO-GENERATED MIRROR &mdash; DO NOT EDIT HERE.</strong><br>
Source of truth is the TopFarms repo at <code>$1</code>. This Google Doc is a read-only published
copy and is <strong>overwritten on every sync</strong> &mdash; any edit made here is lost. Edit the
markdown in the repo, then re-run the canon sync.<br>
<em>Synced $STAMP from commit $GIT_SHA.</em>
</p>
<hr>
HTML
}

render_html() { # $1 = md path, $2 = repo-rel source path, $3 = out html path
  { printf '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>\n'
    emit_banner "$2"
    npx -y marked --gfm "$1"
    printf '\n</body></html>\n'
  } > "$3"
}

sync_one() { # $1 = file  $2 = title  $3 = existing drive_file_id
  local file="$1" title="$2" fid="$3"
  local md="$SRC_DIR/$file" html="$WORK/${file%.md}.html"
  [ -f "$md" ] || { echo "  ! source missing: $md" >&2; return 1; }
  render_html "$md" "docs/_canonical/$file" "$html"

  if [ "$DRY" -eq 1 ]; then
    local action; action="$( [ -n "$fid" ] && echo "UPDATE $fid" || echo "CREATE in ${FOLDER_ID:-<unset>}" )"
    echo "  [dry-run] $file -> $(wc -c <"$html" | tr -d ' ') bytes HTML; would $action"
    return 0
  fi

  if [ -n "$fid" ]; then
    gws drive files update \
      --params "$(jq -nc --arg id "$fid" '{fileId:$id, fields:"id,name,modifiedTime"}')" \
      --upload "$html" --upload-content-type text/html >/dev/null
    echo "  updated  $title  ($fid)"
  else
    local resp newid tmp
    resp="$(gws drive files create \
      --json "$(jq -nc --arg n "$title" --arg p "$FOLDER_ID" \
                 '{name:$n, mimeType:"application/vnd.google-apps.document", parents:[$p]}')" \
      --upload "$html" --upload-content-type text/html \
      --params '{"fields":"id,name"}')"
    newid="$(printf '%s' "$resp" | jq -r '.id // empty')"
    [ -n "$newid" ] || { echo "  ! create failed for $file: $resp" >&2; return 1; }
    tmp="$(mktemp)"
    jq --arg f "$file" --arg id "$newid" \
       '(.docs[] | select(.file==$f) | .drive_file_id) = $id' "$MANIFEST" > "$tmp" && mv "$tmp" "$MANIFEST"
    echo "  created  $title  ($newid)  [manifest updated]"
  fi
}

echo "Canon -> Drive mirror sync  (folder: ${FOLDER_ID:-<dry-run>}${ONLY:+, only: $ONLY})"
count=0
while IFS=$'\t' read -r file title fid; do
  [ -z "$ONLY" ] || [ "$ONLY" = "$file" ] || continue
  echo "- $file"
  sync_one "$file" "$title" "$fid"
  count=$((count + 1))
done < <(jq -r '.docs[] | [.file, .title, (.drive_file_id // "")] | @tsv' "$MANIFEST")

if [ "$count" -eq 0 ]; then
  echo "no docs matched${ONLY:+ --only $ONLY}" >&2
  exit 1
fi
echo "done ($count doc(s))."
