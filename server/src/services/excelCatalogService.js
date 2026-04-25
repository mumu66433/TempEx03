const { getExcelConfigs } = require('../config/excelLoader');

function getWorkbookBySuffix(suffix) {
  const workbook = Object.entries(getExcelConfigs()).find(([name]) => name.endsWith(suffix));
  if (!workbook) {
    throw new Error(`未找到配置表 ${suffix}`);
  }

  return workbook[1];
}

function getPrimarySheetBySuffix(suffix) {
  const workbook = getWorkbookBySuffix(suffix);
  const sheetName = workbook.sheetNames?.[0];
  if (!sheetName || !workbook.sheets?.[sheetName]) {
    throw new Error(`配置表 ${suffix} 缺少可读取工作表`);
  }

  return workbook.sheets[sheetName];
}

module.exports = {
  getPrimarySheetBySuffix,
  getWorkbookBySuffix,
};
