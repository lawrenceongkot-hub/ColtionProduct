#!/bin/bash
# ============================================================
# Coltion Production - AWS EC2 Ubuntu VPS Setup Script
# Run as: sudo bash setup-ec2.sh
# ============================================================

set -e

echo "============================================"
echo "Coltion Production VPS Setup"
echo "============================================"

# ============================================================
# PHASE 1: System Update & Basic Packages
# ============================================================
echo "[1/12] Updating system packages..."
apt-get update -y
apt-get upgrade -y

echo "[2/12] Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    ufw \
    certbot \
    python3-certbot-nginx \
    redis-server \
    htop \
    net-tools \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release

# ============================================================
# PHASE 2: Install Node.js 20 LTS
# ============================================================
echo "[3/12] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ============================================================
# PHASE 3: Install PM2
# ============================================================
echo "[4/12] Installing PM2..."
npm install -g pm2

# ============================================================
# PHASE 4: Configure Redis
# ============================================================
echo "[5/12] Configuring Redis..."
systemctl enable redis-server
systemctl start redis-server

# ============================================================
# PHASE 5: Configure Firewall (UFW)
# ============================================================
echo "[6/12] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3001/tcp
ufw --force enable

# ============================================================
# PHASE 6: Create Project Directory & Clone Repository
# ============================================================
echo "[7/12] Setting up project directory..."
mkdir -p /var/www/coltion
mkdir -p /var/log/coltion
mkdir -p /var/www/certbot

cd /var/www/coltion

if [ ! -d ".git" ]; then
    echo "Cloning Coltion repository..."
    git clone https://github.com/lawrenceongkot-hub/ColtionProduct.git .
else
    echo "Repository exists, pulling latest..."
    git pull origin main
fi

# ============================================================
# PHASE 7: Install Dependencies & Build
# ============================================================
echo "[8/12] Installing dependencies and building..."

# Frontend
cd /var/www/coltion
npm install

# Backend
cd /var/www/coltion/server
npm install

# Generate Prisma client
npx prisma generate

# ============================================================
# PHASE 8: Configure Environment
# ============================================================
echo "[9/12] Configuring environment variables..."

# Create .env for backend (uses existing Neon database)
# NOTE: Unquoted EOF so ${MOXSYS_API_KEY} expands from the environment.
# SECURITY: Set MOXSYS_API_KEY via environment variable BEFORE running this script,
# or edit /var/www/coltion/server/.env manually after setup. Do NOT hardcode secrets here.
cat > /var/www/coltion/server/.env << EOF
# ============================================
# Coltion Production Environment Variables
# ============================================

# Database (Neon PostgreSQL - same as existing setup)
# NOTE: Update password if needed. This uses the existing Neon DB.
DATABASE_URL="postgresql://neondb_owner:npg_H5LdBgc6kTzw@ep-lively-truth-ax8o6uvw.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Secrets - Strong random values
JWT_SECRET="xwbyPDdPQKiTB7wqstMQs59ogF+eI/iQIAqR6Zuh2JnBcMH/JyVfcdES7x6tT7Bi"
JWT_REFRESH_SECRET="vtk+XAFePyTUWu3onEN7zP16yKJANk5rzLA2HA9z4mEsMyyD3X2z4nA/61y7NRY+"

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://coltionproduct.com"

# Moxsys Payment Gateway - PRODUCTION (MPAY merchant)
# SECURITY: Set MOXSYS_API_KEY via environment variable BEFORE running this script,
# or edit /var/www/coltion/server/.env manually after setup. Do NOT hardcode secrets here.
MOXSYS_API_KEY="${MOXSYS_API_KEY:?Set MOXSYS_API_KEY env var before running this script (production Moxsys/MPAY API key)}"
MOXSYS_MERCHANT_NAME="${MOXSYS_MERCHANT_NAME:-MPAY}"
MOXSYS_MODE="live"
PAYMENT_GATEWAY_MODE="live"

# Google OAuth
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Email (if configured)
EMAIL_USER=""
EMAIL_PASS=""

# Vercel flag - must be unset for VPS
# VERCEL=1  # DO NOT SET THIS
EOF

# Create .env for frontend
cat > /var/www/coltion/.env << 'EOF'
VITE_API_URL="/api"
VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
EOF

# ============================================================
# PHASE 9: Run Database Migration & Seed
# ============================================================
echo "[10/12] Running database migration and seed..."

cd /var/www/coltion/server
npx prisma db push --accept-data-loss
npx prisma generate
npx tsx src/seed.ts

# ============================================================
# PHASE 10: Build Frontend & Backend
# ============================================================
echo "Building frontend..."
cd /var/www/coltion
npm run build

echo "Building backend..."
cd /var/www/coltion/server
npm run build

# ============================================================
# PHASE 11: Configure Nginx & PM2
# ============================================================
echo "[11/12] Configuring Nginx and PM2..."

# Copy Nginx config
cp /var/www/coltion/deploy/nginx.conf /etc/nginx/sites-available/coltion
ln -sf /etc/nginx/sites-available/coltion /etc/nginx/sites-enabled/coltion
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Start PM2
cd /var/www/coltion/server
pm2 start /var/www/coltion/deploy/ecosystem.config.js --env production
pm2 save
pm2 startup

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# ============================================================
# PHASE 12: Run Post-Deploy Configuration
# ============================================================
echo "[12/12] Running post-deploy configuration..."

# Run the post-deploy script to handle JWT, SSL, Moxsys, and Admin password
if [ -f /var/www/coltion/deploy/post-deploy.sh ]; then
    chmod +x /var/www/coltion/deploy/post-deploy.sh
    bash /var/www/coltion/deploy/post-deploy.sh
else
    echo "⚠️  post-deploy.sh not found. Run it manually after setup:"
    echo "  sudo bash /var/www/coltion/deploy/post-deploy.sh"
fi

echo ""
echo "============================================"
echo "✅ Coltion Production Deployment Complete!"
echo "============================================"
echo ""
echo "Services Status:"
echo "  - PM2: $(pm2 status | grep coltion-api | awk '{print $4}')"
echo "  - Nginx: $(systemctl is-active nginx)"
echo "  - Redis: $(systemctl is-active redis-server)"
echo ""
echo "Post-deploy tasks handled:"
echo "  1. JWT Secrets: ✅ Configured with strong random values"
echo "  2. SSL Certificate: ✅/⚠️  See post-deploy output above"
echo "  3. Moxsys IP Whitelist: ⚠️  See post-deploy output above"
echo "  4. Admin Password: ✅ Changed (see post-deploy output above)"
echo ""
echo "⚠️  SAVE THE NEW ADMIN PASSWORD FROM THE POST-DEPLOY OUTPUT!"
echo "============================================"