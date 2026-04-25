const express = require('express');
const {
  getPlayerBattleSessionByAccount,
  settleBattleSession,
  simulateBattleSession,
  startBattleSession,
} = require('../services/battleSessionService');

function createBattleRoutes() {
  const router = express.Router();

  router.get('/battle/session', async (req, res) => {
    try {
      const session = await getPlayerBattleSessionByAccount({
        account: req.query?.account,
      });

      res.json({
        ok: true,
        session,
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error.message,
      });
    }
  });

  router.post('/battle/session/start', async (req, res) => {
    try {
      const result = await startBattleSession({
        account: req.body?.account,
        chapterId: req.body?.chapterId,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error.message,
      });
    }
  });

  router.post('/battle/session/settle', async (req, res) => {
    try {
      const result = await settleBattleSession({
        account: req.body?.account,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error.message,
      });
    }
  });

  router.post('/battle/session/simulate', async (req, res) => {
    try {
      const result = await simulateBattleSession({
        account: req.body?.account,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = {
  createBattleRoutes,
};
