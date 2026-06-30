module.exports = {
  apps: [
    {
      name: 'interviews-api',
      script: 'apps/api/dist/index.js',
      cwd: '/home/ubuntu/interviews-tracker/current',
      instances: 1,
      exec_mode: 'fork',
      env_file: '/home/ubuntu/interviews-tracker-shared/.env.production',
      error_file: '/home/ubuntu/.pm2/logs/interviews-api-error.log',
      out_file: '/home/ubuntu/.pm2/logs/interviews-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: false,
      shutdown_with_message: false
    }
  ]
};
