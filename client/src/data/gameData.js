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

export const SKILLS = [
  {
    name: '轻身术',
    sect: '轻功',
    sectTag: '逍遥派',
    rarity: 'N',
    level: 1,
    exp: 50,
    maxExp: 100,
    stars: 1,
    color: 0xd97706,
    effect: '闪避率 +10%',
    upgrade: '2星：移动速度 +10%',
    summary: '最基础的身法功法，先把走位和生存撑起来。',
  },
  {
    name: '金钟罩',
    sect: '外功',
    sectTag: '少林派',
    rarity: 'R',
    level: 2,
    exp: 110,
    maxExp: 200,
    stars: 2,
    color: 0x0ea5e9,
    effect: '减伤率 +18%',
    upgrade: '3星：血量上限 +8%',
    summary: '偏防御的核心功法，适合开局稳住前几章。',
  },
  {
    name: '峨眉心法',
    sect: '内功',
    sectTag: '峨眉派',
    rarity: 'SR',
    level: 3,
    exp: 320,
    maxExp: 500,
    stars: 3,
    color: 0x10b981,
    effect: '血量上限 +36%',
    upgrade: '满星：治疗收益 +12%',
    summary: '内功型基础成长，适合和生命向羁绊一起做成型。',
  },
  {
    name: '伏虎枪法',
    sect: '枪法',
    sectTag: '丐帮',
    rarity: 'SSR',
    level: 4,
    exp: 640,
    maxExp: 1000,
    stars: 2,
    color: 0x8b5cf6,
    effect: '背后伤害 +60%',
    upgrade: '3星：暴击伤害 +15%',
    summary: '偏输出的招式，适合搭配暴击或追击流。',
  },
  {
    name: '毒龙刀法',
    sect: '刀法',
    sectTag: '五毒教',
    rarity: 'UR',
    level: 5,
    exp: 920,
    maxExp: 1200,
    stars: 3,
    color: 0xfb7185,
    effect: '暴击伤害 +90%',
    upgrade: '满星：持续伤害 +20%',
    summary: '高上限的爆发型招式，和毒伤流、暴击流都能配。',
  },
  {
    name: '风雷阵法',
    sect: '阵法',
    sectTag: '唐门',
    rarity: 'R',
    level: 2,
    exp: 140,
    maxExp: 240,
    stars: 1,
    color: 0xf59e0b,
    effect: '击杀触发成长',
    upgrade: '2星：攻击力 +12%',
    summary: '机制偏成长的过渡型功法，战斗越久收益越高。',
  },
];

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

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

  const seed = String(player?.account || player?.nickname || player?.name || DEFAULT_PLAYER.name);
  return ((hashString(seed) % list.length) + 1);
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
