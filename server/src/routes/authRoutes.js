const express = require('express');
const { loginPlayer, registerPlayer } = require('../services/authService');

function createAuthRoutes() {
  const router = express.Router();

  router.post('/auth/register', async (req, res) => {
    try {
      const result = await registerPlayer({
        account: req.body?.account,
        password: req.body?.password,
      });

      res.status(201).json({
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

  router.post('/auth/login', async (req, res) => {
    try {
      const result = await loginPlayer({
        account: req.body?.account,
        password: req.body?.password,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      res.status(401).json({
        ok: false,
        error: error.message,
      });
    }
  });

  return router;
}

module.exports = {
  createAuthRoutes,
};
