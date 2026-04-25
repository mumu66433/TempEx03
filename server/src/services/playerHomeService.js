const { getPlayerProfileByAccount } = require('./authService');
const { getChapterConfigRows } = require('./chapterConfigService');
const { getDefaultRoleConfig } = require('./roleConfigService');
const { getPlayerSkillList } = require('./skillService');
const { getPlayerBattleSessionByAccount } = require('./battleSessionService');

async function getPlayerHomeOverview({ account }) {
  const { profile } = await getPlayerProfileByAccount({ account });
  const chapterRows = getChapterConfigRows();
  const currentChapter = chapterRows.find((chapter) => chapter.id === profile.currentChapterId) || null;
  const role = getDefaultRoleConfig();
  const skillList = await getPlayerSkillList({ account });
  const battleSession = await getPlayerBattleSessionByAccount({ account }).catch(() => null);

  return {
    profile,
    role,
    currentChapter,
    chapterOverview: {
      currentChapterId: profile.currentChapterId,
      highestUnlockedChapterId: profile.highestUnlockedChapterId,
      totalChapters: chapterRows.length,
      currentChapterTitle: currentChapter?.title || '',
    },
    skillSummary: skillList.summary,
    battleSession,
    display: {
      playerMeta: `${profile.account} / 已解锁至第${profile.highestUnlockedChapterId}章`,
      chapterSummary: currentChapter?.description || '当前暂无章节摘要',
    },
  };
}

module.exports = {
  getPlayerHomeOverview,
};
