const { getExcelSheet } = require('../config/excelLoader');

const WORKBOOK_STEM = 'C章节配置表.Chapter';

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getChapterConfigRows() {
  const sheet = getExcelSheet(WORKBOOK_STEM);

  if (!sheet) {
    throw new Error('章节配置未加载，请检查 server/src/assets/config/C章节配置表.Chapter.xlsx');
  }

  return sheet.records.map((row) => ({
    id: toNumber(row.Id),
    chapter: String(row.章节 || ''),
    name: String(row.名称 || ''),
    missionId: toNumber(row.关卡ID),
    missionCount: toNumber(row.章节层数),
    guessHeroLife: toNumber(row.推测英雄生命),
    guessHeroAtk: toNumber(row.推测英雄攻击),
    normalWaveRule: String(row.普通层波数规则 || ''),
    bossWaveCount: toNumber(row.BOSS层波数),
    waveCycle: String(row.波数周期 || ''),
    totalWaveEstimate: toNumber(row.总波数估算),
  }));
}

function getChapterConfigPayload() {
  const chapters = getChapterConfigRows();

  return {
    chapters,
    count: chapters.length,
  };
}

module.exports = {
  getChapterConfigRows,
  getChapterConfigPayload,
};
