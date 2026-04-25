import { DEFAULT_PLAYER, STORAGE_KEY } from '../data/gameData.js';

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function getSavedPlayer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_PLAYER };
    }

    const chapterId = toPositiveInteger(parsed.currentChapterId ?? parsed.chapterId, 1);
    const highestUnlockedChapterId = toPositiveInteger(parsed.highestUnlockedChapterId, chapterId);

    return {
      name: parsed.name || parsed.nickname || parsed.account || '少侠',
      nickname: parsed.nickname || parsed.name || parsed.account || '少侠',
      account: parsed.account || '',
      chapterId,
      currentChapterId: chapterId,
      highestUnlockedChapterId,
    };
  } catch {
    return { ...DEFAULT_PLAYER };
  }
}

export function savePlayer(player) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}
