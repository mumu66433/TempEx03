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
    },
    skillSummary: skillList.summary,
    battleSession,
  };
}

module.exports = {
  getPlayerHomeOverview,
};
