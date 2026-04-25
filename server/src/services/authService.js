const crypto = require('crypto');
const { getPrismaClient } = require('../config/prisma');

const DEFAULT_PASSWORD = '123456';
const ACCOUNT_PREFIX = 'P';
const DEFAULT_CHAPTER_ID = 1;

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function normalizeNickname(nickname, fallback = '新用户') {
  const value = String(nickname || '').trim();
  return value || fallback;
}

function generateAccount() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${ACCOUNT_PREFIX}${stamp}${random}`;
}

function normalizeAccount(account) {
  const value = String(account || '').trim().toUpperCase();
  return value || null;
}

async function generateUniqueAccount(prisma) {
  for (let i = 0; i < 10; i += 1) {
    const account = generateAccount();
    const exists = await prisma.player.findUnique({
      where: { account },
      select: { id: true },
    });

    if (!exists) {
      return account;
    }
  }

  throw new Error('无法生成唯一账号，请重试');
}

function sanitizePlayer(player) {
  if (!player) {
    return null;
  }

  return {
    id: player.id,
    account: player.account,
    nickname: player.nickname,
    lastLoginAt: player.lastLoginAt,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

function sanitizeProgress(progress) {
  if (!progress) {
    return null;
  }

  return {
    currentChapterId: progress.currentChapterId,
    highestUnlockedChapterId: progress.highestUnlockedChapterId,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}

function buildPlayerProfile(player, progress) {
  const safePlayer = sanitizePlayer(player);
  const safeProgress = sanitizeProgress(progress);

  if (!safePlayer) {
    return null;
  }

  return {
    ...safePlayer,
    currentChapterId: safeProgress?.currentChapterId ?? DEFAULT_CHAPTER_ID,
    highestUnlockedChapterId: safeProgress?.highestUnlockedChapterId ?? DEFAULT_CHAPTER_ID,
  };
}

async function ensurePlayerProgress(prisma, playerId) {
  return prisma.playerProgress.upsert({
    where: { playerId },
    update: {},
    create: {
      playerId,
      currentChapterId: DEFAULT_CHAPTER_ID,
      highestUnlockedChapterId: DEFAULT_CHAPTER_ID,
    },
  });
}

async function registerPlayer({ account, password, nickname }) {
  const prisma = getPrismaClient();
  const normalizedPassword = String(password || DEFAULT_PASSWORD);

  return prisma.$transaction(async (tx) => {
    const normalizedAccount = normalizeAccount(account) || (await generateUniqueAccount(tx));

    if (!normalizedAccount) {
      throw new Error('账号不能为空');
    }

    const exists = await tx.player.findUnique({
      where: { account: normalizedAccount },
      select: { id: true },
    });
    if (exists) {
      throw new Error('账号已存在');
    }

    const player = await tx.player.create({
      data: {
        account: normalizedAccount,
        nickname: normalizeNickname(nickname, normalizedAccount),
        passwordHash: hashPassword(normalizedPassword),
      },
    });

    const progress = await tx.playerProgress.create({
      data: {
        playerId: player.id,
        currentChapterId: DEFAULT_CHAPTER_ID,
        highestUnlockedChapterId: DEFAULT_CHAPTER_ID,
      },
    });

    return {
      player: sanitizePlayer(player),
      progress: sanitizeProgress(progress),
      profile: buildPlayerProfile(player, progress),
      defaultPassword: normalizedPassword,
    };
  });
}

async function loginPlayer({ account, password }) {
  const prisma = getPrismaClient();
  const normalizedAccount = normalizeAccount(account);
  const normalizedPassword = String(password || '');

  if (!normalizedAccount || !normalizedPassword) {
    throw new Error('账号和密码不能为空');
  }

  const player = await prisma.player.findUnique({
    where: { account: normalizedAccount },
    include: {
      progress: true,
    },
  });

  if (!player) {
    throw new Error('账号不存在');
  }

  if (player.passwordHash !== hashPassword(normalizedPassword)) {
    throw new Error('密码错误');
  }

  const updatedPlayer = await prisma.player.update({
    where: { account: normalizedAccount },
    data: {
      lastLoginAt: new Date(),
    },
    include: {
      progress: true,
    },
  });

  const progress = updatedPlayer.progress || (await ensurePlayerProgress(prisma, updatedPlayer.id));

  return {
    player: sanitizePlayer(updatedPlayer),
    progress: sanitizeProgress(progress),
    profile: buildPlayerProfile(updatedPlayer, progress),
  };
}

async function getPlayerProfileByAccount({ account }) {
  const prisma = getPrismaClient();
  const normalizedAccount = normalizeAccount(account);

  if (!normalizedAccount) {
    throw new Error('账号不能为空');
  }

  const player = await prisma.player.findUnique({
    where: { account: normalizedAccount },
    include: {
      progress: true,
    },
  });

  if (!player) {
    throw new Error('账号不存在');
  }

  const progress = player.progress || (await ensurePlayerProgress(prisma, player.id));

  return {
    player: sanitizePlayer(player),
    progress: sanitizeProgress(progress),
    profile: buildPlayerProfile(player, progress),
  };
}

module.exports = {
  ACCOUNT_PREFIX,
  DEFAULT_CHAPTER_ID,
  DEFAULT_PASSWORD,
  buildPlayerProfile,
  ensurePlayerProgress,
  generateAccount,
  getPlayerProfileByAccount,
  hashPassword,
  loginPlayer,
  normalizeAccount,
  registerPlayer,
  sanitizePlayer,
  sanitizeProgress,
};
