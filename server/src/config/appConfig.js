const env = require('./env');

module.exports = {
  server: {
    host: env.host,
    port: env.port,
  },
};
