const { getPrismaClient } = require('../config/prisma');
const { getPrimarySheetBySuffix } = require('./excelCatalogService');
const { getPlayerProfileByAccount } = require('./authService');

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

  if (skill.canUpgrade) {
    return `已拥有 · 可升级 · 当前经验 ${skill.exp}/${skill.nextUpgradeNeed || '-'}`;
  }

  if (skill.owned) {
    return `已拥有 · ${skill.stars} 星 · 等级 ${skill.level}`;
  }

  return '章节已开放 · 尚未拥有';
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
  const skills = skillConfigs.map((skill) => {
    const progress = progressMap.get(skill.id) || null;
    const chapterUnlocked = skill.unlockChapter <= profile.highestUnlockedChapterId;
    const unlocked = Boolean(progress) || chapterUnlocked;
    const level = progress?.level || 0;
    const exp = progress?.exp || 0;
    const stars = progress?.stars || 0;
    const nextUpgradeNeed = skill.upgradeCond[level - 1] || 0;

    const payload = {
      ...skill,
      unlocked,
      chapterUnlocked,
      owned: Boolean(progress),
      level,
      exp,
      stars,
      nextUpgradeNeed,
      canUpgrade: Boolean(progress) && nextUpgradeNeed > 0 && exp >= nextUpgradeNeed,
      progress: sanitizeSkillProgress(progress),
    };

    return {
      ...payload,
      statusText: buildSkillStatusText(payload),
      metaText: [payload.grade || '-', payload.sectType || '-', payload.moldType || '-'].join(' / '),
    };
  });

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
      states: ['upgrade', 'locked'],
    },
    skills,
  };
}

module.exports = {
  getPlayerSkillList,
  getSkillConfigRows,
};
