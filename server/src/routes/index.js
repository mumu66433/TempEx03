const express = require('express');
const { createAuthRoutes } = require('./authRoutes');
const { createHealthRoutes } = require('./healthRoutes');

function createApiRouter() {
  const router = express.Router();

  router.use(createAuthRoutes());
  router.use(createHealthRoutes());

  return router;
}

module.exports = {
  createApiRouter,
};
