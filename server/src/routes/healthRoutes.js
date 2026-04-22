const express = require('express');
const { getHealthStatus } = require('../services/healthService');

function createHealthRoutes() {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json(getHealthStatus());
  });

  return router;
}

module.exports = {
  createHealthRoutes,
};
