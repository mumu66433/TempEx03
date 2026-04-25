const { getPrimarySheetBySuffix } = require('./excelCatalogService');

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getChapterWaveRows() {
  const sheet = getPrimarySheetBySuffix('.ChapterWave');

  return sheet.records.map((row) => ({
    id: toNumber(row.Id),
    chapterId: toNumber(row.chapterId),
    chapterName: String(row.chapterName || ''),
    layerIndex: toNumber(row.layerIndex),
    layerType: String(row.layerType || ''),
    waveCount: toNumber(row.waveCount),
    desc: String(row.desc || ''),
  }));
}

function getMissionRows() {
  const sheet = getPrimarySheetBySuffix('.Mission');

  return sheet.records.map((row) => ({
    id: toNumber(row.Id),
    chapterId: toNumber(row.chapterId),
    chapterName: String(row.chapterName || ''),
    layerIndex: toNumber(row.layerIndex),
    layerType: String(row.layerType || ''),
    waveIndex: toNumber(row.waveIndex),
    waveType: String(row.waveType || ''),
    enemyId: toNumber(row.enemyId),
    enemyName: String(row.enemyName || ''),
    enemyCount: toNumber(row.enemyCount),
    enemyLife: toNumber(row.enemyLife),
    enemyAtk: toNumber(row.enemyAtk),
    attackType: String(row.attackType || ''),
    coinDrop: toNumber(row.coinDrop),
    expDrop: toNumber(row.expDrop),
  }));
}

function getChapterMissionRows(chapterId) {
  return getMissionRows()
    .filter((row) => row.chapterId === Number(chapterId))
    .sort((a, b) => (a.layerIndex - b.layerIndex) || (a.waveIndex - b.waveIndex));
}

function getFirstMissionForChapter(chapterId) {
  return getChapterMissionRows(chapterId)[0] || null;
}

module.exports = {
  getChapterMissionRows,
  getChapterWaveRows,
  getFirstMissionForChapter,
  getMissionRows,
};
