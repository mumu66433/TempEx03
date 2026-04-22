const express = require('express');
const { pingDatabase } = require('../services/dbService');

function createDbRoutes() {
  const router = express.Router();

  router.get('/db/ping', async (req, res) => {
    try {
      await pingDatabase();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = {
  createDbRoutes,
};
