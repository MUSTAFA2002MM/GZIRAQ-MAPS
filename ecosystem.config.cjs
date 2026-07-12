module.exports = {
  apps: [
    {
      name: "gziraq-maps",
      cwd: "./backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
