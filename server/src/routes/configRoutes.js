const express = require('express');
const { getChapterConfigPayload } = require('../services/chapterConfigService');

function createConfigRoutes() {
  const router = express.Router();

  router.get('/config/chapter', (req, res) => {
    try {
      res.json({
        ok: true,
        ...getChapterConfigPayload(),
      });
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
  createConfigRoutes,
};
