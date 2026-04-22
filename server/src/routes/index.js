const express = require('express');
const { createAuthRoutes } = require('./authRoutes');
const { createConfigRoutes } = require('./configRoutes');
const { createHealthRoutes } = require('./healthRoutes');

function createApiRouter() {
  const router = express.Router();

  router.use(createAuthRoutes());
  router.use(createConfigRoutes());
  router.use(createHealthRoutes());

  return router;
}

module.exports = {
  createApiRouter,
};
