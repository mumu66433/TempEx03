const crypto = require('crypto');
const { getPrismaClient } = require('../config/prisma');

const DEFAULT_PASSWORD = '123456';
const ACCOUNT_PREFIX = 'P';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function normalizeNickname(nickname) {
  const value = String(nickname || '').trim();
  return value || '新用户';
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

async function registerPlayer({ account, password }) {
  const prisma = getPrismaClient();
  const normalizedAccount = normalizeAccount(account) || (await generateUniqueAccount(prisma));
  const normalizedPassword = String(password || DEFAULT_PASSWORD);

  if (!normalizedAccount) {
    throw new Error('账号不能为空');
  }

  const exists = await prisma.player.findUnique({
    where: { account: normalizedAccount },
    select: { id: true },
  });
  if (exists) {
    throw new Error('账号已存在');
  }

  const player = await prisma.player.create({
    data: {
      account: normalizedAccount,
      nickname: normalizeNickname(normalizedAccount),
      passwordHash: hashPassword(normalizedPassword),
    },
  });

  return {
    player: sanitizePlayer(player),
    defaultPassword: normalizedPassword,
  };
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
  });

  return {
    player: sanitizePlayer(updatedPlayer),
  };
}

module.exports = {
  DEFAULT_PASSWORD,
  hashPassword,
  generateAccount,
  registerPlayer,
  loginPlayer,
  sanitizePlayer,
};
