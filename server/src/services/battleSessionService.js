const { getPrismaClient } = require('../config/prisma');
const {
  getPlayerProfileByAccount,
  sanitizeProgress,
} = require('./authService');
const { getChapterConfigRows } = require('./chapterConfigService');
const { getChapterMissionRows, getFirstMissionForChapter } = require('./missionConfigService');
const { getDefaultRoleConfig } = require('./roleConfigService');

const DEFAULT_HERO_LIFE = 100;
const DEFAULT_HERO_ATK = 10;
const DEFAULT_HERO_CRIT_RATE = 0.1;
const DEFAULT_HERO_ATK_SPEED = 1;
const HERO_CRIT_MULTIPLIER = 1.5;
const HERO_COMBO_BONUS = 0.35;
const POST_WAVE_RECOVER_RATE = 0.06;
const MAX_ROUNDS_PER_WAVE = 24;

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

function buildSessionStatusText(session) {
  if (session.status === 'active' && session.result) {
    return '战斗已完成模拟，等待结算';
  }

  if (session.status === 'active') {
    return '战斗会话进行中';
  }

  if (session.status === 'choice') {
    return '普通波胜利，等待选择功法';
  }

  if (session.status === 'finished') {
    return session.result === 'victory'
      ? '最终波胜利，等待结算'
      : '战斗失败，等待结算';
  }

  return session.result === 'victory'
    ? '本局已通关结算'
    : '本局已失败结算';
}

function buildSessionSubtitle(session) {
  if (session.status === 'active' && session.result) {
    return `已模拟结果：${session.result}`;
  }

  if (session.status === 'active') {
    return `第${session.layerIndex}层 · 第${session.waveIndex}波 · ${session.waveType || '未命名波次'}`;
  }

  if (session.status === 'choice') {
    return `第${session.layerIndex}层 · 第${session.waveIndex}波 · 选择功法后继续`;
  }

  if (session.status === 'finished') {
    return `待结算结果：${session.result || '未结算'}`;
  }

  return `结算结果：${session.result || '未结算'}`;
}

function buildBattleSessionPayload(session, chapters) {
  const safeSession = sanitizeBattleSession(session);
  if (!safeSession) {
    return null;
  }

  const chapter = chapters.find((item) => item.id === safeSession.chapterId) || null;
  const active = safeSession.status === 'active';
  const pendingChoice = safeSession.status === 'choice';
  const finished = safeSession.status === 'finished';

  return {
    ...safeSession,
    chapter,
    statusText: buildSessionStatusText(safeSession),
    display: {
      title: chapter ? `${chapter.name} 战斗准备` : '当前章节战斗准备',
      subtitle: buildSessionSubtitle(safeSession),
      enemySummary: `${safeSession.enemyName || '-'} x ${safeSession.enemyCount ?? 0}`,
      enemyStats: {
        life: safeSession.enemyLife,
        atk: safeSession.enemyAtk,
      },
    },
    actions: {
      canStart: !active && !pendingChoice,
      canSimulate: active,
      canSelectSkill: pendingChoice,
      canSettle: active || finished,
      canRetry: true,
    },
  };
}

function normalizeResult(result) {
  const value = String(result || '').trim().toLowerCase();
  return ['victory', 'defeat'].includes(value) ? value : null;
}

function isBossMission(mission) {
  const target = `${mission.layerType || ''} ${mission.waveType || ''} ${mission.enemyName || ''}`;
  return /(boss|首领|头目)/i.test(target);
}

function roundToInt(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.round(number);
}

function buildHeroSnapshot({ profile, chapterId, chapters }) {
  const role = getDefaultRoleConfig() || {};
  const chapter = chapters.find((item) => item.id === chapterId) || null;
  const powerChapter = chapters.find((item) => item.id === profile.highestUnlockedChapterId) || chapter;
  const maxLife = Math.max(
    roundToInt(role.baseLife, DEFAULT_HERO_LIFE),
    roundToInt(powerChapter?.guessHeroLife, 0),
    roundToInt(chapter?.guessHeroLife, 0),
  );
  const atk = Math.max(
    roundToInt(role.baseAtk, DEFAULT_HERO_ATK),
    roundToInt(powerChapter?.guessHeroAtk, 0),
    roundToInt(chapter?.guessHeroAtk, 0),
  );
  const critRate = Number.isFinite(Number(role.critRate))
    ? Number(role.critRate)
    : DEFAULT_HERO_CRIT_RATE;
  const atkSpeed = Number.isFinite(Number(role.atkSpeed))
    ? Number(role.atkSpeed)
    : DEFAULT_HERO_ATK_SPEED;
  const guard = Math.max(0, roundToInt(maxLife * 0.04, 0));

  return {
    roleId: role.id || null,
    name: role.name || profile.nickname || profile.account,
    grade: role.grade || '',
    position: role.position || '',
    maxLife,
    currentLife: maxLife,
    atk,
    critRate,
    atkSpeed,
    critMultiplier: HERO_CRIT_MULTIPLIER,
    guard,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    derivedFromChapterId: powerChapter?.id || chapter?.id || chapterId,
    passiveDesc: role.passiveDesc || '',
  };
}

function buildEnemyWaveSnapshot(mission, waveState = null, cleared = false) {
  const totalLife = Math.max(0, mission.enemyCount * mission.enemyLife);
  return {
    missionId: mission.id,
    layerIndex: mission.layerIndex,
    waveIndex: mission.waveIndex,
    waveType: mission.waveType,
    enemyId: mission.enemyId,
    enemyName: mission.enemyName,
    enemyCount: mission.enemyCount,
    enemyLife: mission.enemyLife,
    enemyAtk: mission.enemyAtk,
    attackType: mission.attackType,
    totalLife,
    remainingCount: cleared ? 0 : waveState?.remainingCount ?? mission.enemyCount,
    remainingLife: cleared ? 0 : waveState?.remainingLife ?? totalLife,
    cleared,
  };
}

function buildSimulationSummary({
  result,
  hero,
  chapter,
  totalWaves,
  clearedWaves,
  rewards,
}) {
  const rewardText = `预计收益：铜钱 ${rewards.coin}，经验 ${rewards.exp}`;

  if (result === 'victory') {
    return `${hero.name} 成功打通 ${chapter?.name || '当前章节'} 全部 ${totalWaves} 波，剩余生命 ${hero.currentLife}/${hero.maxLife}。${rewardText}`;
  }

  return `${hero.name} 在 ${chapter?.name || '当前章节'} 第 ${clearedWaves + 1} 波前倒下，已清掉 ${clearedWaves}/${totalWaves} 波。${rewardText}`;
}

function buildHeroAttackLog({ mission, roundIndex, damage, isCrit, isCombo, enemyState }) {
  const tags = [];
  if (isCrit) {
    tags.push('暴击');
  }
  if (isCombo) {
    tags.push('连击');
  }

  const suffix = tags.length > 0 ? `（${tags.join(' / ')}）` : '';
  return `第${mission.layerIndex}层第${mission.waveIndex}波 第${roundIndex}回合：英雄造成 ${damage} 点伤害${suffix}，敌方剩余 ${enemyState.remainingCount} 个，生命池 ${enemyState.remainingLife}。`;
}

function buildEnemyAttackLog({ mission, roundIndex, damage, hero }) {
  return `第${mission.layerIndex}层第${mission.waveIndex}波 第${roundIndex}回合：${mission.enemyName || '敌人'} 反击造成 ${damage} 点伤害，英雄剩余生命 ${hero.currentLife}/${hero.maxLife}。`;
}

function getMissionStartIndex(missionRows, session) {
  if (!Array.isArray(missionRows) || missionRows.length === 0) {
    return 0;
  }

  if (session.result) {
    return 0;
  }

  const exactIndex = missionRows.findIndex((item) => item.id === session.missionId);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const orderedIndex = missionRows.findIndex(
    (item) => item.layerIndex > session.layerIndex
      || (item.layerIndex === session.layerIndex && item.waveIndex >= session.waveIndex),
  );

  return orderedIndex >= 0 ? orderedIndex : 0;
}

function simulateMissionWave({ hero, mission, absoluteRoundRef, logs }) {
  const enemyState = {
    remainingCount: mission.enemyCount,
    remainingLife: Math.max(0, mission.enemyCount * mission.enemyLife),
  };
  const bossWave = isBossMission(mission);
  let roundIndex = 0;

  logs.push(`第${mission.layerIndex}层第${mission.waveIndex}波开始：遭遇 ${mission.enemyName || '敌人'} x ${mission.enemyCount}，敌方总生命 ${enemyState.remainingLife}，总攻击 ${mission.enemyAtk * mission.enemyCount}。`);

  while (hero.currentLife > 0 && enemyState.remainingLife > 0 && roundIndex < MAX_ROUNDS_PER_WAVE) {
    roundIndex += 1;
    absoluteRoundRef.value += 1;

    const critInterval = Math.max(2, Math.round(1 / Math.max(hero.critRate, 0.05)));
    const comboInterval = hero.atkSpeed >= 1.2 ? 3 : hero.atkSpeed >= 1 ? 4 : 5;
    const isCrit = absoluteRoundRef.value % critInterval === 0;
    const isCombo = absoluteRoundRef.value % comboInterval === 0;
    const damageMultiplier = 1
      + (isCrit ? hero.critMultiplier - 1 : 0)
      + (isCombo ? HERO_COMBO_BONUS : 0);
    const heroDamage = Math.max(1, roundToInt(hero.atk * damageMultiplier, hero.atk));

    hero.totalDamageDealt += heroDamage;
    enemyState.remainingLife = Math.max(0, enemyState.remainingLife - heroDamage);
    enemyState.remainingCount = enemyState.remainingLife <= 0
      ? 0
      : Math.ceil(enemyState.remainingLife / Math.max(mission.enemyLife, 1));

    logs.push(buildHeroAttackLog({
      mission,
      roundIndex,
      damage: heroDamage,
      isCrit,
      isCombo,
      enemyState,
    }));

    if (enemyState.remainingLife <= 0) {
      logs.push(`第${mission.layerIndex}层第${mission.waveIndex}波结束：${mission.enemyName || '敌人'} 全部被击败。`);
      break;
    }

    const rawIncomingDamage = Math.max(1, enemyState.remainingCount * mission.enemyAtk);
    const bossMultiplier = bossWave ? 1.25 : 1;
    const incomingDamage = Math.max(
      1,
      roundToInt(rawIncomingDamage * bossMultiplier, rawIncomingDamage) - hero.guard,
    );

    hero.currentLife = Math.max(0, hero.currentLife - incomingDamage);
    hero.totalDamageTaken += incomingDamage;
    logs.push(buildEnemyAttackLog({
      mission,
      roundIndex,
      damage: incomingDamage,
      hero,
    }));
  }

  if (enemyState.remainingLife > 0 && hero.currentLife > 0) {
    hero.currentLife = 0;
    logs.push(`第${mission.layerIndex}层第${mission.waveIndex}波拖入持久战，英雄未能及时清场，判定本场战斗失败。`);
  }

  return enemyState;
}

function runBattleSimulation({ profile, session, chapters }) {
  const chapter = chapters.find((item) => item.id === session.chapterId) || null;
  const missionRows = getChapterMissionRows(session.chapterId);
  const startIndex = getMissionStartIndex(missionRows, session);
  const missionsToSimulate = missionRows.slice(startIndex);

  if (missionsToSimulate.length === 0) {
    throw new Error('当前章节缺少可模拟的 Mission 波次');
  }

  const hero = buildHeroSnapshot({
    profile,
    chapterId: session.chapterId,
    chapters,
  });
  const logs = [];
  const absoluteRoundRef = { value: 0 };
  const totalWaveCount = missionsToSimulate.length;
  const totalEnemyCount = missionsToSimulate.reduce((sum, mission) => sum + mission.enemyCount, 0);
  const totalEnemyLife = missionsToSimulate.reduce(
    (sum, mission) => sum + (mission.enemyCount * mission.enemyLife),
    0,
  );
  const rewards = {
    coin: 0,
    exp: 0,
  };

  let clearedWaves = 0;
  let lastMission = missionsToSimulate[0];
  let failedEnemyState = null;

  for (let index = 0; index < missionsToSimulate.length; index += 1) {
    const mission = missionsToSimulate[index];
    lastMission = mission;

    const enemyState = simulateMissionWave({
      hero,
      mission,
      absoluteRoundRef,
      logs,
    });

    if (hero.currentLife <= 0) {
      failedEnemyState = enemyState;
      break;
    }

    clearedWaves += 1;
    rewards.coin += mission.coinDrop;
    rewards.exp += mission.expDrop;

    if (index < missionsToSimulate.length - 1) {
      const recoverLife = Math.min(
        hero.maxLife - hero.currentLife,
        Math.max(0, roundToInt(hero.maxLife * POST_WAVE_RECOVER_RATE, 0)),
      );
      if (recoverLife > 0) {
        hero.currentLife += recoverLife;
        logs.push(`波次间隙：英雄恢复 ${recoverLife} 点生命，当前生命 ${hero.currentLife}/${hero.maxLife}。`);
      }
    }
  }

  const result = hero.currentLife > 0 ? 'victory' : 'defeat';
  const summaryText = buildSimulationSummary({
    result,
    hero,
    chapter,
    totalWaves: totalWaveCount,
    clearedWaves,
    rewards,
  });
  const currentWave = failedEnemyState
    ? buildEnemyWaveSnapshot(lastMission, failedEnemyState, false)
    : buildEnemyWaveSnapshot(lastMission, null, true);

  return {
    result,
    summaryText,
    logs,
    rewards,
    finalMission: lastMission,
    hero: {
      ...hero,
      status: result === 'victory' ? 'survived' : 'fallen',
      previewText: `${hero.name} / 生命 ${hero.currentLife}/${hero.maxLife} / 攻击 ${hero.atk}`,
    },
    enemy: {
      chapterId: session.chapterId,
      chapterName: chapter?.name || '',
      totalWaveCount,
      clearedWaveCount: clearedWaves,
      remainingWaveCount: Math.max(0, totalWaveCount - clearedWaves),
      totalEnemyCount,
      remainingEnemyCount: currentWave.remainingCount,
      totalEnemyLife,
      remainingEnemyLife: currentWave.remainingLife,
      currentWave,
      previewText: `${chapter?.name || '当前章节'} / 已清 ${clearedWaves}/${totalWaveCount} 波`,
    },
  };
}

function runSingleMissionSimulation({ profile, session, chapters }) {
  const chapter = chapters.find((item) => item.id === session.chapterId) || null;
  const missionRows = getChapterMissionRows(session.chapterId);
  const startIndex = getMissionStartIndex(missionRows, session);
  const mission = missionRows[startIndex];

  if (!mission) {
    throw new Error('当前章节缺少可模拟的 Mission 波次');
  }

  const hero = buildHeroSnapshot({
    profile,
    chapterId: session.chapterId,
    chapters,
  });
  const logs = [];
  const absoluteRoundRef = { value: 0 };
  const enemyState = simulateMissionWave({
    hero,
    mission,
    absoluteRoundRef,
    logs,
  });
  const victory = hero.currentLife > 0;
  const clearedWaves = victory ? 1 : 0;
  const result = victory ? 'victory' : 'defeat';
  const rewards = {
    coin: victory ? mission.coinDrop : 0,
    exp: victory ? mission.expDrop : 0,
  };
  const isFinalWave = startIndex >= missionRows.length - 1;
  const isBossWave = isBossMission(mission);
  const nextMission = victory && !isFinalWave ? missionRows[startIndex + 1] : null;
  const summaryText = buildSimulationSummary({
    result,
    hero,
    chapter,
    totalWaves: 1,
    clearedWaves,
    rewards,
  });

  return {
    result,
    summaryText,
    logs,
    rewards,
    finalMission: mission,
    nextMission,
    isBossWave,
    isFinalWave,
    nextState: !victory || isFinalWave || isBossWave ? 'finished' : 'choice',
    hero: {
      ...hero,
      status: victory ? 'survived' : 'fallen',
      previewText: `${hero.name} / 生命 ${hero.currentLife}/${hero.maxLife} / 攻击 ${hero.atk}`,
    },
    enemy: {
      chapterId: session.chapterId,
      chapterName: chapter?.name || '',
      totalWaveCount: missionRows.length,
      clearedWaveCount: startIndex + clearedWaves,
      remainingWaveCount: Math.max(0, missionRows.length - startIndex - clearedWaves),
      totalEnemyCount: mission.enemyCount,
      remainingEnemyCount: victory ? 0 : enemyState.remainingCount,
      totalEnemyLife: mission.enemyCount * mission.enemyLife,
      remainingEnemyLife: victory ? 0 : enemyState.remainingLife,
      currentWave: buildEnemyWaveSnapshot(mission, enemyState, victory),
      nextWave: nextMission ? buildEnemyWaveSnapshot(nextMission) : null,
      previewText: `${chapter?.name || '当前章节'} / 已清 ${startIndex + clearedWaves}/${missionRows.length} 波`,
    },
  };
}

async function persistSimulationResult({ prisma, playerId, simulation }) {
  const mission = simulation.finalMission;

  return prisma.playerBattleSession.update({
    where: {
      playerId,
    },
    data: {
      layerIndex: mission.layerIndex,
      waveIndex: mission.waveIndex,
      missionId: mission.id,
      waveType: mission.waveType,
      enemyId: mission.enemyId,
      enemyName: mission.enemyName,
      enemyCount: mission.enemyCount,
      enemyLife: mission.enemyLife,
      enemyAtk: mission.enemyAtk,
      result: simulation.result,
      settledAt: null,
    },
  });
}

async function persistStepSimulationResult({ prisma, playerId, simulation }) {
  const mission = simulation.nextMission || simulation.finalMission;

  return prisma.playerBattleSession.update({
    where: {
      playerId,
    },
    data: {
      layerIndex: mission.layerIndex,
      waveIndex: mission.waveIndex,
      missionId: mission.id,
      waveType: mission.waveType,
      enemyId: mission.enemyId,
      enemyName: mission.enemyName,
      enemyCount: mission.enemyCount,
      enemyLife: mission.enemyLife,
      enemyAtk: mission.enemyAtk,
      status: simulation.nextState,
      result: simulation.nextState === 'finished' ? simulation.result : null,
      settledAt: null,
    },
  });
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

async function loadActiveBattleContext({ account }) {
  const prisma = getPrismaClient();
  const { player, progress, profile } = await getPlayerProfileByAccount({ account });
  const session = await prisma.playerBattleSession.findUnique({
    where: {
      playerId: player.id,
    },
  });

  if (!session || session.status !== 'active') {
    throw new Error('当前没有进行中的战斗会话');
  }

  return {
    prisma,
    player,
    progress,
    profile,
    session,
    chapters: getChapterConfigRows(),
  };
}

async function simulateBattleSession({ account }) {
  const context = await loadActiveBattleContext({ account });
  const simulation = runBattleSimulation({
    profile: context.profile,
    session: context.session,
    chapters: context.chapters,
  });
  const session = await persistSimulationResult({
    prisma: context.prisma,
    playerId: context.player.id,
    simulation,
  });

  return {
    profile: context.profile,
    session: buildBattleSessionPayload(session, context.chapters),
    hero: simulation.hero,
    enemy: simulation.enemy,
    roundLogs: simulation.logs,
    result: simulation.result,
    summaryText: simulation.summaryText,
    rewards: simulation.rewards,
  };
}

async function simulateBattleSessionStep({ account }) {
  const context = await loadActiveBattleContext({ account });
  const simulation = runSingleMissionSimulation({
    profile: context.profile,
    session: context.session,
    chapters: context.chapters,
  });
  const session = await persistStepSimulationResult({
    prisma: context.prisma,
    playerId: context.player.id,
    simulation,
  });

  return {
    profile: context.profile,
    session: buildBattleSessionPayload(session, context.chapters),
    hero: simulation.hero,
    enemy: simulation.enemy,
    roundLogs: simulation.logs,
    result: simulation.result,
    summaryText: simulation.summaryText,
    rewards: simulation.rewards,
    flow: {
      mode: 'step',
      nextState: simulation.nextState,
      requiresSkillChoice: simulation.nextState === 'choice',
      canSettle: simulation.nextState === 'finished',
      isBossWave: simulation.isBossWave,
      isFinalWave: simulation.isFinalWave,
      nextMissionId: simulation.nextMission?.id || null,
    },
  };
}

async function settleBattleSession({ account }) {
  const prisma = getPrismaClient();
  const { player, progress, profile } = await getPlayerProfileByAccount({ account });
  const context = {
    prisma,
    player,
    progress,
    profile,
    session: await prisma.playerBattleSession.findUnique({
      where: {
        playerId: player.id,
      },
    }),
    chapters: getChapterConfigRows(),
  };

  if (!context.session || !['active', 'finished'].includes(context.session.status)) {
    throw new Error('当前没有可结算的战斗会话');
  }

  const simulation = context.session.status === 'finished' && context.session.result
    ? null
    : runBattleSimulation({
        profile: context.profile,
        session: context.session,
        chapters: context.chapters,
      });
  const session = simulation
    ? await persistSimulationResult({
        prisma: context.prisma,
        playerId: context.player.id,
        simulation,
      })
    : context.session;
  const resolvedResult = normalizeResult(simulation?.result || session.result);

  const maxChapterId = context.chapters.length || context.progress.highestUnlockedChapterId;
  const nextProgress = await context.prisma.playerProgress.update({
    where: {
      playerId: context.player.id,
    },
    data: resolvedResult === 'victory'
      ? {
          currentChapterId: Math.min(session.chapterId + 1, maxChapterId),
          highestUnlockedChapterId: Math.max(
            context.progress.highestUnlockedChapterId,
            Math.min(session.chapterId + 1, maxChapterId),
          ),
        }
      : {
          currentChapterId: session.chapterId,
        },
  });

  const settledSession = await context.prisma.playerBattleSession.update({
    where: {
      playerId: context.player.id,
    },
    data: {
      status: 'settled',
      result: resolvedResult,
      settledAt: new Date(),
    },
  });

  const currentChapter = context.chapters.find((item) => item.id === nextProgress.currentChapterId) || null;
  const justUnlockedChapter = resolvedResult === 'victory'
    ? context.chapters.find((item) => item.id === nextProgress.highestUnlockedChapterId) || null
    : null;

  return {
    profile: {
      ...context.profile,
      currentChapterId: nextProgress.currentChapterId,
      highestUnlockedChapterId: nextProgress.highestUnlockedChapterId,
    },
    progress: sanitizeProgress(nextProgress),
    session: buildBattleSessionPayload(settledSession, context.chapters),
    settlement: {
      result: resolvedResult,
      currentChapter,
      justUnlockedChapter,
      summaryText: simulation?.summaryText || (
        resolvedResult === 'victory'
          ? '本局战斗已胜利，章节进度已结算。'
          : '本局战斗失败，可返回章节页重试当前章节。'
      ),
      nextAction: resolvedResult === 'victory'
        ? '返回章节页并刷新到最新解锁进度'
        : '可返回章节页重试当前章节',
    },
  };
}

module.exports = {
  getPlayerBattleSessionByAccount,
  sanitizeBattleSession,
  settleBattleSession,
  simulateBattleSession,
  simulateBattleSessionStep,
  startBattleSession,
};
