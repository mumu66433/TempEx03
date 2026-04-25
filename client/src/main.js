import * as Phaser from 'phaser';
import './style.css';
import initLegacyAuth from './auth/legacyAuth.js';
import { resolvePlayerChapterId } from './data/gameData.js';
import BootScene from './scenes/BootScene.js';
import LoginScene from './scenes/LoginScene.js';
import HomeScene from './scenes/HomeScene.js';
import SkillScene from './scenes/SkillScene.js';
import { getSavedPlayer, savePlayer } from './utils/storage.js';
import { GAME_HEIGHT, GAME_WIDTH } from './data/gameData.js';

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

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `请求失败(${response.status})`);
  }

  return payload;
}

async function fetchChapterConfig() {
  try {
    const payload = await requestJson('/api/config/chapter');
    return Array.isArray(payload.chapters) ? payload.chapters : [];
  } catch (error) {
    console.warn('[chapter-config] load failed:', error);
    return [];
  }
}

async function fetchPlayerProfile(account) {
  if (!account) {
    return null;
  }

  const query = new URLSearchParams({ account });
  const payload = await requestJson(`/api/player/profile?${query.toString()}`);
  return payload.profile || payload.player || null;
}

function normalizePlayer(player, chapters) {
  const base = player || {};
  const explicitChapterId = Number(base.currentChapterId ?? base.chapterId);
  const chapterId = Number.isInteger(explicitChapterId) && explicitChapterId > 0
    ? explicitChapterId
    : resolvePlayerChapterId(base, chapters);
  const highestUnlockedChapterId = Number(base.highestUnlockedChapterId);

  return {
    name: base.name || base.nickname || base.account || '少侠',
    nickname: base.nickname || base.name || base.account || '少侠',
    account: base.account || '',
    chapterId,
    currentChapterId: chapterId,
    highestUnlockedChapterId: Number.isInteger(highestUnlockedChapterId) && highestUnlockedChapterId > 0
      ? highestUnlockedChapterId
      : chapterId,
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
    scene: [BootScene, LoginScene, HomeScene, SkillScene],
  });
}

async function start() {
  const ui = buildShell();
  applyAppScale(ui.frame);
  window.addEventListener('resize', () => applyAppScale(ui.frame), { passive: true });

  const chapters = await fetchChapterConfig();
  window.__chapterConfigs = chapters;

  let game = null;
  const savedPlayer = getSavedPlayer();
  let effectivePlayer = savedPlayer;

  if (savedPlayer.account) {
    try {
      const remoteProfile = await fetchPlayerProfile(savedPlayer.account);
      if (remoteProfile) {
        effectivePlayer = remoteProfile;
      }
    } catch (error) {
      console.warn('[player-profile] restore failed:', error);
    }
  }

  const normalizedSavedPlayer = normalizePlayer(effectivePlayer, chapters);
  if (normalizedSavedPlayer.account) {
    savePlayer(normalizedSavedPlayer);
  }

  const auth = initLegacyAuth({
    mount: ui.authLayer,
    onAuthenticated: (player) => {
      const normalizedPlayer = normalizePlayer(player, chapters);
      savePlayer(normalizedPlayer);
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

  if (!normalizedSavedPlayer.account) {
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
