const API_BASE = '/api';

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

export async function fetchPlayerChapters(account) {
  const query = new URLSearchParams({ account });
  return requestJson(`/player/chapters?${query.toString()}`);
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
