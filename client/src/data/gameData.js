export const GAME_WIDTH = 750;
export const GAME_HEIGHT = 1624;
export const STORAGE_KEY = '剑侠风云_demo_player';
export const GAME_TITLE = '剑侠风云';
export const GAME_SUBTITLE = '功法构筑 · 爬层 Roguelike';

export const GAME_TABS = [
  { key: 'chapter', label: '章节' },
  { key: 'skill', label: '功法' },
  { key: 'role', label: '角色' },
  { key: 'shop', label: '功法商城' },
];

export const DEFAULT_PLAYER = {
  name: '少侠',
  nickname: '少侠',
  account: '',
  chapterId: 1,
};

export function getChapterConfigs() {
  return Array.isArray(window.__chapterConfigs) ? window.__chapterConfigs : [];
}

export function resolvePlayerChapterId(player, chapters = getChapterConfigs()) {
  const list = Array.isArray(chapters) && chapters.length ? chapters : [];
  const explicitChapterId = Number(player?.chapterId);

  if (!list.length) {
    return Number.isInteger(explicitChapterId) && explicitChapterId > 0 ? explicitChapterId : 1;
  }

  if (Number.isInteger(explicitChapterId) && explicitChapterId > 0) {
    return ((explicitChapterId - 1) % list.length) + 1;
  }
  return 1;
}

export function getChapterById(chapterId, chapters = getChapterConfigs()) {
  const list = Array.isArray(chapters) && chapters.length ? chapters : [];
  if (!list.length) {
    return null;
  }
  const id = Number(chapterId);
  return list.find((chapter) => Number(chapter.id) === id) || list[0] || null;
}

export function getPlayerChapter(player, chapters = getChapterConfigs()) {
  const id = resolvePlayerChapterId(player, chapters);
  return getChapterById(id, chapters);
}
