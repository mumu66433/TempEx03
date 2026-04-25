const { getPrismaClient } = require('../config/prisma');
const { getChapterConfigRows } = require('./chapterConfigService');
const {
  DEFAULT_CHAPTER_ID,
  buildPlayerProfile,
  getPlayerProfileByAccount,
  sanitizeProgress,
} = require('./authService');

function normalizePositiveInteger(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} 必须是正整数`);
  }

  return number;
}

async function updateCurrentChapter({ account, chapterId }) {
  const prisma = getPrismaClient();
  const normalizedChapterId = normalizePositiveInteger(chapterId, 'chapterId');
  const { player, progress } = await getPlayerProfileByAccount({ account });
  const maxChapterId = getChapterConfigRows().length || DEFAULT_CHAPTER_ID;

  if (normalizedChapterId > maxChapterId) {
    throw new Error('章节不存在');
  }

  if (normalizedChapterId > progress.highestUnlockedChapterId) {
    throw new Error('目标章节尚未解锁');
  }

  const nextProgress = await prisma.playerProgress.update({
    where: { playerId: player.id },
    data: {
      currentChapterId: normalizedChapterId,
    },
  });

  return {
    player,
    progress: sanitizeProgress(nextProgress),
    profile: buildPlayerProfile(player, nextProgress),
  };
}

async function getPlayerChapterOverview({ account }) {
  const { profile } = await getPlayerProfileByAccount({ account });
  const chapters = getChapterConfigRows();

  return {
    currentChapterId: profile.currentChapterId,
    highestUnlockedChapterId: profile.highestUnlockedChapterId,
    chapters: chapters.map((chapter) => ({
      ...chapter,
      unlocked: chapter.id <= profile.highestUnlockedChapterId,
      isCurrent: chapter.id === profile.currentChapterId,
    })),
    count: chapters.length,
  };
}

module.exports = {
  getPlayerChapterOverview,
  updateCurrentChapter,
};
