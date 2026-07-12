#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Installing backend dependencies"
cd backend
npm install --omit=dev
cd "$ROOT_DIR"

echo "==> Installing frontend dependencies + building"
cd frontend
cp -n .env.production.example .env.production 2>/dev/null || true
npm install
npm run build
cd "$ROOT_DIR"

echo "==> Ensuring backend .env exists"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "Created backend/.env from example. Edit secrets before production use."
fi

echo "==> Restarting app with PM2"
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.cjs
  pm2 save
else
  echo "PM2 not found. Install with: npm i -g pm2"
  echo "Then run: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
fi

echo "==> Done"
echo "App should be on http://127.0.0.1:3000"
echo "Point Nginx to deploy/nginx.gziraq.conf"
