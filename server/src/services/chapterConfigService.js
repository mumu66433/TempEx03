const { getExcelSheet } = require('../config/excelLoader');

const WORKBOOK_STEM = 'C章节配置表.Chapter';

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toTextArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return String(value)
    .split(/[,\s/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildChapterDescription(chapter) {
  const parts = [
    `${chapter.chapter || `第${chapter.id}章`} · ${chapter.name || '未命名章节'}`,
    `关卡数 ${chapter.missionCount || '-'}`,
    `预计波次 ${chapter.totalWaveEstimate || '-'}`,
    `推荐生命 ${chapter.guessHeroLife || '-'}`,
    `推荐攻击 ${chapter.guessHeroAtk || '-'}`,
  ];

  return parts.join(' / ');
}

function normalizeChapterRow(row) {
  const chapter = {
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
    skillPoolRange: toTextArray(row.功法池范围),
    enemyTheme: toTextArray(row.敌人主题),
    waveTemplate: String(row.波数模板 || ''),
  };

  return {
    ...chapter,
    title: `${chapter.chapter || `第${chapter.id}章`} · ${chapter.name || '未命名章节'}`,
    description: buildChapterDescription(chapter),
  };
}

function getChapterConfigRows() {
  const sheet = getExcelSheet(WORKBOOK_STEM);

  if (!sheet) {
    throw new Error('章节配置未加载，请检查 server/src/assets/config/C章节配置表.Chapter.xlsx');
  }

  return sheet.records.map((row) => normalizeChapterRow(row));
}

function getChapterConfigPayload() {
  const chapters = getChapterConfigRows();

  return {
    chapters,
    count: chapters.length,
  };
}

module.exports = {
  buildChapterDescription,
  getChapterConfigRows,
  getChapterConfigPayload,
  normalizeChapterRow,
};
