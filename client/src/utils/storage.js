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
      chapterId: DEFAULT_PLAYER.chapterId,
      currentChapterId: DEFAULT_PLAYER.chapterId,
      highestUnlockedChapterId: DEFAULT_PLAYER.chapterId,
    };
  } catch {
    return { ...DEFAULT_PLAYER };
  }
}

export function savePlayer(player) {
  const localProfile = {
    name: player?.name || player?.nickname || player?.account || DEFAULT_PLAYER.name,
    nickname: player?.nickname || player?.name || player?.account || DEFAULT_PLAYER.nickname,
    account: player?.account || '',
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(localProfile));
}
