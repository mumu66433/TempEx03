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

export async function fetchPlayerBuild(account) {
  const query = new URLSearchParams({ account });
  return requestJson(`/player/build?${query.toString()}`);
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

export async function simulateBattleSessionStep(account) {
  return requestJson('/battle/session/simulate-step', {
    method: 'POST',
    body: JSON.stringify({
      account,
    }),
  });
}

export async function settleBattleSession(account) {
  return requestJson('/battle/session/settle', {
    method: 'POST',
    body: JSON.stringify({
      account,
    }),
  });
}

export async function fetchBattleSkillCandidates(account, sessionId = '') {
  const query = new URLSearchParams({ account });
  if (sessionId) {
    query.set('sessionId', sessionId);
  }
  return requestJson(`/battle/session/skill-candidates?${query.toString()}`);
}

export async function refreshBattleSkillCandidates(account, sessionId = '') {
  return requestJson('/battle/session/skill-candidates/refresh', {
    method: 'POST',
    body: JSON.stringify({
      account,
      ...(sessionId ? { sessionId } : {}),
    }),
  });
}

export async function confirmBattleSkillCandidate(account, candidate) {
  return requestJson('/battle/session/skill-candidates/confirm', {
    method: 'POST',
    body: JSON.stringify({
      account,
      sessionId: candidate.sessionId,
      candidateId: candidate.candidateId,
      skillId: candidate.skillId,
    }),
  });
}

export async function fetchBattleSessionBuild(account, sessionId = '') {
  const query = new URLSearchParams({ account });
  if (sessionId) {
    query.set('sessionId', sessionId);
  }
  return requestJson(`/battle/session/build?${query.toString()}`);
}
