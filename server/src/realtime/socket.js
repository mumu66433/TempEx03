function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.emit('server:welcome', {
      socketId: socket.id,
      time: new Date().toISOString(),
    });

    socket.on('client:hello', (payload) => {
      socket.emit('server:echo', {
        received: payload,
        time: new Date().toISOString(),
      });
    });
  });
}

module.exports = {
  registerSocketHandlers,
};
