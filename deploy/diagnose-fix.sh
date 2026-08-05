#!/bin/bash
# ============================================================
# Coltion VPS Diagnostic & Auto-Fix Script
# Run as: sudo bash diagnose-fix.sh
# This will diagnose and fix ERR_CONNECTION_REFUSED
# ============================================================

set -e

echo "============================================"
echo "🔍 Coltion VPS Diagnostic & Auto-Fix"
echo "============================================"
echo ""

# ============================================================
# 1. CHECK PM2 STATUS
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 1. PM2 STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 status || echo "PM2 is not installed or not running"
echo ""

# ============================================================
# 2. CHECK NGINX STATUS
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 2. NGINX STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
systemctl status nginx || echo "Nginx is not installed or not running"
echo ""

# ============================================================
# 3. CHECK OPEN PORTS
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 3. OPEN PORTS (ss -tulpn)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ss -tulpn || netstat -tulpn || echo "Neither ss nor netstat available"
echo ""

# ============================================================
# 4. CHECK NGINX CONFIG
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 4. NGINX CONFIG TEST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
nginx -t 2>&1 || echo "Nginx config test failed"
echo ""

# ============================================================
# 5. CHECK PM2 LOGS
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 5. PM2 LOGS (last 50 lines)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 logs coltion-api --lines 50 --nostream 2>&1 || echo "No PM2 logs available"
echo ""

# ============================================================
# 6. CHECK SYSTEM LOGS
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 6. SYSTEM LOGS (nginx errors)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
journalctl -u nginx --no-pager -n 30 2>&1 || echo "No journalctl logs"
echo ""

# ============================================================
# 7. CHECK UFW FIREWALL
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 7. UFW FIREWALL STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ufw status verbose 2>&1 || echo "UFW not installed"
echo ""

# ============================================================
# 8. CHECK AWS SECURITY GROUP (via AWS CLI if available)
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 8. AWS SECURITY GROUP CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v aws &> /dev/null; then
    aws ec2 describe-security-groups --group-ids i-0a016590c56322c28 2>&1 || echo "AWS CLI not configured"
else
    echo "AWS CLI not installed. Check Security Group manually:"
    echo "  - Go to AWS Console → EC2 → Security Groups"
    echo "  - Ensure inbound rules allow:"
    echo "    - TCP 80 from 0.0.0.0/0"
    echo "    - TCP 443 from 0.0.0.0/0"
    echo "    - TCP 22 from your IP"
    echo "    - TCP 3001 from 0.0.0.0/0 (optional)"
fi
echo ""

# ============================================================
# 9. TEST LOCAL CONNECTIONS
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 9. LOCAL CONNECTION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing http://localhost:"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://localhost 2>&1 || echo "  ❌ FAILED - Nginx not responding on port 80"
echo ""

echo "Testing http://127.0.0.1:"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://127.0.0.1 2>&1 || echo "  ❌ FAILED - Nginx not responding on port 80"
echo ""

echo "Testing http://127.0.0.1:3001 (backend):"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://127.0.0.1:3001/api/health 2>&1 || echo "  ❌ FAILED - Backend not responding on port 3001"
echo ""

echo "Testing http://127.0.0.1:3001 (root):"
curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://127.0.0.1:3001 2>&1 || echo "  ❌ FAILED - Backend not responding"
echo ""

# ============================================================
# 10. AUTO-FIX SECTION
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 10. AUTO-FIX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Fix 1: Ensure Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update -y
    apt-get install -y nginx
fi

# Fix 2: Ensure Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "Starting Nginx..."
    systemctl start nginx
    systemctl enable nginx
fi

# Fix 3: Ensure Nginx config is correct
if [ -f /etc/nginx/sites-available/coltion ]; then
    echo "Nginx config exists. Testing..."
    nginx -t 2>&1
    if ! nginx -t 2>&1 | grep -q "successful"; then
        echo "Nginx config has errors. Replacing with correct config..."
        cp /var/www/coltion/deploy/nginx.conf /etc/nginx/sites-available/coltion
        ln -sf /etc/nginx/sites-available/coltion /etc/nginx/sites-enabled/coltion
        rm -f /etc/nginx/sites-enabled/default
        nginx -t 2>&1
    fi
else
    echo "Creating Nginx config..."
    mkdir -p /etc/nginx/sites-available
    cp /var/www/coltion/deploy/nginx.conf /etc/nginx/sites-available/coltion
    ln -sf /etc/nginx/sites-available/coltion /etc/nginx/sites-enabled/coltion
    rm -f /etc/nginx/sites-enabled/default
    nginx -t 2>&1
fi

# Fix 4: Ensure PM2 is running the backend
if ! pm2 describe coltion-api &> /dev/null; then
    echo "Starting backend with PM2..."
    cd /var/www/coltion/server
    pm2 start /var/www/coltion/deploy/ecosystem.config.js --env production
    pm2 save
else
    echo "PM2 process exists. Checking status..."
    PM2_STATUS=$(pm2 status coltion-api | grep coltion-api | awk '{print $4}')
    if [ "$PM2_STATUS" != "online" ]; then
        echo "PM2 process is $PM2_STATUS. Restarting..."
        pm2 restart coltion-api
    else
        echo "PM2 process is online ✅"
    fi
fi

# Fix 5: Ensure UFW allows port 80
echo "Configuring UFW..."
ufw allow 80/tcp 2>&1 || true
ufw allow 443/tcp 2>&1 || true
ufw allow 3001/tcp 2>&1 || true
ufw allow OpenSSH 2>&1 || true
ufw --force enable 2>&1 || true

# Fix 6: Restart Nginx to apply changes
echo "Restarting Nginx..."
systemctl restart nginx

# Fix 7: Check if backend is listening on 3001
echo "Checking backend port..."
if ss -tlnp | grep -q ":3001"; then
    echo "Backend is listening on port 3001 ✅"
else
    echo "Backend is NOT listening on port 3001. Checking PM2 logs..."
    pm2 logs coltion-api --lines 30 --nostream 2>&1
    echo "Attempting to restart backend..."
    pm2 restart coltion-api
    sleep 3
    if ss -tlnp | grep -q ":3001"; then
        echo "Backend is now listening on port 3001 ✅"
    else
        echo "❌ Backend still not listening. Check the logs above."
    fi
fi

# ============================================================
# FINAL VERIFICATION
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FINAL VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "PM2 Status:"
pm2 status
echo ""

echo "Nginx Status:"
systemctl status nginx --no-pager | head -5
echo ""

echo "Open Ports:"
ss -tulpn | grep -E ":(80|443|3001)" || echo "No matching ports found"
echo ""

echo "Local Test:"
curl -s -o /dev/null -w "  http://localhost → HTTP %{http_code}\n" http://localhost 2>&1 || echo "  ❌ http://localhost FAILED"
curl -s -o /dev/null -w "  http://127.0.0.1:3001/api/health → HTTP %{http_code}\n" http://127.0.0.1:3001/api/health 2>&1 || echo "  ❌ Backend FAILED"
echo ""

# Get public IP
PUBLIC_IP=$(curl -s https://api.ipify.org || echo "15.135.198.121")
echo "Public IP: $PUBLIC_IP"
echo ""

echo "═══════════════════════════════════════════"
echo "⚠️  IMPORTANT: AWS SECURITY GROUP CHECK"
echo "═══════════════════════════════════════════"
echo ""
echo "If local tests pass but http://$PUBLIC_IP still fails,"
echo "the issue is the AWS Security Group. You must:"
echo ""
echo "1. Go to AWS Console → EC2 → Security Groups"
echo "2. Find the security group attached to instance i-0a016590c56322c28"
echo "3. Edit inbound rules and ADD:"
echo "   - Type: HTTP, Port: 80, Source: 0.0.0.0/0"
echo "   - Type: HTTPS, Port: 443, Source: 0.0.0.0/0"
echo "   - Type: SSH, Port: 22, Source: Your IP"
echo "4. Save rules"
echo ""
echo "This is the MOST COMMON cause of ERR_CONNECTION_REFUSED"
echo "on AWS EC2 - the security group blocks inbound traffic."
echo "═══════════════════════════════════════════"
echo ""
echo "Done! If the issue persists, check the AWS Security Group."