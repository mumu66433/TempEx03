const { getPrimarySheetBySuffix } = require('./excelCatalogService');

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getRoleConfigRows() {
  const sheet = getPrimarySheetBySuffix('.Role');

  return sheet.records.map((row) => ({
    id: toNumber(row.Id),
    name: String(row.name || ''),
    grade: String(row.grade || ''),
    position: String(row.position || ''),
    baseAtk: toNumber(row.baseAtk),
    baseLife: toNumber(row.baseLife),
    atkSpeed: toNumber(row.atkSpeed),
    critRate: toNumber(row.critRate),
    unlockType: String(row.unlockType || ''),
    passiveDesc: String(row.passiveDesc || ''),
  }));
}

function getDefaultRoleConfig() {
  return getRoleConfigRows()[0] || null;
}

module.exports = {
  getDefaultRoleConfig,
  getRoleConfigRows,
};
