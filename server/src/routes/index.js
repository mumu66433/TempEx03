const express = require('express');
const { createAuthRoutes } = require('./authRoutes');
const { createHealthRoutes } = require('./healthRoutes');
const { createConfigRoutes } = require('./configRoutes');
const { createDbRoutes } = require('./dbRoutes');

function createApiRouter() {
  const router = express.Router();

  router.use(createAuthRoutes());
  router.use(createHealthRoutes());
  router.use(createConfigRoutes());
  router.use(createDbRoutes());

  return router;
}

module.exports = {
  createApiRouter,
};
