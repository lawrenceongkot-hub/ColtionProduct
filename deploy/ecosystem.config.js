/**
 * PM2 Ecosystem Configuration for Coltion Production
 * 
 * Usage:
 *   pm2 start deploy/ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 */
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
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/coltion/error.log',
      out_file: '/var/log/coltion/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};