#!/usr/bin/env bash
# Run ON the Hostinger VPS inside the site root, e.g.:
#   cd /home/ccri-research/htdocs/www.ccri-research.io
#   bash scripts/deploy-vps.sh
#
# Expects: git repo at site root, Node/npm, PM2 process name mms-api (or set PM2_NAME).

set -euo pipefail

SITE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SITE_ROOT"

PM2_NAME="${PM2_NAME:-mms-api}"
BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> Site root: $SITE_ROOT"
echo "==> Branch: $BRANCH"

if [[ -d .git ]]; then
  echo "==> git fetch / reset to origin/$BRANCH"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  echo "WARN: no .git folder — skipping pull (upload files another way)"
fi

echo "==> Frontend: npm ci && build"
npm ci
npm run build

echo "==> Backend: npm ci, prisma, build"
cd server
npm ci
npx prisma generate
npx prisma db push
npm run build
cd ..

if ! [[ -f server/.env ]]; then
  echo "ERROR: server/.env missing. Copy from .env.example and set production values."
  exit 1
fi

echo "==> Restart PM2 ($PM2_NAME)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 describe "$PM2_NAME" >/dev/null 2>&1 && pm2 restart "$PM2_NAME" --update-env \
    || pm2 start server/dist/index.js --name "$PM2_NAME" --cwd "$SITE_ROOT/server"
  pm2 save
else
  echo "WARN: pm2 not found — restart the Node app from CloudPanel."
fi

echo "==> Done. Check https://www.ccri-research.io/ and /api/health"
