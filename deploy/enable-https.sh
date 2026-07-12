#!/usr/bin/env bash
set -euo pipefail

# Enables HTTPS with a self-signed certificate so browsers allow GPS.
# After running, open: https://129.121.93.45  (accept the browser warning once)

DOMAIN_OR_IP="${1:-129.121.93.45}"
CERT_DIR="/etc/nginx/ssl"
CRT="$CERT_DIR/gziraq.crt"
KEY="$CERT_DIR/gziraq.key"
SITE="/etc/nginx/sites-available/gziraq"

mkdir -p "$CERT_DIR"

if [ ! -f "$CRT" ] || [ ! -f "$KEY" ]; then
  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout "$KEY" \
    -out "$CRT" \
    -subj "/CN=$DOMAIN_OR_IP"
fi

cat > "$SITE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name gziraq.com www.gziraq.com 129.121.93.45;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name gziraq.com www.gziraq.com 129.121.93.45;

    ssl_certificate     $CRT;
    ssl_certificate_key $KEY;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
EOF

ln -sf "$SITE" /etc/nginx/sites-enabled/gziraq
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ufw allow 443 || true

echo "HTTPS enabled."
echo "Open: https://$DOMAIN_OR_IP"
echo "Accept the certificate warning once, then GPS auto-tracking will work."
