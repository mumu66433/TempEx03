const { startServer } = require('./server');

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
