const http = require('http');
const { Server } = require('socket.io');
const { createApp } = require('./app');
const { registerSocketHandlers } = require('./realtime/socket');
const { host, port } = require('./config/env');
const { ensureDatabaseSchema } = require('./services/databaseInitService');

async function startServer() {
  await ensureDatabaseSchema();

  const app = createApp();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  registerSocketHandlers(io);

  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
  });

  return { app, server, io };
}

module.exports = {
  startServer,
};
