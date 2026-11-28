#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/var/www/contr3d"
LOCK_FILE="/tmp/contr3d-deploy.lock"
DOMAIN="contr3d.getdeltacode.com"
BRANCH="dev"
FORCE_DEPS=false
FORCE_BUILD=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --force-deps)
            FORCE_DEPS=true
            shift
            ;;
        --force-build)
            FORCE_BUILD=true
            shift
            ;;
        -h|--help)
            cat <<'USAGE'
Usage: ./deploy.sh [branch] [--force-deps] [--force-build]

Options:
  branch         Git branch to deploy (default: dev)
  --force-deps   Always run npm ci
  --force-build  Rebuild even if already at latest origin commit
USAGE
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
        *)
            BRANCH="$1"
            shift
            ;;
    esac
done

cd "$APP_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "Another deploy is already running ($LOCK_FILE)." >&2
    exit 1
fi

START_TS=$(date +%s)
trap 'rc=$?; [[ $rc -ne 0 ]] && echo "Deploy failed (exit $rc)." >&2' EXIT

if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Refusing to deploy: tracked files have uncommitted changes." >&2
    git status --short >&2
    exit 1
fi

OLD_HEAD=$(git rev-parse HEAD)

echo "==> Fetching origin/$BRANCH..."
git fetch origin "$BRANCH"

TARGET_HEAD=$(git rev-parse "origin/$BRANCH")
if [[ "$OLD_HEAD" == "$TARGET_HEAD" ]] && [[ "$FORCE_BUILD" == false ]] && [[ "$FORCE_DEPS" == false ]] && [[ -f dist/index.html ]]; then
    echo "Already up to date at ${OLD_HEAD:0:7}. Use --force-build to rebuild."
    exit 0
fi

if [[ "$OLD_HEAD" != "$TARGET_HEAD" ]]; then
    echo "==> Updating ${OLD_HEAD:0:7} -> ${TARGET_HEAD:0:7}..."
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
fi

NEW_HEAD=$(git rev-parse HEAD)

changed_between() {
    local pattern="$1"
    [[ "$OLD_HEAD" != "$NEW_HEAD" ]] && git diff --name-only "$OLD_HEAD" "$NEW_HEAD" | grep -Eq "$pattern"
}

if [[ "$FORCE_DEPS" == true ]] || [[ ! -d node_modules ]] || changed_between '^(package\.json|package-lock\.json)$'; then
    echo "==> Installing npm dependencies..."
    npm ci --no-audit --no-fund
fi

echo "==> Building production bundle..."
npm run build

if [[ ! -f dist/index.html ]]; then
    echo "Build failed: dist/index.html not found." >&2
    exit 1
fi

STATUS=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/" || echo "000")
ELAPSED=$(( $(date +%s) - START_TS ))
echo "==> Deployed ${OLD_HEAD:0:7} -> ${NEW_HEAD:0:7} in ${ELAPSED}s (HTTP ${STATUS})."
