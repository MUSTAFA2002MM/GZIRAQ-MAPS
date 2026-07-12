# GZIRAQ MAPS

منصة خرائط وتوصيل عراقية (React + Express + PostgreSQL).

## تشغيل محلي

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## استضافة VPS

اتبع الدليل الكامل:

[deploy/VPS.md](deploy/VPS.md)

باختصار على السيرفر:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.production.example frontend/.env.production
chmod +x deploy/deploy.sh
./deploy/deploy.sh
# ثم اضبط Nginx من deploy/nginx.gziraq.conf
```

## متغيرات البيئة (Backend)

```
PORT=3000
JWT_SECRET=your-secret
DATABASE_URL=postgresql://...
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@gziraq.com
ADMIN_PASSWORD=Admin@123456
```
