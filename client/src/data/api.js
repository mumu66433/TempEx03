const API_BASE = '/api';

export class ApiRequestError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
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
    throw new ApiRequestError(payload.error || `请求失败(${response.status})`, response.status);
  }

  return payload;
}

async function requestJsonWithFallbacks(paths, options = {}) {
  let lastError = null;

  for (const path of paths) {
    try {
      return await requestJson(path, options);
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiRequestError) || error.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new ApiRequestError('请求失败', 404);
}

export async function fetchHealth() {
  return requestJson('/health');
}

export async function fetchChapterConfig() {
  const payload = await requestJson('/config/chapter');
  return Array.isArray(payload.chapters) ? payload.chapters : [];
}

export async function fetchPlayerProfile(account) {
  const query = new URLSearchParams({ account });
  return requestJson(`/player/profile?${query.toString()}`);
}

export async function fetchPlayerHome(account) {
  const query = new URLSearchParams({ account });
  return requestJson(`/player/home?${query.toString()}`);
}

export async function fetchPlayerChapters(account) {
  const query = new URLSearchParams({ account });
  return requestJson(`/player/chapters?${query.toString()}`);
}

export async function fetchPlayerSkills(account) {
  const query = new URLSearchParams({ account });
  return requestJson(`/player/skills?${query.toString()}`);
}

export async function updatePlayerCurrentChapter(account, chapterId) {
  return requestJson('/player/current-chapter', {
    method: 'PATCH',
    body: JSON.stringify({
      account,
      chapterId,
    }),
  });
}

export async function fetchBattleSession(account) {
  const query = new URLSearchParams({ account });
  return requestJson(`/battle/session?${query.toString()}`);
}

export async function startBattleSession(account, chapterId) {
  return requestJson('/battle/session/start', {
    method: 'POST',
    body: JSON.stringify({
      account,
      chapterId,
    }),
  });
}

export async function simulateBattleSession(account, sessionId, chapterId) {
  const body = JSON.stringify({
    account,
    sessionId,
    chapterId,
  });

  return requestJsonWithFallbacks([
    '/battle/session/simulate',
    '/battle/simulate',
    '/battle/simulation',
  ], {
    method: 'POST',
    body,
  });
}

export async function settleBattleSession(account, result) {
  return requestJson('/battle/session/settle', {
    method: 'POST',
    body: JSON.stringify({
      account,
      result,
    }),
  });
}
