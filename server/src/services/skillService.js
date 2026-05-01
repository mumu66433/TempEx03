const { getPrismaClient } = require('../config/prisma');
const { getPrimarySheetBySuffix } = require('./excelCatalogService');
const { getPlayerProfileByAccount } = require('./authService');

const MAX_SKILL_STARS = 3;
const DEFAULT_BUILD_CAPACITY = 20;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNumberArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toNumber(item));
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  const normalized = String(value).replace(/[\[\]]/g, ' ');
  return normalized
    .split(/[,\s/]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => toNumber(item));
}

function formatPercentList(values) {
  return values.map((value) => `${Math.round(value * 100)}%`);
}

function getSkillConfigRows() {
  const sheet = getPrimarySheetBySuffix('.Skill');

  return sheet.records.map((row) => {
    const powerRate = toNumberArray(row.powerRate);
    const upgradeCond = toNumberArray(row.upgradeCond);

    return {
      id: toNumber(row.Id),
      name: String(row.name || ''),
      sectType: String(row.sectType || ''),
      moldType: String(row.moldType || ''),
      grade: String(row.grade || ''),
      powerType: String(row.powerType || ''),
      powerRate,
      powerRateText: formatPercentList(powerRate),
      upgradeCond,
      upgradeCondText: upgradeCond.map((value) => String(value)),
      unlockChapter: toNumber(row.unlockChapter),
      designTag: String(row.designTag || ''),
      desc: String(row.desc || ''),
    };
  });
}

function sanitizeSkillProgress(progress) {
  if (!progress) {
    return null;
  }

  return {
    level: progress.level,
    exp: progress.exp,
    stars: progress.stars,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}

function buildSkillStatusText(skill) {
  if (!skill.unlocked) {
    return `未解锁 · 第${skill.unlockChapter || '-'}章开启`;
  }

  if (skill.isMaxStars) {
    return `已满星 · ${skill.stars} 星 · 等级 ${skill.level}`;
  }

  if (skill.canUpgrade) {
    return `已拥有 · 可升级 · 当前经验 ${skill.exp}/${skill.nextUpgradeNeed || '-'}`;
  }

  if (skill.owned) {
    return `已拥有 · ${skill.stars} 星 · 等级 ${skill.level}`;
  }

  return '章节已开放 · 尚未拥有';
}

function buildUpgradeState({ owned, isMaxStars, canUpgrade }) {
  if (!owned) {
    return 'unowned';
  }

  if (isMaxStars) {
    return 'max';
  }

  if (canUpgrade) {
    return 'upgradeable';
  }

  return 'locked';
}

function buildUpgradeStateText(state) {
  const textMap = {
    unowned: '尚未拥有',
    max: '已满星',
    upgradeable: '可升级',
    locked: '材料不足',
  };

  return textMap[state] || '未知状态';
}

function decorateSkillPayload(skill, progress, profile) {
  const chapterUnlocked = skill.unlockChapter <= profile.highestUnlockedChapterId;
  const unlocked = Boolean(progress) || chapterUnlocked;
  const level = progress?.level || 0;
  const exp = progress?.exp || 0;
  const stars = progress?.stars || 0;
  const nextUpgradeNeed = skill.upgradeCond[Math.max(level - 1, 0)] || 0;
  const owned = Boolean(progress);
  const isMaxStars = owned && stars >= MAX_SKILL_STARS;
  const canUpgrade = owned && !isMaxStars && nextUpgradeNeed > 0 && exp >= nextUpgradeNeed;
  const upgradeState = buildUpgradeState({ owned, isMaxStars, canUpgrade });

  const payload = {
    ...skill,
    sectName: skill.sectType,
    school: skill.sectType,
    genre: skill.moldType,
    effectDesc: skill.desc || `${skill.powerType || '效果'}：${skill.powerRateText.join(' / ') || '-'}`,
    unlocked,
    chapterUnlocked,
    owned,
    level,
    exp,
    stars,
    maxStars: MAX_SKILL_STARS,
    nextUpgradeNeed,
    canUpgrade,
    isMaxStars,
    upgradeState,
    upgradeStateText: buildUpgradeStateText(upgradeState),
    progress: sanitizeSkillProgress(progress),
  };

  return {
    ...payload,
    statusText: buildSkillStatusText(payload),
    metaText: [payload.grade || '-', payload.sectType || '-', payload.moldType || '-'].join(' / '),
  };
}

async function getPlayerSkillList({ account }) {
  const prisma = getPrismaClient();
  const { player, profile } = await getPlayerProfileByAccount({ account });
  const skillConfigs = getSkillConfigRows();
  const progressList = await prisma.playerSkillProgress.findMany({
    where: {
      playerId: player.id,
    },
  });

  const progressMap = new Map(progressList.map((item) => [item.skillId, item]));
  const skills = skillConfigs.map((skill) => decorateSkillPayload(skill, progressMap.get(skill.id) || null, profile));

  return {
    player: profile,
    summary: {
      total: skills.length,
      unlocked: skills.filter((skill) => skill.unlocked).length,
      owned: skills.filter((skill) => skill.owned).length,
      upgradeable: skills.filter((skill) => skill.canUpgrade).length,
    },
    filters: {
      grades: ['N', 'R', 'SR'],
      states: ['upgrade', 'locked', 'owned', 'max'],
    },
    skills,
  };
}

async function getPlayerBuild({ account, sessionId = null }) {
  const prisma = getPrismaClient();
  const { player, profile } = await getPlayerProfileByAccount({ account });
  const skillConfigs = getSkillConfigRows();
  const progressList = await prisma.playerSkillProgress.findMany({
    where: {
      playerId: player.id,
    },
    orderBy: [
      { createdAt: 'asc' },
      { skillId: 'asc' },
    ],
  });
  const progressMap = new Map(progressList.map((item) => [item.skillId, item]));
  const skillMap = new Map(skillConfigs.map((skill) => [skill.id, skill]));
  const slots = progressList
    .slice(0, DEFAULT_BUILD_CAPACITY)
    .map((progress, index) => {
      const skill = decorateSkillPayload(skillMap.get(progress.skillId) || {
        id: progress.skillId,
        name: `未知功法 ${progress.skillId}`,
        sectType: '',
        moldType: '',
        grade: '',
        powerType: '',
        powerRate: [],
        powerRateText: [],
        upgradeCond: [],
        upgradeCondText: [],
        unlockChapter: 0,
        designTag: '',
        desc: '',
      }, progressMap.get(progress.skillId), profile);

      return {
        slotIndex: index + 1,
        skillId: skill.id,
        name: skill.name,
        grade: skill.grade,
        sectType: skill.sectType,
        moldType: skill.moldType,
        genre: skill.genre,
        level: skill.level,
        stars: skill.stars,
        maxStars: skill.maxStars,
        powerType: skill.powerType,
        powerRateText: skill.powerRateText,
        effectDesc: skill.effectDesc,
        statusText: '已装配',
      };
    });

  return {
    player: profile,
    sessionId,
    capacity: DEFAULT_BUILD_CAPACITY,
    used: slots.length,
    remaining: Math.max(0, DEFAULT_BUILD_CAPACITY - slots.length),
    slots,
    effectsPreview: slots.map((slot) => ({
      skillId: slot.skillId,
      name: slot.name,
      powerType: slot.powerType,
      valueText: slot.powerRateText[0] || '-',
    })),
    display: {
      title: '本局构筑',
      summaryText: `${slots.length}/${DEFAULT_BUILD_CAPACITY} 本功法`,
      emptyText: slots.length > 0 ? '' : '暂无已装配功法',
    },
  };
}

module.exports = {
  DEFAULT_BUILD_CAPACITY,
  MAX_SKILL_STARS,
  decorateSkillPayload,
  getPlayerBuild,
  getPlayerSkillList,
  getSkillConfigRows,
};
