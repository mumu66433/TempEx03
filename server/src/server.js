const http = require('http');
const { createApp } = require('./app');
const { host, port } = require('./config/env');
const { ensureDatabaseSchema } = require('./services/databaseInitService');

async function startServer() {
  await ensureDatabaseSchema();

  const app = createApp();
  const server = http.createServer(app);

  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });

  return { app, server };
}

module.exports = {
  startServer,
};
