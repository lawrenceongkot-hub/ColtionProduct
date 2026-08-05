/**
 * PM2 Ecosystem Configuration for Coltion Production
 *
 * Usage:
 *   pm2 start deploy/ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 *
 * SECURITY: All secrets (including MOXSYS_API_KEY) are loaded from the backend
 * .env file via dotenv_path. Never hardcode secrets here.
 */
require('dotenv').config({ path: '/var/www/coltion/server/.env' });

module.exports = {
  apps: [
    {
      name: 'coltion-api',
      cwd: '/var/www/coltion/server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      watch: false,
      // Load environment variables from the backend .env (git-ignored)
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        // Moxsys production credentials are injected from server/.env via dotenv above.
        // Do NOT put MOXSYS_API_KEY here in plaintext.
        MOXSYS_MODE: 'live',
        PAYMENT_GATEWAY_MODE: 'live',
      },
      error_file: '/var/log/coltion/error.log',
      out_file: '/var/log/coltion/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};