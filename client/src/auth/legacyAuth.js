const API_BASE = '/api';
const STORAGE_KEY = 'temp_ex03_account_history';
const DEFAULT_PASSWORD = '123456';
const MAX_HISTORY = 8;

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const account = String(entry.account || '').trim();
  const password = String(entry.password || '');
  if (!account || !password) {
    return null;
  }

  return {
    account,
    password,
    nickname: String(entry.nickname || '').trim(),
    lastLoginAt: String(entry.lastLoginAt || ''),
  };
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeHistoryEntry).filter(Boolean);
    }

    const single = normalizeHistoryEntry(parsed);
    return single ? [single] : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function upsertHistory(credentials, player) {
  const entry = normalizeHistoryEntry({
    account: player?.account || credentials.account,
    password: credentials.password,
    nickname: player?.nickname || credentials.account,
    lastLoginAt: new Date().toISOString(),
  });

  if (!entry) {
    return [];
  }

  const history = loadHistory().filter((item) => item.account !== entry.account);
  const next = [entry, ...history].slice(0, MAX_HISTORY);
  saveHistory(next);
  return next;
}

function removeHistoryAccount(account) {
  const next = loadHistory().filter((item) => item.account !== account);
  saveHistory(next);
  return next;
}

function generateClientAccount() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `P${stamp}${random}`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
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

function $(root, selector) {
  return root.querySelector(selector);
}

function $all(root, selector) {
  return Array.from(root.querySelectorAll(selector));
}

function setStatus(ui, text, tone = 'neutral') {
  ui.status.textContent = text;
  ui.status.dataset.tone = tone;
}

function setActiveTab(ui, mode) {
  ui.root.dataset.mode = mode;
  $all(ui.root, '[data-tab]').forEach((button) => {
    const isActive = button.dataset.tab === mode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  ui.loginForm.hidden = mode !== 'login';
  ui.registerForm.hidden = mode !== 'register';
  ui.loginForm.classList.toggle('hidden', mode !== 'login');
  ui.registerForm.classList.toggle('hidden', mode !== 'register');
}

function setHistoryPanelState(ui, open) {
  const hasHistory = loadHistory().length > 0;
  const isOpen = Boolean(open) && hasHistory;

  ui.historyToggle.disabled = !hasHistory;
  ui.historyToggle.setAttribute('aria-expanded', String(isOpen));
  ui.historyPanel.dataset.open = String(isOpen);
  ui.historyPanel.hidden = !isOpen;
  ui.historyPanel.classList.toggle('hidden', !isOpen);
}

function renderHistory(ui, selectedAccount = '') {
  const history = loadHistory();
  ui.historyList.innerHTML = '';

  if (!history.length) {
    setHistoryPanelState(ui, false);
    return history;
  }

  for (const entry of history) {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.dataset.account = entry.account;
    row.dataset.active = String(entry.account === (selectedAccount || history[0].account));
    row.innerHTML = `
      <button type="button" class="history-main" data-history-account="${entry.account}">
        <span class="history-account">${entry.account}</span>
        <span class="history-meta">${entry.nickname && entry.nickname !== entry.account ? entry.nickname : '本地账号'}</span>
      </button>
      <button type="button" class="history-delete" data-history-delete="${entry.account}" aria-label="删除 ${entry.account}">×</button>
    `;
    ui.historyList.appendChild(row);
  }

  const active = history.find((item) => item.account === (selectedAccount || history[0].account)) || history[0];
  ui.loginAccount.value = active.account;
  ui.loginPassword.value = active.password;
  setHistoryPanelState(ui, ui.historyPanel.dataset.open === 'true');
  return history;
}

function syncLoginFromHistory(ui, account) {
  const history = loadHistory();
  const entry = history.find((item) => item.account === account) || history[0];
  if (!entry) {
    ui.loginAccount.value = '';
    ui.loginPassword.value = '';
    return;
  }

  ui.loginAccount.value = entry.account;
  ui.loginPassword.value = entry.password;
  $all(ui.root, '[data-history-account]').forEach((button) => {
    const row = button.closest('.history-item');
    if (row) {
      row.dataset.active = String(row.dataset.account === entry.account);
    }
  });
}

function togglePasswordVisibility(input, button) {
  const isVisible = input.type === 'text';
  input.type = isVisible ? 'password' : 'text';
  button.textContent = isVisible ? '👁' : '🙈';
  button.setAttribute('aria-label', isVisible ? '显示密码' : '隐藏密码');
  button.setAttribute('aria-pressed', String(!isVisible));
}

function updateLoginInputDefaults(ui, credentials) {
  ui.loginAccount.value = credentials.account || '';
  ui.loginPassword.value = credentials.password || '';
}

function prepareRegisterForm(ui) {
  ui.registerAccount.value = generateClientAccount();
  ui.registerPassword.value = DEFAULT_PASSWORD;
  ui.registerAccount.focus();
}

function buildShell(mount) {
  mount.innerHTML = `
    <div class="sdk-backdrop" data-login-overlay>
      <div class="sdk-panel">
        <div class="sdk-title-row">
          <div>
            <p class="sdk-eyebrow">账号中心</p>
            <h2>TempEx03</h2>
          </div>
          <span class="sdk-version">v1</span>
        </div>

        <p class="sdk-description">登录和注册在同一个界面中切换。注册时会自动生成用户名，默认密码统一为 123456。</p>

        <div class="sdk-tabs">
          <button class="sdk-tab is-active" type="button" data-tab="login">登录</button>
          <button class="sdk-tab" type="button" data-tab="register">注册</button>
        </div>

        <div class="sdk-status" data-status>正在初始化...</div>

        <form class="sdk-form" data-login-form data-view="login">
          <div class="account-history-wrap">
            <label>
              <span>账号</span>
              <div class="field-row">
                <input name="account" autocomplete="username" placeholder="请输入账号" data-login-account />
                <button class="icon-button" type="button" data-history-toggle aria-expanded="false" aria-label="展开历史账号">▾</button>
              </div>
            </label>

            <div class="history-panel hidden" data-history-panel>
              <div class="history-head">
                <span>历史账号</span>
                <span class="history-hint">点击可填入，右侧可删除</span>
              </div>
              <div class="history-list" data-history-list></div>
            </div>
          </div>

          <label>
            <span>密码</span>
            <div class="field-row">
              <input name="password" type="password" autocomplete="current-password" placeholder="默认 123456" data-login-password />
              <button class="icon-button" type="button" data-login-password-toggle aria-pressed="false" aria-label="显示密码">👁</button>
            </div>
          </label>

          <button class="sdk-primary" type="submit">登录</button>
        </form>

        <form class="sdk-form hidden" data-register-form data-view="register">
          <label>
            <span>用户名</span>
            <div class="input-with-action">
              <input name="account" autocomplete="username" data-register-account />
              <button class="mini-action" type="button" data-generate-account>换一个</button>
            </div>
          </label>

          <label>
            <span>密码</span>
            <div class="field-row">
              <input name="password" type="password" autocomplete="new-password" data-register-password />
              <button class="icon-button" type="button" data-register-password-toggle aria-pressed="false" aria-label="显示密码">👁</button>
            </div>
          </label>

          <button class="sdk-secondary" type="submit">注册账号</button>
        </form>

        <p class="sdk-footnote">注册成功后会自动登录，账号信息会保存到本机，方便下次快速填充。</p>
      </div>
    </div>
  `;

  return {
    root: mount,
    overlay: $(mount, '[data-login-overlay]'),
    status: $(mount, '[data-status]'),
    loginForm: $(mount, '[data-login-form]'),
    registerForm: $(mount, '[data-register-form]'),
    loginAccount: $(mount, '[data-login-account]'),
    loginPassword: $(mount, '[data-login-password]'),
    loginPasswordToggle: $(mount, '[data-login-password-toggle]'),
    historyToggle: $(mount, '[data-history-toggle]'),
    historyPanel: $(mount, '[data-history-panel]'),
    historyList: $(mount, '[data-history-list]'),
    registerAccount: $(mount, '[data-register-account]'),
    registerPassword: $(mount, '[data-register-password]'),
    registerPasswordToggle: $(mount, '[data-register-password-toggle]'),
    generateAccount: $(mount, '[data-generate-account]'),
  };
}

function wireLoginForm(ui, onAuthenticated) {
  ui.historyToggle.addEventListener('click', () => {
    if (ui.historyToggle.disabled) {
      return;
    }

    const open = ui.historyPanel.dataset.open !== 'true';
    ui.historyPanel.dataset.open = String(open);
    setHistoryPanelState(ui, open);
    if (open) {
      renderHistory(ui, ui.loginAccount.value.trim());
    }
  });

  ui.historyList.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const selectButton = target?.closest('[data-history-account]');
    const deleteButton = target?.closest('[data-history-delete]');

    if (deleteButton) {
      const account = deleteButton.dataset.historyDelete;
      const history = removeHistoryAccount(account);
      const nextAccount = history[0]?.account || '';
      renderHistory(ui, nextAccount);
      ui.historyPanel.dataset.open = String(history.length > 0);
      setHistoryPanelState(ui, history.length > 0);

      if (nextAccount) {
        syncLoginFromHistory(ui, nextAccount);
        setStatus(ui, `已删除 ${account}，当前切换到 ${nextAccount}。`, 'info');
      } else {
        ui.loginAccount.value = '';
        ui.loginPassword.value = '';
        setStatus(ui, `已删除 ${account}。`, 'info');
      }
      return;
    }

    if (selectButton) {
      const account = selectButton.dataset.historyAccount;
      syncLoginFromHistory(ui, account);
      ui.historyPanel.dataset.open = 'false';
      setHistoryPanelState(ui, false);
    }
  });

  ui.loginPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(ui.loginPassword, ui.loginPasswordToggle);
  });

  ui.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const account = ui.loginAccount.value.trim();
    const password = ui.loginPassword.value;

    if (!account || !password) {
      setStatus(ui, '请输入账号和密码', 'error');
      return;
    }

    setStatus(ui, '正在登录...', 'info');
    try {
      const result = await requestJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ account, password }),
      });

      upsertHistory({ account, password }, result.player);
      renderHistory(ui, result.player.account);
      setStatus(ui, `已登录：${result.player.nickname || result.player.account}`, 'success');
      onAuthenticated(result.profile || result.player);
    } catch (error) {
      setStatus(ui, error.message, 'error');
    }
  });
}

function wireRegisterForm(ui, onAuthenticated) {
  ui.registerPasswordToggle.addEventListener('click', () => {
    togglePasswordVisibility(ui.registerPassword, ui.registerPasswordToggle);
  });

  ui.generateAccount.addEventListener('click', () => {
    ui.registerAccount.value = generateClientAccount();
    ui.registerAccount.focus();
  });

  ui.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const account = ui.registerAccount.value.trim();
    const password = ui.registerPassword.value || DEFAULT_PASSWORD;
    setStatus(ui, '正在注册...', 'info');

    if (!account) {
      setStatus(ui, '请输入或生成一个用户名', 'error');
      return;
    }

    try {
      const result = await requestJson('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ account, password }),
      });

      const credentials = {
        account: result.player.account,
        password,
      };

      ui.registerPassword.value = password;
      updateLoginInputDefaults(ui, credentials);
      setStatus(ui, `注册成功，账号：${result.player.account}`, 'success');

      const loginResult = await requestJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      upsertHistory(credentials, loginResult.player);
      renderHistory(ui, loginResult.player.account);
      onAuthenticated(loginResult.profile || loginResult.player);
    } catch (error) {
      setStatus(ui, error.message, 'error');
    }
  });
}

function setInitialState(ui) {
  const history = loadHistory();
  if (history.length) {
    renderHistory(ui, history[0].account);
    updateLoginInputDefaults(ui, history[0]);
    setStatus(ui, '请选择历史账号，或手动输入新账号登录', 'info');
  } else {
    prepareRegisterForm(ui);
    setStatus(ui, '请登录或注册新账号', 'info');
  }
  setActiveTab(ui, 'login');
  setHistoryPanelState(ui, false);
}

export default function initLegacyAuth({ mount, onAuthenticated, onOpen = () => {} }) {
  const ui = buildShell(mount);
  setInitialState(ui);

  ui.root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tabButton = target?.closest('[data-tab]');
    if (!tabButton) {
      return;
    }

    event.preventDefault();
    const mode = tabButton.dataset.tab;
    setActiveTab(ui, mode);
    if (mode === 'register') {
      prepareRegisterForm(ui);
    }
  });

  wireLoginForm(ui, onAuthenticated);
  wireRegisterForm(ui, onAuthenticated);

  function open() {
    ui.overlay.classList.remove('hidden');
    onOpen();
  }

  function close() {
    ui.overlay.classList.add('hidden');
  }

  return {
    open,
    close,
    root: ui.root,
    overlay: ui.overlay,
  };
}
