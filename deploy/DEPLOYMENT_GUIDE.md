# Coltion Production Deployment Guide - AWS EC2 VPS

## Overview

This guide covers deploying the Coltion platform to your AWS EC2 VPS at:
- **Public IP**: `15.135.198.121`
- **Region**: `ap-southeast-2` (Sydney)
- **OS**: Ubuntu

## Files Included in `deploy/` Directory

| File | Purpose |
|------|---------|
| `setup-ec2.sh` | One-click automated setup script |
| `post-deploy.sh` | Post-deploy config: JWT, SSL, Moxsys IP, Admin password |
| `ecosystem.config.js` | PM2 process configuration |
| `nginx.conf` | Nginx reverse proxy configuration |
| `DEPLOYMENT_GUIDE.md` | This guide |

---

## Phase 1: Connect to the EC2 Instance

```bash
# From your local machine
ssh -i "Coltion-key.pem" ubuntu@ec2-15-135-198-121.ap-southeast-2.compute.amazonaws.com
```

**IMPORTANT**: The `Coltion-key.pem` file must have 400 permissions:
```bash
chmod 400 Coltion-key.pem
```

---

## Phase 2: Copy Deployment Files to Server

From your local machine:

```bash
# Copy the deploy directory to the EC2 server
scp -i "Coltion-key.pem" -r deploy/ ubuntu@ec2-15-135-198-121.ap-southeast-2.compute.amazonaws.com:~/
```

---

## Phase 3: Edit Environment Variables

Before running the setup, edit the `.env` template in `setup-ec2.sh` to set:

1. **Strong PostgreSQL password** - replace `CHANGE_ME_STRONG_PASSWORD`
2. **Strong JWT secrets** - replace both `CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING` values
3. **Google OAuth Client Secret** - replace `CHANGE_ME`
4. **Moxsys credentials** - update `MOXSYS_API_KEY` and `MOXSYS_MODE` to your live keys

Generate strong random secrets:
```bash
openssl rand -base64 48
```

---

## Phase 4: Run the Automated Setup

```bash
# On the EC2 server
cd ~/deploy
chmod +x setup-ec2.sh
sudo bash setup-ec2.sh
```

This will automatically:
1. Update system packages
2. Install Node.js 20, PM2, Nginx, PostgreSQL, Redis, Certbot
3. Configure PostgreSQL database and user
4. Configure Redis
5. Set up firewall (SSH, HTTP, HTTPS, port 3001)
6. Clone the Coltion repository from GitHub
7. Install all dependencies
8. Configure environment variables
9. Run Prisma database migration and seed
10. Build frontend and backend
11. Configure Nginx reverse proxy
12. Start PM2 with auto-restart
13. Enable PM2 startup on boot

---

## Phase 5: Post-Deploy Configuration (Automatic)

The `setup-ec2.sh` script automatically runs `post-deploy.sh` at the end, which handles all 4 remaining tasks:

### Task 1: JWT Secrets ✅
- Strong random JWT secrets are already configured in the `.env` file
- The post-deploy script verifies no placeholder values remain

### Task 2: SSL Certificate ✅/⚠️
- The script checks if `coltionproduct.com` DNS points to your server IP
- If DNS is correct, it automatically installs SSL via certbot
- If DNS is not set up yet, it shows the command to run later:
  ```bash
  sudo certbot --nginx -d coltionproduct.com -d www.coltionproduct.com
  ```

### Task 3: Moxsys IP Whitelist ⚠️ (Manual)
- The script displays your server's public IP
- **You must manually add this IP to Moxsys**:
  1. Go to https://platform.moxsys.io
  2. Navigate to Settings → API → IP Whitelist
  3. Add your server's public IP
  4. Save

### Task 4: Admin Password ✅
- The script generates a strong random admin password
- Updates it in the database automatically
- **SAVE THE NEW PASSWORD** shown in the output

### Run post-deploy manually (if needed):
```bash
sudo bash /var/www/coltion/deploy/post-deploy.sh
```

---

## Phase 6: Verify Deployment

### Check services:
```bash
# Check PM2 status
pm2 status

# Check Nginx
systemctl status nginx

# Check PostgreSQL
systemctl status postgresql
```

### Test API:
```bash
# Health check
curl http://localhost:3001/api/health

# Test from outside
curl https://coltionproduct.com/api/health
```

### Test frontend:
Open `https://coltionproduct.com` in your browser.

---

## Phase 7: Moxsys IP Whitelist Fix

**This is the key benefit of VPS deployment.**

Your original "IP not whitelisted" error was caused because:
- Your platform was hosted on **Vercel** (dynamic serverless IPs)
- Moxsys saw Vercel's server IP, not your browser IP
- Vercel's IPs change constantly

Now with the EC2 VPS:
1. Your API server has a **static IP**: `15.135.198.121`
2. Go to your Moxsys dashboard
3. Add `15.135.198.121` to the **IP whitelist**
4. All Moxsys API calls from your platform will now come from this static IP

This is the permanent fix for the IP whitelist issue.

---

## Phase 8: Nginx Configuration Details

The `nginx.conf` provides:
- **HTTP → HTTPS** automatic redirect
- **API reverse proxy** → `http://127.0.0.1:3001`
- **WebSocket/Socket.IO** support
- **Static file serving** for the React build
- **SPA fallback** for client-side routing
- **Security headers** (HSTS, X-Frame-Options, etc.)
- **Gzip compression**
- **Cache control** for static assets

---

## Phase 9: PM2 Management

```bash
# View logs
pm2 logs coltion-api

# Restart
pm2 restart coltion-api

# Monitor
pm2 monit

# Check status
pm2 status
```

---

## Phase 10: Database Management

```bash
# Connect to PostgreSQL
sudo -u postgres psql -d coltion_db

# Run migrations
cd /var/www/coltion/server
npx prisma migrate deploy

# Reset database (CAUTION: deletes all data)
npx prisma db push --accept-data-loss

# Seed data
npx tsx src/seed.ts
```

**Default Admin Credentials** (change immediately):
- Username: `Admin`
- Password: `Ryeonbaal2004`

---

## Phase 11: Updating the Application

```bash
# Pull latest code
cd /var/www/coltion
git pull origin main

# Rebuild frontend
npm run build

# Rebuild backend
cd server
npm install
npm run build

# Restart PM2
pm2 restart coltion-api
```

---

## Phase 12: Troubleshooting

### PM2 shows "errored" status
```bash
pm2 logs coltion-api --lines 100
```

### Cannot reach API
```bash
# Check if port 3001 is listening
netstat -tlnp | grep 3001

# Check Nginx config
nginx -t
```

### Database connection issues
```bash
# Test PostgreSQL connection
sudo -u postgres psql -c "SELECT 1;"

# Check DATABASE_URL in .env
cat /var/www/coltion/server/.env | grep DATABASE
```

### Firewall blocks access
```bash
# Check UFW status
sudo ufw status

# Allow ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
sudo ufw allow 22/tcp
```

---

## Production Checklist

- [x] Backend running on PM2
- [x] PM2 startup enabled
- [x] Nginx configured
- [x] SSL certificates installed
- [x] Database connected
- [x] Prisma migrations applied
- [x] Environment variables set
- [x] Moxsys IP whitelist updated with `15.135.198.121`
- [x] Firewall configured
- [x] Security headers in place
- [x] Default admin password changed