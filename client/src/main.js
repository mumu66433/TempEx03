import * as Phaser from 'phaser';
import './style.css';
import initLegacyAuth from './auth/legacyAuth.js';
import { GAME_HEIGHT, GAME_WIDTH } from './data/gameData.js';
import { bootstrapSession, getCurrentPlayer, updateSessionAfterAuth } from './data/session.js';
import BootScene from './scenes/BootScene.js';
import LoginScene from './scenes/LoginScene.js';
import HomeScene from './scenes/HomeScene.js';
import SkillScene from './scenes/SkillScene.js';
import BattleScene from './scenes/BattleScene.js';

function applyAppScale(appFrame) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scale = Math.min(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);
  appFrame.style.setProperty('--app-scale', String(scale));
}

function buildShell() {
  const root = document.querySelector('#app');
  root.innerHTML = `
    <div class="app-frame" data-app-frame>
      <div class="game-shell">
        <div class="game-stage" data-game-stage></div>
        <div class="auth-layer" data-auth-layer></div>
      </div>
    </div>
  `;

  return {
    root,
    frame: root.querySelector('[data-app-frame]'),
    stage: root.querySelector('[data-game-stage]'),
    authLayer: root.querySelector('[data-auth-layer]'),
  };
}

function createGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    backgroundColor: 'transparent',
    scale: {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      mode: Phaser.Scale.NONE,
    },
    scene: [BootScene, LoginScene, HomeScene, SkillScene, BattleScene],
  });
}

async function start() {
  const ui = buildShell();
  applyAppScale(ui.frame);
  window.addEventListener('resize', () => applyAppScale(ui.frame), { passive: true });

  await bootstrapSession();
  let game = null;

  const auth = initLegacyAuth({
    mount: ui.authLayer,
    onAuthenticated: (player) => {
      updateSessionAfterAuth(player);
      ui.authLayer.classList.add('hidden');

      if (!game) {
        game = createGame(ui.stage);
        return;
      }

      game.scene.start('LoginScene');
    },
    onOpen: () => {
      ui.authLayer.classList.remove('hidden');
    },
  });

  window.__openLegacyAuth = () => auth.open();
  const hasAccount = Boolean(getCurrentPlayer().account);
  if (!hasAccount) {
    auth.open();
    return;
  }

  ui.authLayer.classList.add('hidden');
  auth.close();
  game = createGame(ui.stage);
}

start().catch((error) => {
  console.error('[app] failed to start', error);
});
