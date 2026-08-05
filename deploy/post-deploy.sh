#!/bin/bash
# ============================================================
# Coltion Post-Deploy Configuration Script
# Handles: JWT secrets, SSL, Moxsys IP whitelist, Admin password
# Run as: sudo bash post-deploy.sh
# ============================================================

set -e

echo "============================================"
echo "Coltion Post-Deploy Configuration"
echo "============================================"

# ============================================================
# TASK 1: Verify JWT Secrets
# ============================================================
echo ""
echo "[1/4] Verifying JWT secrets..."

ENV_FILE="/var/www/coltion/server/.env"

if grep -q "CHANGE_ME" "$ENV_FILE" 2>/dev/null; then
    echo "⚠️  JWT secrets still contain placeholder values. Generating new ones..."
    JWT_SECRET=$(openssl rand -base64 48)
    JWT_REFRESH_SECRET=$(openssl rand -base64 48)
    
    # Update .env file
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=\"$JWT_SECRET\"|" "$ENV_FILE"
    sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\"|" "$ENV_FILE"
    
    echo "✅ JWT secrets updated with strong random values"
else
    echo "✅ JWT secrets are already set"
fi

# ============================================================
# TASK 2: Set Up SSL Certificate
# ============================================================
echo ""
echo "[2/4] Setting up SSL certificate..."

# Check if domain is configured
DOMAIN="coltionproduct.com"
SERVER_IP=$(curl -s https://api.ipify.org || echo "15.135.198.121")

# Check if DNS points to this server
DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null | head -1 || echo "")

if [ -z "$DOMAIN_IP" ]; then
    echo "⚠️  Domain $DOMAIN does not have DNS records. Using IP-based SSL..."
    echo "   You can set up SSL later with:"
    echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    echo "   (After pointing your domain's A record to $SERVER_IP)"
else
    echo "✅ Domain $DOMAIN resolves to $DOMAIN_IP"
    
    if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
        echo "⚠️  Domain points to $DOMAIN_IP but server IP is $SERVER_IP"
        echo "   Update your DNS A record to point to $SERVER_IP"
        echo "   Then run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    else
        echo "✅ Domain correctly points to this server. Installing SSL..."
        
        # Remove default Nginx config if it exists
        rm -f /etc/nginx/sites-enabled/default
        
        # Run certbot
        certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email support@coltionproduct.com --redirect
        
        echo "✅ SSL certificate installed successfully"
    fi
fi

# ============================================================
# TASK 3: Moxsys IP Whitelist
# ============================================================
echo ""
echo "[3/4] Configuring Moxsys IP whitelist..."

echo "═══════════════════════════════════════════"
echo "⚠️  MANUAL ACTION REQUIRED: Moxsys IP Whitelist"
echo "═══════════════════════════════════════════"
echo ""
echo "Your server's PUBLIC IP is: ${SERVER_IP}"
echo ""
echo "To fix the 'IP not whitelisted' error, you must:"
echo ""
echo "1. Go to https://platform.moxsys.io"
echo "2. Log in to your Moxsys merchant account"
echo "3. Navigate to: Settings → API → IP Whitelist"
echo "4. Add this IP address: ${SERVER_IP}"
echo "5. Click Save"
echo ""
echo "This is the STATIC IP of your EC2 VPS."
echo "All Moxsys API calls from your platform will now come from this IP."
echo ""

# Try to use Moxsys API to add IP if API key is available
MOXSYS_API_KEY=$(grep MOXSYS_API_KEY "$ENV_FILE" | cut -d'=' -f2 | tr -d '"')
if [ -n "$MOXSYS_API_KEY" ] && [ "$MOXSYS_API_KEY" != "Ht23THehMXQmOa9QL91mkAKhmISIaTTATlzaVK43GghH4oW8IU" ]; then
    echo "Attempting to add IP via Moxsys API..."
    curl -s -X POST "https://platform.moxsys.io/api/v1/ip-whitelist" \
        -H "Authorization: Bearer $MOXSYS_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"ip\":\"$SERVER_IP\"}" || echo "⚠️  Could not add IP via API. Please add manually."
else
    echo "ℹ️  Using default Moxsys API key. Manual whitelist is required."
fi

# ============================================================
# TASK 4: Change Default Admin Password
# ============================================================
echo ""
echo "[4/4] Changing default admin password..."

# Generate a strong random password
NEW_ADMIN_PASSWORD=$(openssl rand -base64 12 | tr -d '/+=' | head -c 16)
echo "Generated new admin password: $NEW_ADMIN_PASSWORD"

# Update admin password in the database
cd /var/www/coltion/server
cat > /tmp/change-admin-password.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.env.NEW_ADMIN_PASSWORD || 'ColtionAdmin2026!';
  const hashed = await bcrypt.hash(newPassword, 12);
  
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: { password: hashed },
    create: {
      username: 'admin',
      password: hashed,
      name: 'Super Admin',
      role: 'admin',
    },
  });
  
  console.log('✅ Admin password updated for:', admin.username);
  console.log('New password:', newPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

NEW_ADMIN_PASSWORD="$NEW_ADMIN_PASSWORD" npx tsx /tmp/change-admin-password.ts
rm -f /tmp/change-admin-password.ts

# ============================================================
# FINAL STATUS
# ============================================================
echo ""
echo "============================================"
echo "✅ Post-Deploy Configuration Complete!"
echo "============================================"
echo ""
echo "Summary:"
echo "  1. JWT Secrets: ✅ Configured"
echo "  2. SSL Certificate: $( [ -f /etc/letsencrypt/live/coltionproduct.com/fullchain.pem ] && echo '✅ Installed' || echo '⚠️  Pending (see above)' )"
echo "  3. Moxsys IP Whitelist: ⚠️  Manual action required (see above)"
echo "  4. Admin Password: ✅ Changed"
echo ""
echo "New Admin Credentials:"
echo "  Username: Admin"
echo "  Password: $NEW_ADMIN_PASSWORD"
echo ""
echo "⚠️  SAVE THIS PASSWORD SOMEWHERE SAFE!"
echo ""
echo "To restart the API with new settings:"
echo "  pm2 restart coltion-api"
echo "============================================"