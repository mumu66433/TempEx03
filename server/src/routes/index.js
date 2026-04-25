const express = require('express');
const { createAuthRoutes } = require('./authRoutes');
const { createBattleRoutes } = require('./battleRoutes');
const { createConfigRoutes } = require('./configRoutes');
const { createHealthRoutes } = require('./healthRoutes');
const { createPlayerRoutes } = require('./playerRoutes');

function createApiRouter() {
  const router = express.Router();

  router.use(createAuthRoutes());
  router.use(createBattleRoutes());
  router.use(createConfigRoutes());
  router.use(createHealthRoutes());
  router.use(createPlayerRoutes());

  return router;
}

module.exports = {
  createApiRouter,
};
