import { DEFAULT_PLAYER, STORAGE_KEY } from '../data/gameData.js';

export function getSavedPlayer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_PLAYER };
    }

    return {
      name: parsed.name || parsed.nickname || parsed.account || '少侠',
      nickname: parsed.nickname || parsed.name || parsed.account || '少侠',
      account: parsed.account || '',
    };
  } catch {
    return { ...DEFAULT_PLAYER };
  }
}

export function savePlayer(player) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}
