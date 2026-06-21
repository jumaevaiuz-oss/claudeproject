module.exports = {
  apps: [
    {
      name: 'claudeproject-bot',
      script: 'src/bot.js',
      cwd: __dirname,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
