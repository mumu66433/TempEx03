import { fetchChapterConfig, fetchHealth, fetchPlayerChapters, fetchPlayerProfile, updatePlayerCurrentChapter } from './api.js';
import { DEFAULT_PLAYER } from './gameData.js';
import { getSavedPlayer, savePlayer } from '../utils/storage.js';

const session = {
  chapters: [],
  chapterOverview: null,
  profile: null,
  backend: {
    ready: false,
    lastCheckedAt: '',
    message: '尚未检查后端状态',
  },
};

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function buildPlayerProfile(payload = {}) {
  const chapterId = normalizePositiveInteger(payload.currentChapterId ?? payload.chapterId, 1);
  const highestUnlockedChapterId = normalizePositiveInteger(payload.highestUnlockedChapterId, chapterId);

  return {
    name: payload.name || payload.nickname || payload.account || DEFAULT_PLAYER.name,
    nickname: payload.nickname || payload.name || payload.account || DEFAULT_PLAYER.nickname,
    account: payload.account || '',
    chapterId,
    currentChapterId: chapterId,
    highestUnlockedChapterId,
    lastLoginAt: payload.lastLoginAt || '',
  };
}

function mergeChapterMeta(chapters, overview) {
  const chapterList = Array.isArray(chapters) ? chapters : [];
  const overviewList = Array.isArray(overview?.chapters) ? overview.chapters : [];
  const overviewMap = new Map(overviewList.map((chapter) => [Number(chapter.id), chapter]));

  return chapterList.map((chapter) => {
    const matched = overviewMap.get(Number(chapter.id)) || {};
    return {
      ...chapter,
      unlocked: matched.unlocked ?? false,
      isCurrent: matched.isCurrent ?? false,
    };
  });
}

function updateBackendStatus(nextState) {
  session.backend = {
    ...session.backend,
    ...nextState,
    lastCheckedAt: new Date().toISOString(),
  };
}

export async function refreshBackendStatus() {
  try {
    const payload = await fetchHealth();
    updateBackendStatus({
      ready: true,
      message: payload?.time ? `后端在线：${payload.time}` : '后端在线',
    });
  } catch (error) {
    updateBackendStatus({
      ready: false,
      message: error.message || '后端不可用',
    });
  }

  return session.backend;
}

export async function refreshChapterConfigs() {
  session.chapters = await fetchChapterConfig();
  return session.chapters;
}

export function getSession() {
  return session;
}

export function getCurrentPlayer() {
  return session.profile || getSavedPlayer();
}

export async function bootstrapSession() {
  await refreshBackendStatus();

  try {
    await refreshChapterConfigs();
  } catch {
    session.chapters = [];
  }

  const savedPlayer = getSavedPlayer();
  if (!savedPlayer.account) {
    session.profile = null;
    session.chapterOverview = null;
    return session;
  }

  try {
    await refreshPlayerSession(savedPlayer.account);
  } catch {
    session.profile = savedPlayer;
    session.chapterOverview = null;
  }

  return session;
}

export async function refreshPlayerSession(account = getCurrentPlayer().account) {
  if (!account) {
    throw new Error('账号不能为空');
  }

  await refreshBackendStatus();
  await refreshChapterConfigs();

  const [profilePayload, chapterPayload] = await Promise.all([
    fetchPlayerProfile(account),
    fetchPlayerChapters(account),
  ]);

  session.profile = buildPlayerProfile(profilePayload.profile || profilePayload.player || {});
  session.chapterOverview = {
    currentChapterId: normalizePositiveInteger(chapterPayload.currentChapterId, session.profile.currentChapterId),
    highestUnlockedChapterId: normalizePositiveInteger(chapterPayload.highestUnlockedChapterId, session.profile.highestUnlockedChapterId),
    chapters: mergeChapterMeta(session.chapters, chapterPayload),
  };

  session.profile.currentChapterId = session.chapterOverview.currentChapterId;
  session.profile.chapterId = session.chapterOverview.currentChapterId;
  session.profile.highestUnlockedChapterId = session.chapterOverview.highestUnlockedChapterId;
  savePlayer(session.profile);
  return session;
}

export async function selectCurrentChapter(chapterId) {
  const account = getCurrentPlayer().account;
  if (!account) {
    throw new Error('账号不能为空');
  }

  await refreshBackendStatus();
  const payload = await updatePlayerCurrentChapter(account, chapterId);
  session.profile = buildPlayerProfile(payload.profile || payload.player || {});
  savePlayer(session.profile);
  await refreshPlayerSession(account);
  return session;
}

export function updateSessionAfterAuth(player) {
  session.profile = buildPlayerProfile(player);
  savePlayer(session.profile);
  session.chapterOverview = null;
  return session.profile;
}
