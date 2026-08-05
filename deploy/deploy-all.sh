#!/bin/bash
# ============================================================
# Coltion Complete VPS Deployment - ONE SHOT
# Run as: sudo bash deploy-all.sh
# This installs everything, deploys the project, and verifies.
# ============================================================

set -e

echo "============================================"
echo "🚀 Coltion Complete VPS Deployment"
echo "============================================"
echo ""

# ============================================================
# PHASE 1: SYSTEM UPDATE
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[1/10] Updating system packages..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
apt-get update -y
apt-get upgrade -y

# ============================================================
# PHASE 2: INSTALL ESSENTIAL PACKAGES
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[2/10] Installing essential packages..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
apt-get install -y \
    curl wget git build-essential \
    nginx ufw certbot python3-certbot-nginx \
    redis-server htop net-tools unzip \
    ca-certificates gnupg lsb-release

# ============================================================
# PHASE 3: INSTALL NODE.JS 20 + PM2
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[3/10] Installing Node.js 20 and PM2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# ============================================================
# PHASE 4: CLONE PROJECT
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[4/10] Cloning Coltion project..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mkdir -p /var/www/coltion
mkdir -p /var/log/coltion
mkdir -p /var/www/certbot

cd /var/www/coltion

if [ ! -d ".git" ]; then
    echo "Cloning repository..."
    git clone https://github.com/lawrenceongkot-hub/ColtionProduct.git .
else
    echo "Repository exists. Pulling latest..."
    git pull origin main
fi

# ============================================================
# PHASE 5: INSTALL DEPENDENCIES
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[5/10] Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Frontend
cd /var/www/coltion
npm install

# Backend
cd /var/www/coltion/server
npm install
npx prisma generate

# ============================================================
# PHASE 6: CONFIGURE ENVIRONMENT
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[6/10] Configuring environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend .env
cat > /var/www/coltion/server/.env << 'EOF'
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_H5LdBgc6kTzw@ep-lively-truth-ax8o6uvw.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Secrets
JWT_SECRET="xwbyPDdPQKiTB7wqstMQs59ogF+eI/iQIAqR6Zuh2JnBcMH/JyVfcdES7x6tT7Bi"
JWT_REFRESH_SECRET="vtk+XAFePyTUWu3onEN7zP16yKJANk5rzLA2HA9z4mEsMyyD3X2z4nA/61y7NRY+"

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL="http://15.135.198.121"

# Moxsys
MOXSYS_API_KEY="Ht23THehMXQmOa9QL91mkAKhmISIaTTATlzaVK43GghH4oW8IU"
MOXSYS_MERCHANT_KEY="Letsgo"
MOXSYS_MODE="sandbox"
PAYMENT_GATEWAY_MODE="live"

# Google OAuth
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
EOF

# Frontend .env
cat > /var/www/coltion/.env << 'EOF'
VITE_API_URL="/api"
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
EOF

# ============================================================
# PHASE 7: DATABASE MIGRATION + SEED
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[7/10] Running database migration and seed..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /var/www/coltion/server
npx prisma db push --accept-data-loss
npx prisma generate
npx tsx src/seed.ts

# ============================================================
# PHASE 8: BUILD FRONTEND + BACKEND
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[8/10] Building frontend and backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Building frontend..."
cd /var/www/coltion
npm run build

echo "Building backend..."
cd /var/www/coltion/server
npm run build

# ============================================================
# PHASE 9: CONFIGURE NGINX + PM2
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[9/10] Configuring Nginx and PM2..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a simple Nginx config that works with IP (no domain)
cat > /etc/nginx/sites-available/coltion << 'NGINX'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json image/svg+xml;

    client_max_body_size 20M;

    # API - Reverse proxy to PM2 (port 3001)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # Frontend static files
    root /var/www/coltion/dist;
    index index.html;

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny hidden files
    location ~ /\. {
        deny all;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/coltion /etc/nginx/sites-enabled/coltion
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Start PM2
cd /var/www/coltion/server
pm2 start dist/index.js --name coltion-api
pm2 save
pm2 startup

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# ============================================================
# PHASE 10: FIREWALL + VERIFICATION
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[10/10] Configuring firewall and verifying..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# UFW
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw --force enable

# Wait for services to start
sleep 3

# ============================================================
# VERIFICATION
# ============================================================
echo ""
echo "============================================"
echo "✅ VERIFICATION"
echo "============================================"
echo ""

echo "━━━ PM2 STATUS ━━━"
pm2 status
echo ""

echo "━━━ NGINX STATUS ━━━"
systemctl status nginx --no-pager | head -5
echo ""

echo "━━━ OPEN PORTS ━━━"
ss -tulpn | grep -E ":(80|443|3001)" || echo "No matching ports found"
echo ""

echo "━━━ LOCAL TESTS ━━━"
echo "Testing http://localhost:"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://localhost || echo "  ❌ FAILED"
echo ""

echo "Testing http://127.0.0.1:3001/api/health:"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://127.0.0.1:3001/api/health || echo "  ❌ FAILED"
echo ""

echo "Testing http://127.0.0.1:3001:"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://127.0.0.1:3001 || echo "  ❌ FAILED"
echo ""

# Get public IP
PUBLIC_IP=$(curl -s https://api.ipify.org || echo "15.135.198.121")
echo "━━━ EXTERNAL TEST ━━━"
echo "Testing http://$PUBLIC_IP:"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" --connect-timeout 10 "http://$PUBLIC_IP" || echo "  ❌ FAILED - check AWS Security Group"
echo ""

echo "============================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "If all tests pass, your site is live at:"
echo "  http://$PUBLIC_IP"
echo ""
echo "Admin Login:"
echo "  Username: Admin"
echo "  Password: Ryeonbaal2004"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
echo "⚠️  Add $PUBLIC_IP to Moxsys IP whitelist!"
echo "============================================"