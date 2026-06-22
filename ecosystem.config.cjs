module.exports = {
  apps: [
    {
      name: 'bito-task',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
