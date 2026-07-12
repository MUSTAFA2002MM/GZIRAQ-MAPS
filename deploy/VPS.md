# استضافة GZIRAQ MAPS على Bluehost VPS

**السيرفر:** `129.121.93.45`  
**الدومين:** `gziraq.com`  
**النظام:** Ubuntu 24.04

---

## قبل البدء (من جهازك)

تأكد أن آخر كود مرفوع على GitHub، لأن السيرفر يسحب من:

`https://github.com/MUSTAFA2002MM/GZIRAQ-MAPS.git`

إذا لم ترفع التعديلات بعد، ارفعها أولاً ثم نفّذ الخطوات أدناه.

---

## 1) الدخول للسيرفر

من PowerShell على جهازك:

```bash
ssh root@129.121.93.45
```

أو من لوحة Bluehost: **Launch Console** ثم سجّل الدخول كـ `root`.

---

## 2) تثبيت البرامج مرة واحدة

```bash
apt update
apt install -y nginx git curl ufw ca-certificates gnupg
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pm2

# Docker (لقاعدة PostgreSQL)
apt install -y docker.io docker-compose-v2
systemctl enable --now docker
```

---

## 3) رفع المشروع

```bash
mkdir -p /var/www
cd /var/www
rm -rf GZIRAQ-MAPS
git clone https://github.com/MUSTAFA2002MM/GZIRAQ-MAPS.git
cd GZIRAQ-MAPS
```

---

## 4) إعداد البيئة + قاعدة البيانات

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

ضع قيمًا قوية، مثال:

```env
PORT=3000
JWT_SECRET=غيّر-هذا-إلى-سري-طويل-عشوائي
DATABASE_URL=postgresql://gziraq:gziraq_password@127.0.0.1:5432/gziraq_maps
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@gziraq.com
ADMIN_PASSWORD=Admin@123456
```

ثم شغّل قاعدة البيانات وابنِ الموقع:

```bash
docker compose up -d db
cp frontend/.env.production.example frontend/.env.production
chmod +x deploy/deploy.sh
./deploy/deploy.sh
pm2 startup systemd -u root --hp /root
pm2 save
```

اختبار:

```bash
curl http://127.0.0.1:3000/api/health
```

---

## 5) ربط Nginx بـ gziraq.com

```bash
cp deploy/nginx.gziraq.conf /etc/nginx/sites-available/gziraq
ln -sf /etc/nginx/sites-available/gziraq /etc/nginx/sites-enabled/gziraq
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

افتح الآن: [http://129.121.93.45](http://129.121.93.45)

---

## 6) ربط الدومين gziraq.com

في لوحة الدومين (Bluehost DNS):

| Type | Name | Value           |
|------|------|-----------------|
| A    | @    | 129.121.93.45   |
| A    | www  | 129.121.93.45   |

انتظر انتشار DNS (دقائق إلى ساعات)، ثم:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d gziraq.com -d www.gziraq.com
```

بعدها الموقع يعمل على: **https://gziraq.com**

---

## تحديث لاحق

```bash
cd /var/www/GZIRAQ-MAPS
git pull
./deploy/deploy.sh
```
