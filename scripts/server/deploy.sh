#!/usr/bin/env bash
# Server-side deploy for me.xeed.ink — invoked by the shared gx webhook runner
# (/usr/local/lib/webhook-deploy) or manually:
#   ssh gx, then
#   `runuser -u me-ci -- env HOME=/home/me-ci bash ~/me/scripts/server/deploy.sh refs/heads/main`
#
# 1. fetch the pushed branch into the persistent clone
# 2. bun install + astro build
# 3. rsync into /srv/me (Caddy serves it). Content-hashed /_astro/ retires
#    into ~/me-attic instead of being deleted: a browser-cached HTML page may
#    still reference the previous generation's assets.
set -Eeuo pipefail
umask 022
REF="${1:-refs/heads/main}"
BRANCH="${REF#refs/heads/}"
REPO=/home/me-ci/me
DEST=/srv/me
LOCK=/home/me-ci/.deploy.lock
RERUN=/home/me-ci/.deploy-rerun
say() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { say "FATAL: $*"; exit 1; }
cd "$REPO"
# One deploy at a time; a push that lands mid-deploy queues exactly one rerun
# (latest commit wins — the queued rerun fetches the newest sha anyway).
exec 9>"$LOCK"
if ! flock -n 9; then
  touch "$RERUN"
  say "deploy already running — queued one rerun"
  exit 0
fi
# The runner exports the pushed sha as ZP_PUSH_SHA (legacy name, all sites).
say "=== deploy start (${BRANCH}, sha=${ZP_PUSH_SHA:-unknown}) ==="
# The clone is disposable: drop any local drift before fetching.
git reset --hard -q
# Snapshot the running script BEFORE the fetch: bash keeps executing the old
# inode across the checkout, but $0 is just a path and resolves to the new
# file afterwards — path-to-path comparison can never detect the change.
SELF_SNAP=$(mktemp)
cat "$0" > "$SELF_SNAP"
# github.com is intermittently unreachable from this box. Retry until we hold
# the exact pushed commit, and never build from a tree we could not verify —
# a silent stale deploy is the worst failure mode. `timeout` bounds each
# attempt (git lets a connect hang >2min otherwise). Note
# `git fetch && git checkout` alone would NOT abort under errexit: a failed
# non-final command of an AND-list is exempt.
WANT="${ZP_PUSH_SHA:-}"
ok=""
for attempt in 1 2 3 4 5; do
  if timeout 60 git fetch --depth=1 origin "$BRANCH"; then
    got=$(git rev-parse -q --verify FETCH_HEAD || true)
    if [ -z "$WANT" ] || [ "$got" = "$WANT" ]; then ok=1; break; fi
    say "fetch got ${got:-nothing}, want $WANT — attempt $attempt"
  else
    say "fetch failed — attempt $attempt"
  fi
  [ "$attempt" = 5 ] || sleep $((attempt * 5))
done
if [ -z "$ok" ]; then
  die "could not fetch $BRANCH (want ${WANT:-any tip}) — keeping last good deploy"
fi
git checkout -q -B "$BRANCH" FETCH_HEAD
if ! cmp -s "$SELF_SNAP" "$REPO/scripts/server/deploy.sh"; then
  rm -f "$SELF_SNAP"; say "deploy.sh changed — re-execing"
  exec /bin/bash "$REPO/scripts/server/deploy.sh" "$@"
fi
rm -f "$SELF_SNAP"
# --- build -------------------------------------------------------------------
bun install --frozen-lockfile
bun run build
printf '{"sha":"%s","branch":"%s","deployedAt":"%s"}\n' \
  "$(git rev-parse HEAD)" "$BRANCH" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > dist/deploy-meta.json
# --- publish ----------------------------------------------------------------
# Everything except /_astro replaces wholesale. Hashed /_astro/ chunks retire
# into a timestamped attic instead of being deleted: a browser-cached HTML
# page may still reference them. Attic dirs are pruned by their own age, i.e.
# measured from retirement, independent of deploy cadence.
ATTIC="$HOME/me-attic"
mkdir -p "$ATTIC"
rsync -a --delete --delay-updates --exclude=/_astro --exclude=/deploy-status.json \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist/ "$DEST/"
# --checksum: dist mtimes are always fresh, so quick-check would rewrite (and
# thus --backup) every file each deploy; content comparison makes the attic
# hold only genuinely retired assets.
rsync -a --delete --checksum --backup --backup-dir="$ATTIC/$(date -u +%Y%m%dT%H%M%S)" \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist/_astro/ "$DEST/_astro/"
# GNU find rounds age up: +6 = 7 full days; prune from retirement time.
find "$ATTIC" -mindepth 1 -maxdepth 1 -type d -mtime +6 -exec rm -rf {} +
say "published $(git rev-parse --short HEAD) → $DEST (attic: $(du -sh "$ATTIC" 2>/dev/null | cut -f1))"
say "=== deploy done ==="
if [ -e "$RERUN" ]; then
  rm -f "$RERUN"
  say "a newer push arrived during this deploy — running again"
  exec /bin/bash "$0" "$REF"
fi
