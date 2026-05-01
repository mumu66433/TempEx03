const express = require('express');
const {
  getPlayerBattleSessionByAccount,
  settleBattleSession,
  simulateBattleSession,
  simulateBattleSessionStep,
  startBattleSession,
} = require('../services/battleSessionService');
const {
  confirmBattleSkillCandidate,
  getBattleSkillCandidates,
  refreshBattleSkillCandidates,
} = require('../services/battleSkillChoiceService');
const { getPlayerBuild } = require('../services/skillService');

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

  router.get('/battle/session/skill-candidates', async (req, res) => {
    try {
      const result = await getBattleSkillCandidates({
        account: req.query?.account,
        sessionId: req.query?.sessionId,
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

  router.post('/battle/session/skill-candidates/refresh', async (req, res) => {
    try {
      const result = await refreshBattleSkillCandidates({
        account: req.body?.account,
        sessionId: req.body?.sessionId,
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

  router.post('/battle/session/skill-candidates/confirm', async (req, res) => {
    try {
      const result = await confirmBattleSkillCandidate({
        account: req.body?.account,
        sessionId: req.body?.sessionId,
        candidateId: req.body?.candidateId,
        skillId: req.body?.skillId,
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

  router.get('/battle/session/build', async (req, res) => {
    try {
      const result = await getPlayerBuild({
        account: req.query?.account,
        sessionId: req.query?.sessionId,
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

  router.post('/battle/session/simulate-step', async (req, res) => {
    try {
      const result = await simulateBattleSessionStep({
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
