const { getPrismaClient } = require('../config/prisma');
const { getPlayerProfileByAccount, sanitizeProgress } = require('./authService');
const { getChapterConfigRows } = require('./chapterConfigService');
const { getFirstMissionForChapter } = require('./missionConfigService');

function sanitizeBattleSession(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    playerId: session.playerId,
    chapterId: session.chapterId,
    layerIndex: session.layerIndex,
    waveIndex: session.waveIndex,
    missionId: session.missionId,
    waveType: session.waveType,
    enemyId: session.enemyId,
    enemyName: session.enemyName,
    enemyCount: session.enemyCount,
    enemyLife: session.enemyLife,
    enemyAtk: session.enemyAtk,
    status: session.status,
    result: session.result,
    startedAt: session.startedAt,
    settledAt: session.settledAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function buildBattleSessionPayload(session, chapters) {
  const safeSession = sanitizeBattleSession(session);
  const chapter = chapters.find((item) => item.id === safeSession?.chapterId) || null;

  return safeSession ? {
    ...safeSession,
    chapter,
  } : null;
}

async function getPlayerBattleSessionByAccount({ account }) {
  const prisma = getPrismaClient();
  const { player } = await getPlayerProfileByAccount({ account });
  const session = await prisma.playerBattleSession.findUnique({
    where: {
      playerId: player.id,
    },
  });

  return buildBattleSessionPayload(session, getChapterConfigRows());
}

async function startBattleSession({ account, chapterId }) {
  const prisma = getPrismaClient();
  const { player, progress, profile } = await getPlayerProfileByAccount({ account });
  const nextChapterId = Number(chapterId || profile.currentChapterId);

  if (!Number.isInteger(nextChapterId) || nextChapterId <= 0) {
    throw new Error('chapterId 必须是正整数');
  }

  if (nextChapterId > progress.highestUnlockedChapterId) {
    throw new Error('目标章节尚未解锁');
  }

  const mission = getFirstMissionForChapter(nextChapterId);
  if (!mission) {
    throw new Error('当前章节缺少可用战斗关卡');
  }

  const session = await prisma.playerBattleSession.upsert({
    where: {
      playerId: player.id,
    },
    update: {
      chapterId: nextChapterId,
      layerIndex: mission.layerIndex,
      waveIndex: mission.waveIndex,
      missionId: mission.id,
      waveType: mission.waveType,
      enemyId: mission.enemyId,
      enemyName: mission.enemyName,
      enemyCount: mission.enemyCount,
      enemyLife: mission.enemyLife,
      enemyAtk: mission.enemyAtk,
      status: 'active',
      result: null,
      startedAt: new Date(),
      settledAt: null,
    },
    create: {
      playerId: player.id,
      chapterId: nextChapterId,
      layerIndex: mission.layerIndex,
      waveIndex: mission.waveIndex,
      missionId: mission.id,
      waveType: mission.waveType,
      enemyId: mission.enemyId,
      enemyName: mission.enemyName,
      enemyCount: mission.enemyCount,
      enemyLife: mission.enemyLife,
      enemyAtk: mission.enemyAtk,
      status: 'active',
      startedAt: new Date(),
    },
  });

  return {
    profile,
    session: buildBattleSessionPayload(session, getChapterConfigRows()),
  };
}

async function settleBattleSession({ account, result }) {
  const prisma = getPrismaClient();
  const normalizedResult = String(result || '').trim().toLowerCase();
  if (!['victory', 'defeat'].includes(normalizedResult)) {
    throw new Error('result 必须是 victory 或 defeat');
  }

  const { player, progress, profile } = await getPlayerProfileByAccount({ account });
  const existing = await prisma.playerBattleSession.findUnique({
    where: {
      playerId: player.id,
    },
  });

  if (!existing || existing.status !== 'active') {
    throw new Error('当前没有进行中的战斗会话');
  }

  const chapters = getChapterConfigRows();
  const maxChapterId = chapters.length || progress.highestUnlockedChapterId;

  const nextProgress = await prisma.playerProgress.update({
    where: {
      playerId: player.id,
    },
    data: normalizedResult === 'victory'
      ? {
          currentChapterId: Math.min(existing.chapterId + 1, maxChapterId),
          highestUnlockedChapterId: Math.max(
            progress.highestUnlockedChapterId,
            Math.min(existing.chapterId + 1, maxChapterId),
          ),
        }
      : {
          currentChapterId: existing.chapterId,
        },
  });

  const session = await prisma.playerBattleSession.update({
    where: {
      playerId: player.id,
    },
    data: {
      status: 'settled',
      result: normalizedResult,
      settledAt: new Date(),
    },
  });

  return {
    profile: {
      ...profile,
      currentChapterId: nextProgress.currentChapterId,
      highestUnlockedChapterId: nextProgress.highestUnlockedChapterId,
    },
    progress: sanitizeProgress(nextProgress),
    session: buildBattleSessionPayload(session, chapters),
  };
}

module.exports = {
  getPlayerBattleSessionByAccount,
  sanitizeBattleSession,
  settleBattleSession,
  startBattleSession,
};
