const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const CONFIG_DIR = path.join(__dirname, '..', 'assets', 'config');

let cachedConfigs = null;

function isWorkbookFile(fileName) {
  return fileName.toLowerCase().endsWith('.xlsx') && !fileName.startsWith('~$') && !fileName.startsWith('.');
}

function normalizeCell(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return String(value);
}

function parseArrayValue(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  const text = String(value).trim();
  if (!text) {
    return [];
  }

  if (text.startsWith('[') || text.startsWith('{')) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseValue(type, value, fieldName, workbookName, sheetName, rowIndex) {
  const normalizedType = String(type || 'any').trim().toLowerCase();
  const rawValue = normalizeCell(value);

  if (rawValue === null || rawValue === '') {
    return normalizedType === 'array' ? [] : null;
  }

  switch (normalizedType) {
    case 'int':
    case 'intid': {
      const number = Number(rawValue);
      if (!Number.isInteger(number)) {
        throw new Error(
          `[excelLoader] ${workbookName}.${sheetName} 第 ${rowIndex} 行字段 ${fieldName} 需要整数，实际为 ${rawValue}`,
        );
      }
      return number;
    }
    case 'number': {
      const number = Number(rawValue);
      if (!Number.isFinite(number)) {
        throw new Error(
          `[excelLoader] ${workbookName}.${sheetName} 第 ${rowIndex} 行字段 ${fieldName} 需要数字，实际为 ${rawValue}`,
        );
      }
      return number;
    }
    case 'json': {
      if (typeof value === 'object') {
        return value;
      }

      return JSON.parse(String(rawValue));
    }
    case 'array':
      return parseArrayValue(value);
    case 'string':
      return String(rawValue);
    case 'any':
    default:
      return value;
  }
}

function parseSheet(workbookName, sheetName, sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });

  const fieldNames = (rows[0] || []).map(normalizeCell);
  const fieldDescriptions = (rows[1] || []).map(normalizeCell);
  const fieldTypes = (rows[2] || []).map(normalizeCell);

  const records = rows.slice(3)
    .filter((row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== ''))
    .map((row, rowIndex) => {
      const record = {};
      fieldNames.forEach((fieldName, index) => {
        if (!fieldName) {
          return;
        }

        record[String(fieldName)] = parseValue(
          fieldTypes[index],
          row[index],
          String(fieldName),
          workbookName,
          sheetName,
          rowIndex + 4,
        );
      });
      return record;
    });

  return {
    workbookName,
    sheetName,
    fieldNames,
    fieldDescriptions,
    fieldTypes,
    records,
  };
}

function loadExcelConfigs() {
  const next = {};

  if (!fs.existsSync(CONFIG_DIR)) {
    cachedConfigs = next;
    return next;
  }

  for (const fileName of fs.readdirSync(CONFIG_DIR)) {
    if (!isWorkbookFile(fileName)) {
      continue;
    }

    const filePath = path.join(CONFIG_DIR, fileName);
    const workbookName = path.basename(fileName, path.extname(fileName));
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheets = {};

    for (const sheetName of workbook.SheetNames) {
      sheets[sheetName] = parseSheet(workbookName, sheetName, workbook.Sheets[sheetName]);
    }

    next[workbookName] = {
      fileName,
      filePath,
      sheetNames: [...workbook.SheetNames],
      sheets,
    };
  }

  cachedConfigs = next;
  return next;
}

function getExcelConfigs() {
  if (!cachedConfigs) {
    return loadExcelConfigs();
  }

  return cachedConfigs;
}

function getExcelWorkbook(workbookName) {
  return getExcelConfigs()[workbookName] || null;
}

function getExcelSheet(workbookName, sheetName) {
  const workbook = getExcelWorkbook(workbookName);
  if (!workbook) {
    return null;
  }

  if (sheetName) {
    return workbook.sheets[sheetName] || null;
  }

  const firstSheetName = workbook.sheetNames?.[0];
  return firstSheetName ? workbook.sheets[firstSheetName] || null : null;
}

module.exports = {
  loadExcelConfigs,
  getExcelConfigs,
  getExcelWorkbook,
  getExcelSheet,
};
