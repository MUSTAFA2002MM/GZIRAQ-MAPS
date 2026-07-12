#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Git revision"
git rev-parse --short HEAD || true
git log -1 --oneline || true

echo "==> Installing backend dependencies"
cd backend
npm install --omit=dev
cd "$ROOT_DIR"

echo "==> Installing frontend dependencies + building"
cd frontend
cp -n .env.production.example .env.production 2>/dev/null || true
# Force same-origin API in production build
printf 'VITE_API_URL=\n' > .env.production
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
  pm2 delete gziraq-maps >/dev/null 2>&1 || true
  pm2 start ecosystem.config.cjs
  pm2 save
else
  echo "PM2 not found. Install with: npm i -g pm2"
  echo "Then run: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
fi

echo "==> Verifying API"
sleep 2
curl -fsS http://127.0.0.1:3000/api/health || echo "HEALTH FAILED"
curl -fsS http://127.0.0.1:3000/api/ops || echo "OPS FAILED - old backend still running?"

echo ""
echo "==> Done"
echo "Open: http://129.121.93.45"
