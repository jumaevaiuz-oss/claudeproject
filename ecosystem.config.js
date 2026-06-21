module.exports = {
  apps: [
    {
      name: 'claudeproject-bot',
      script: 'src/bot.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
