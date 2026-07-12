#!/usr/bin/env bash
set -euo pipefail

# Fixes browser "Not secure" by enabling real HTTPS with Let's Encrypt.
# REQUIREMENT: DNS A record for gziraq.com must point to this server IP (not Cloudflare proxy).
# Recommended: Cloudflare DNS -> A @ = SERVER_IP , Proxy status = DNS only (grey cloud)

DOMAIN="${1:-gziraq.com}"
EMAIL="${2:-admin@gziraq.com}"
SERVER_IP="$(curl -4 -fsS ifconfig.me || hostname -I | awk '{print $1}')"

echo "==> Server public IP: $SERVER_IP"
echo "==> Checking DNS for $DOMAIN ..."
DOMAIN_IP="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | head -n1 || true)"
echo "==> $DOMAIN resolves to: ${DOMAIN_IP:-unknown}"

if [ -z "${DOMAIN_IP:-}" ] || [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
  echo ""
  echo "DNS is NOT pointing to this VPS yet."
  echo "In Cloudflare / domain DNS set:"
  echo "  Type: A"
  echo "  Name: @"
  echo "  Value: $SERVER_IP"
  echo "  Proxy: DNS only (grey cloud)"
  echo "Also add www A record to the same IP."
  echo ""
  echo "After DNS updates (5-30 minutes), run this script again:"
  echo "  bash deploy/fix-https.sh"
  echo ""
  echo "Meanwhile enabling temporary HTTPS on the IP (self-signed)..."
  bash "$(dirname "$0")/enable-https.sh" "$SERVER_IP"
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive
apt update
apt install -y nginx certbot python3-certbot-nginx

# Ensure HTTP nginx site exists for ACME challenge
cat > /etc/nginx/sites-available/gziraq <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/gziraq /etc/nginx/sites-enabled/gziraq
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ufw allow 80 || true
ufw allow 443 || true

certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" --redirect

nginx -t
systemctl reload nginx

echo ""
echo "HTTPS is ready with a trusted certificate."
echo "Open: https://$DOMAIN"
echo "The red 'Not secure' warning should be gone."
