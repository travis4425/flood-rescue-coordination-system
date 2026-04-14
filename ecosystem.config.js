module.exports = {
  apps: [{
    name: 'flood-rescue-api',
    script: 'src/server.js',
    cwd: './backend',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    error_file: './backend/logs/pm2-error.log',
    out_file: './backend/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
