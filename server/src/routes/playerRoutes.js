const express = require('express');
const { getPlayerProfileByAccount } = require('../services/authService');
const { getPlayerChapterOverview, updateCurrentChapter } = require('../services/playerProfileService');
const { getPlayerHomeOverview } = require('../services/playerHomeService');
const { getPlayerSkillList } = require('../services/skillService');

function createPlayerRoutes() {
  const router = express.Router();

  router.get('/player/profile', async (req, res) => {
    try {
      const result = await getPlayerProfileByAccount({
        account: req.query?.account,
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

  router.get('/player/home', async (req, res) => {
    try {
      const result = await getPlayerHomeOverview({
        account: req.query?.account,
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

  router.get('/player/chapters', async (req, res) => {
    try {
      const result = await getPlayerChapterOverview({
        account: req.query?.account,
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

  router.get('/player/skills', async (req, res) => {
    try {
      const result = await getPlayerSkillList({
        account: req.query?.account,
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

  router.patch('/player/current-chapter', async (req, res) => {
    try {
      const result = await updateCurrentChapter({
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

  return router;
}

module.exports = {
  createPlayerRoutes,
};
