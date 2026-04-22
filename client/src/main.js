import './style.css';
import initLegacyAuth from './auth/legacyAuth.js';
import { clearAccountProfile, getSavedAccountProfile, saveAccountProfile } from './utils/storage.js';

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1624;

function buildShell() {
  const root = document.querySelector('#app');
  root.innerHTML = `
    <div class="app-frame" data-app-frame>
      <div class="game-shell">
        <section class="account-screen" data-account-screen>
          <div class="account-hero">
            <p class="account-eyebrow">账号中心</p>
            <h1>TempEx03</h1>
            <p class="account-description">
              当前项目只保留账号登录与注册。登录后，前端仅展示当前账号信息，所有游戏数据都由服务端管理。
            </p>
          </div>

          <div class="account-card" data-account-card>
            <p class="account-card-label">当前账号</p>
            <h2 data-account-name>未登录</h2>
            <p class="account-card-meta" data-account-meta>请先登录或注册新账号。</p>

            <div class="account-card-actions">
              <button class="sdk-secondary account-switch-button" type="button" data-switch-account>
                切换账号
              </button>
            </div>
          </div>
        </section>
        <div class="auth-layer" data-auth-layer></div>
      </div>
    </div>
  `;

  return {
    frame: root.querySelector('[data-app-frame]'),
    accountScreen: root.querySelector('[data-account-screen]'),
    accountName: root.querySelector('[data-account-name]'),
    accountMeta: root.querySelector('[data-account-meta]'),
    switchButton: root.querySelector('[data-switch-account]'),
    authLayer: root.querySelector('[data-auth-layer]'),
  };
}

function applyAppScale(appFrame) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scale = Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT);
  appFrame.style.setProperty('--app-scale', String(scale));
}

function updateAccountCard(ui, player) {
  if (!player) {
    ui.accountScreen.dataset.authenticated = 'false';
    ui.accountName.textContent = '未登录';
    ui.accountMeta.textContent = '请先登录或注册新账号。';
    return;
  }

  ui.accountScreen.dataset.authenticated = 'true';
  ui.accountName.textContent = player.nickname || player.account || '少侠';
  ui.accountMeta.textContent = `账号：${player.account || '未填写'}，当前仅保留账号相关信息。`;
}

function start() {
  const ui = buildShell();
  applyAppScale(ui.frame);
  window.addEventListener('resize', () => applyAppScale(ui.frame), { passive: true });
  ui.authLayer.classList.add('hidden');
  const savedAccount = getSavedAccountProfile();
  updateAccountCard(ui, savedAccount);

  const auth = initLegacyAuth({
    mount: ui.authLayer,
    onAuthenticated: (player) => {
      saveAccountProfile(player);
      updateAccountCard(ui, player);
      ui.authLayer.classList.add('hidden');
      auth.close();
    },
    onOpen: () => {
      ui.authLayer.classList.remove('hidden');
      ui.accountScreen.dataset.focused = 'false';
    },
  });

  window.__openLegacyAuth = () => auth.open();
  ui.switchButton.addEventListener('click', () => {
    clearAccountProfile();
    updateAccountCard(ui, null);
    auth.open();
  });

  if (!savedAccount.account) {
    auth.open();
    ui.accountScreen.dataset.focused = 'false';
  } else {
    ui.authLayer.classList.add('hidden');
    auth.close();
    ui.accountScreen.dataset.focused = 'true';
  }
}

start();
