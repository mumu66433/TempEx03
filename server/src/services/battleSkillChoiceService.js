const crypto = require('crypto');
const { getPrismaClient } = require('../config/prisma');
const { getPlayerProfileByAccount } = require('./authService');
const { getChapterConfigRows } = require('./chapterConfigService');
const {
  DEFAULT_BUILD_CAPACITY,
  decorateSkillPayload,
  getPlayerBuild,
  getSkillConfigRows,
} = require('./skillService');

const CANDIDATE_COUNT = 3;
const MAX_REFRESH_COUNT = 1;
const REFRESH_COST = { coin: 0 };
const DUPLICATE_SKILL_EXP = 10;

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function normalizePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} 必须是正整数`);
  }

  return number;
}

function normalizeOptionalText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function pickCandidateSkills({ chapter, profile, ownedSkillIds, round }) {
  const skillConfigs = getSkillConfigRows();
  const [minPoolRaw, maxPoolRaw] = chapter?.skillPoolRange || [];
  const minPool = Number(minPoolRaw);
  const maxPool = Number(maxPoolRaw);
  const hasPoolRange = Number.isFinite(minPool) && Number.isFinite(maxPool) && maxPool >= minPool;
  const eligible = skillConfigs
    .filter((skill) => skill.id > 0)
    .filter((skill) => !hasPoolRange || (skill.id >= minPool && skill.id <= maxPool))
    .filter((skill) => skill.unlockChapter <= profile.highestUnlockedChapterId)
    .sort((a, b) => a.id - b.id);

  const preferred = eligible.filter((skill) => !ownedSkillIds.has(skill.id));
  const fallback = eligible.filter((skill) => ownedSkillIds.has(skill.id));
  const pool = [...preferred, ...fallback];
  if (pool.length === 0) {
    return [];
  }

  const start = (Math.max(1, round) - 1) % pool.length;
  const picked = [];
  for (let offset = 0; offset < pool.length && picked.length < CANDIDATE_COUNT; offset += 1) {
    picked.push(pool[(start + offset) % pool.length]);
  }

  return picked;
}

function mapProgressBySkillId(progressList) {
  return new Map(progressList.map((item) => [item.skillId, item]));
}

function buildCandidatePayload({ row, skill, progress, profile }) {
  const payload = decorateSkillPayload(skill, progress, profile);
  const selectable = !payload.isMaxStars;

  return {
    candidateId: row.id,
    skillId: payload.id,
    name: payload.name,
    grade: payload.grade,
    sectType: payload.sectType,
    moldType: payload.moldType,
    genre: payload.genre,
    powerType: payload.powerType,
    powerRate: payload.powerRate,
    powerRateText: payload.powerRateText,
    desc: payload.desc,
    effectDesc: payload.effectDesc,
    owned: payload.owned,
    level: payload.level,
    levelPreview: payload.owned ? payload.level : 1,
    stars: payload.stars,
    maxStars: payload.maxStars,
    isMaxStars: payload.isMaxStars,
    canUpgrade: payload.canUpgrade,
    upgradeState: payload.upgradeState,
    upgradeStateText: payload.upgradeStateText,
    statusText: payload.statusText,
    metaText: payload.metaText,
    selectState: selectable ? 'available' : 'disabled',
    disabledReason: selectable ? '' : '已满星',
    selected: Boolean(row.selectedAt),
  };
}

async function loadBattleContext({ account, sessionId = null }) {
  const prisma = getPrismaClient();
  const { player, profile } = await getPlayerProfileByAccount({ account });
  const session = sessionId
    ? await prisma.playerBattleSession.findFirst({
        where: {
          id: sessionId,
          playerId: player.id,
        },
      })
    : await prisma.playerBattleSession.findUnique({
        where: {
          playerId: player.id,
        },
      });

  if (!session) {
    throw new Error('当前没有可用的战斗会话');
  }

  return {
    prisma,
    player,
    profile,
    session,
  };
}

async function getLatestCandidateRound(prisma, sessionId) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT MAX("candidateRound") AS "candidateRound" FROM "PlayerBattleSkillCandidate" WHERE "sessionId" = ?',
    sessionId,
  );
  const value = Number(rows?.[0]?.candidateRound || 0);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

async function loadCandidateRows(prisma, sessionId, candidateRound) {
  return prisma.$queryRawUnsafe(
    `SELECT *
     FROM "PlayerBattleSkillCandidate"
     WHERE "sessionId" = ? AND "candidateRound" = ?
     ORDER BY "createdAt" ASC, "skillId" ASC`,
    sessionId,
    candidateRound,
  );
}

async function createCandidateRound({ prisma, player, profile, session, candidateRound }) {
  const chapter = getChapterConfigRows().find((item) => item.id === session.chapterId) || null;
  const progressList = await prisma.playerSkillProgress.findMany({
    where: {
      playerId: player.id,
    },
  });
  const ownedSkillIds = new Set(progressList.map((item) => item.skillId));
  const pickedSkills = pickCandidateSkills({
    chapter,
    profile,
    ownedSkillIds,
    round: candidateRound,
  });
  const refreshCount = Math.max(0, candidateRound - 1);

  for (const skill of pickedSkills) {
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "PlayerBattleSkillCandidate"
        ("id", "playerId", "sessionId", "candidateRound", "refreshCount", "skillId", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      createId('cand'),
      player.id,
      session.id,
      candidateRound,
      refreshCount,
      skill.id,
    );
  }

  return loadCandidateRows(prisma, session.id, candidateRound);
}

async function ensureCandidateRound({ prisma, player, profile, session, candidateRound }) {
  const rows = await loadCandidateRows(prisma, session.id, candidateRound);
  if (rows.length > 0) {
    return rows;
  }

  return createCandidateRound({
    prisma,
    player,
    profile,
    session,
    candidateRound,
  });
}

async function buildCandidateResponse({ account, sessionId = null, forceNextRound = false }) {
  const context = await loadBattleContext({ account, sessionId });
  const latestRound = await getLatestCandidateRound(context.prisma, context.session.id);
  const candidateRound = forceNextRound ? latestRound + 1 : Math.max(1, latestRound);

  if (forceNextRound && latestRound > MAX_REFRESH_COUNT) {
    throw new Error('候选功法已刷新过，V0 仅允许刷新一次');
  }

  const rows = await ensureCandidateRound({
    ...context,
    candidateRound,
  });
  const skillConfigs = getSkillConfigRows();
  const skillMap = new Map(skillConfigs.map((skill) => [skill.id, skill]));
  const progressList = await context.prisma.playerSkillProgress.findMany({
    where: {
      playerId: context.player.id,
    },
  });
  const progressMap = mapProgressBySkillId(progressList);
  const candidates = rows
    .map((row) => {
      const skill = skillMap.get(row.skillId);
      if (!skill) {
        return null;
      }

      return buildCandidatePayload({
        row,
        skill,
        progress: progressMap.get(row.skillId) || null,
        profile: context.profile,
      });
    })
    .filter(Boolean);
  const selectedCandidate = candidates.find((candidate) => candidate.selected) || null;

  return {
    sessionId: context.session.id,
    chapterId: context.session.chapterId,
    candidateRound,
    refreshCount: Math.max(0, candidateRound - 1),
    maxRefreshCount: MAX_REFRESH_COUNT,
    canRefresh: candidateRound <= MAX_REFRESH_COUNT,
    refreshCost: REFRESH_COST,
    capacity: DEFAULT_BUILD_CAPACITY,
    candidates,
    selectedCandidate,
    display: {
      title: '选择一门功法',
      subtitle: candidates.length > 0
        ? `本轮候选 ${candidates.length} 门，可刷新 ${Math.max(0, MAX_REFRESH_COUNT - (candidateRound - 1))} 次`
        : '暂无可选功法',
      emptyText: '暂无可选功法，可继续战斗',
    },
  };
}

async function getBattleSkillCandidates({ account, sessionId = null }) {
  return buildCandidateResponse({
    account,
    sessionId,
  });
}

async function refreshBattleSkillCandidates({ account, sessionId = null }) {
  return buildCandidateResponse({
    account,
    sessionId,
    forceNextRound: true,
  });
}

async function confirmBattleSkillCandidate({
  account,
  sessionId = null,
  candidateId,
  skillId,
}) {
  const normalizedCandidateId = normalizeOptionalText(candidateId);
  const normalizedSkillId = normalizePositiveInteger(skillId, 'skillId');
  if (!normalizedCandidateId) {
    throw new Error('candidateId 不能为空');
  }

  const context = await loadBattleContext({ account, sessionId });
  const latestRound = Math.max(1, await getLatestCandidateRound(context.prisma, context.session.id));
  const selectedRows = await context.prisma.$queryRawUnsafe(
    `SELECT *
     FROM "PlayerBattleSkillCandidate"
     WHERE "sessionId" = ? AND "selectedAt" IS NOT NULL
     ORDER BY "selectedAt" DESC
     LIMIT 1`,
    context.session.id,
  );

  if (selectedRows.length > 0) {
    return buildConfirmResponse({
      context,
      selectedSkillId: Number(selectedRows[0].skillId),
      ownedBefore: true,
      duplicate: true,
    });
  }

  const rows = await loadCandidateRows(context.prisma, context.session.id, latestRound);
  const candidate = rows.find((row) => row.id === normalizedCandidateId);
  if (!candidate) {
    throw new Error('候选功法不存在或已过期');
  }

  if (Number(candidate.skillId) !== normalizedSkillId) {
    throw new Error('candidateId 与 skillId 不匹配');
  }

  const skill = getSkillConfigRows().find((item) => item.id === normalizedSkillId);
  if (!skill) {
    throw new Error('功法配置不存在');
  }

  const existing = await context.prisma.playerSkillProgress.findUnique({
    where: {
      playerId_skillId: {
        playerId: context.player.id,
        skillId: normalizedSkillId,
      },
    },
  });

  await context.prisma.playerSkillProgress.upsert({
    where: {
      playerId_skillId: {
        playerId: context.player.id,
        skillId: normalizedSkillId,
      },
    },
    update: {
      exp: {
        increment: DUPLICATE_SKILL_EXP,
      },
    },
    create: {
      playerId: context.player.id,
      skillId: normalizedSkillId,
      level: 1,
      exp: 0,
      stars: 1,
    },
  });

  const slotCountRows = await context.prisma.$queryRawUnsafe(
    'SELECT COUNT(*) AS "count" FROM "PlayerBattleBuildSlot" WHERE "playerId" = ?',
    context.player.id,
  );
  const slotIndex = Number(slotCountRows?.[0]?.count || 0) + 1;
  await context.prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "PlayerBattleBuildSlot"
      ("id", "playerId", "sessionId", "slotIndex", "skillId", "createdAt", "updatedAt")
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    createId('slot'),
    context.player.id,
    context.session.id,
    slotIndex,
    normalizedSkillId,
  );

  await context.prisma.$executeRawUnsafe(
    `UPDATE "PlayerBattleSkillCandidate"
     SET "selectedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ?`,
    normalizedCandidateId,
  );

  await context.prisma.playerBattleSession.update({
    where: {
      id: context.session.id,
    },
    data: {
      status: 'active',
      result: null,
    },
  });

  return buildConfirmResponse({
    context,
    selectedSkillId: normalizedSkillId,
    ownedBefore: Boolean(existing),
    duplicate: false,
  });
}

async function buildConfirmResponse({
  context,
  selectedSkillId,
  ownedBefore,
  duplicate,
}) {
  const skillList = await require('./skillService').getPlayerSkillList({
    account: context.profile.account,
  });
  const selectedSkill = skillList.skills.find((item) => item.id === selectedSkillId);
  const buildBar = await getPlayerBuild({
    account: context.profile.account,
    sessionId: context.session.id,
  });

  return {
    sessionId: context.session.id,
    selected: {
      skillId: selectedSkillId,
      name: selectedSkill?.name || `功法 ${selectedSkillId}`,
      ownedBefore,
      duplicate,
      level: selectedSkill?.level || 0,
      exp: selectedSkill?.exp || 0,
      stars: selectedSkill?.stars || 0,
      statusText: selectedSkill?.statusText || '',
    },
    skillSummary: skillList.summary,
    buildBar,
  };
}

module.exports = {
  getBattleSkillCandidates,
  refreshBattleSkillCandidates,
  confirmBattleSkillCandidate,
};
