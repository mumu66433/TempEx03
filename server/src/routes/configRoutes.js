const express = require('express');
const { getGameConfigState } = require('../services/gameConfigService');
const appConfig = require('../config/appConfig');

function createConfigRoutes() {
  const router = express.Router();

  router.get('/config', (req, res) => {
    const state = getGameConfigState();

    res.json({
      loaded: state.loaded,
      error: state.error,
      sheetNames: state.sheetNames,
      server: appConfig.server,
    });
  });

  return router;
}

module.exports = {
  createConfigRoutes,
};
