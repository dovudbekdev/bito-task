#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ">>> Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo ">>> Installing dependencies..."
npm ci

echo ">>> Building..."
npm run build

echo ">>> Running migrations..."
npm run migration:run:prod

echo ">>> Restarting app..."
if pm2 describe bito-task > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo ">>> Health check..."
sleep 3
curl -f "http://127.0.0.1:${APP_PORT:-3000}/api/docs" > /dev/null

echo ">>> Deploy completed successfully"
