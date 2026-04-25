import { fetchChapterConfig, fetchPlayerChapters, fetchPlayerProfile, updatePlayerCurrentChapter } from './api.js';
import { DEFAULT_PLAYER } from './gameData.js';
import { getSavedPlayer, savePlayer } from '../utils/storage.js';

const session = {
  chapters: [],
  chapterOverview: null,
  profile: null,
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

export function getSession() {
  return session;
}

export function getCurrentPlayer() {
  return session.profile || getSavedPlayer();
}

export async function bootstrapSession() {
  try {
    session.chapters = await fetchChapterConfig();
  } catch {
    session.chapters = [];
  }

  const savedPlayer = getSavedPlayer();
  if (!savedPlayer.account) {
    session.profile = null;
    session.chapterOverview = null;
    return session;
  }

  await refreshPlayerSession(savedPlayer.account);
  return session;
}

export async function refreshPlayerSession(account = getCurrentPlayer().account) {
  if (!account) {
    throw new Error('账号不能为空');
  }

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
