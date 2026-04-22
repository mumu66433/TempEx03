const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

function toCamelCase(name) {
  return String(name || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, chr) => chr.toUpperCase())
    .replace(/^([A-Z])/, (match) => match.toLowerCase());
}

function normalizeSheetKey(name) {
  const keySource = String(name || '').trim();
  const parsed = path.parse(keySource);
  const filename = parsed.name || keySource;
  const dotIndex = filename.lastIndexOf('.');
  const rawName = dotIndex > 0 ? filename.slice(dotIndex + 1) : filename;
  const key = toCamelCase(rawName);
  return key.endsWith('s') ? key : `${key}s`;
}

function parseValueByType(value, type) {
  if (value == null || value === '') {
    return null;
  }

  const normalizedType = String(type || 'any').trim().toLowerCase();
  if (normalizedType === 'any') {
    return value;
  }

  if (normalizedType === 'int' || normalizedType === 'intid') {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
      throw new Error(`值 "${value}" 不能转换为 int`);
    }
    return parsed;
  }

  if (normalizedType === 'float' || normalizedType === 'double' || normalizedType === 'number') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`值 "${value}" 不能转换为 float`);
    }
    return parsed;
  }

  if (normalizedType === 'bool' || normalizedType === 'boolean') {
    if (typeof value === 'boolean') {
      return value;
    }
    const lower = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lower)) {
      return true;
    }
    if (['false', '0', 'no', 'n'].includes(lower)) {
      return false;
    }
    throw new Error(`值 "${value}" 不能转换为 bool`);
  }

  if (normalizedType === 'string') {
    return String(value);
  }

  if (normalizedType === 'json') {
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(String(value));
    } catch (error) {
      throw new Error(`值 "${value}" 不是合法 JSON`);
    }
  }

  if (normalizedType === 'array') {
    if (Array.isArray(value)) {
      return value;
    }
    const raw = String(value).trim();
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return raw.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }

  throw new Error(`不支持的字段类型：${type}`);
}

function parseSheet(sheet, sheetName) {
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (rawRows.length < 3) {
    throw new Error('Excel 表格必须包含字段行、备注行和类型行');
  }

  const headers = rawRows[0].map(toCamelCase);
  const descriptionRow = rawRows[1];
  const typeRow = rawRows[2];
  const descriptions = headers.reduce((acc, header, index) => {
    acc[header] = descriptionRow[index] != null ? String(descriptionRow[index]) : '';
    return acc;
  }, {});
  const types = headers.reduce((acc, header, index) => {
    const rawType = typeRow[index] != null ? String(typeRow[index]).trim().toLowerCase() : 'any';
    acc[header] = rawType || 'any';
    return acc;
  }, {});

  const rows = rawRows.slice(3)
    .map((row, rowIndex) => {
      if (!row || row.every((cell) => cell == null || cell === '')) {
        return null;
      }

      return headers.reduce((obj, header, index) => {
        const rawValue = row[index] != null ? row[index] : null;
        try {
          obj[header] = parseValueByType(rawValue, types[header]);
        } catch (error) {
          throw new Error(`工作表 ${sheetName} 字段 ${header} 第 ${rowIndex + 4} 行：${error.message}`);
        }
        return obj;
      }, {});
    })
    .filter(Boolean);

  Object.entries(types).forEach(([header, type]) => {
    if (type === 'intid' || header.toLowerCase() === 'intid') {
      const seen = new Set();
      rows.forEach((row, rowIndex) => {
        const value = row[header];
        if (value == null) {
          return;
        }
        if (seen.has(value)) {
          throw new Error(`工作表 ${sheetName} 字段 ${header} 第 ${rowIndex + 4} 行：值 ${value} 重复，intId 必须唯一`);
        }
        seen.add(value);
      });
    }
  });

  return { headers, descriptions, types, rows };
}

function findReferenceSheetKey(refName, sheetKeys) {
  const normalizedRef = refName.toLowerCase();
  if (sheetKeys.includes(normalizedRef)) {
    return normalizedRef;
  }

  const singularRef = normalizedRef.replace(/s$/, '');
  if (sheetKeys.includes(singularRef)) {
    return singularRef;
  }

  if (sheetKeys.includes(`${singularRef}s`)) {
    return `${singularRef}s`;
  }

  return sheetKeys.find((key) => {
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey.endsWith(singularRef) ||
      singularRef.endsWith(normalizedKey) ||
      normalizedRef.includes(normalizedKey) ||
      normalizedKey.includes(normalizedRef)
    );
  });
}

function isGlobalSettingsSheet(sheetKey) {
  const normalized = sheetKey.toLowerCase();
  return ['globalsettings', 'globals', 'settings', 'gameconfig', 'config', 'gameSettings'.toLowerCase()].includes(normalized);
}

function buildGlobalSettings(rows) {
  return rows.reduce((settings, row) => {
    const key = row.key || row.name || row.setting || row.settingKey || row.configKey;
    if (!key) {
      return settings;
    }
    const value = row.value ?? row.default ?? row.settingValue ?? row.configValue;
    settings[String(key)] = value;
    return settings;
  }, {});
}

function resolveReferences(config) {
  const sheetKeys = Object.keys(config.sheets);
  const indexMaps = sheetKeys.reduce((acc, sheetKey) => {
    const rows = config.sheets[sheetKey].rows;
    const idIndex = rows.reduce((map, row) => {
      if (row.id != null) {
        map[String(row.id)] = row;
      }
      return map;
    }, {});

    acc[sheetKey] = idIndex;
    return acc;
  }, {});

  sheetKeys.forEach((sheetKey) => {
    config.sheets[sheetKey].rows.forEach((row) => {
      Object.keys(row).forEach((field) => {
        if (!field.endsWith('Id') || row[field] == null) {
          return;
        }

        const refName = field.slice(0, -2);
        const targetSheetKey = findReferenceSheetKey(refName, sheetKeys);
        if (!targetSheetKey) {
          return;
        }

        const targetIndex = indexMaps[targetSheetKey];
        if (!targetIndex) {
          return;
        }

        const rawValue = row[field];
        if (typeof rawValue === 'string' && rawValue.includes(',')) {
          row[refName] = rawValue
            .split(',')
            .map((item) => String(item).trim())
            .filter(Boolean)
            .map((id) => targetIndex[id])
            .filter(Boolean);
        } else {
          row[refName] = targetIndex[String(rawValue)] || null;
        }
      });
    });
  });
}

function loadExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`Excel 文件没有工作表: ${filePath}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const parsed = parseSheet(sheet, sheetName);
  return parsed;
}

function isConfigWorkbookFile(file) {
  if (!file.endsWith('.xlsx') && !file.endsWith('.xls')) {
    return false;
  }

  const baseName = path.basename(file);
  if (baseName.startsWith('.') || baseName.startsWith('~$') || baseName.startsWith('.~')) {
    return false;
  }

  return true;
}

function loadGameConfig(dirPath = path.resolve(__dirname, '..', 'assets', 'config')) {
  if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
    throw new Error(`Excel 配置目录不存在: ${dirPath}`);
  }

  const config = { sheets: {} };
  const files = fs.readdirSync(dirPath).filter(isConfigWorkbookFile);
  if (files.length === 0) {
    throw new Error(`Excel 配置目录中未找到任何 XLSX 文件: ${dirPath}`);
  }

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    const sheetKey = normalizeSheetKey(file);
    const parsed = loadExcelFile(filePath);
    config.sheets[sheetKey] = parsed;
    config[sheetKey] = parsed.rows;
    if (isGlobalSettingsSheet(sheetKey)) {
      config.globalSettings = buildGlobalSettings(parsed.rows);
    }
  });

  resolveReferences(config);
  return config;
}

module.exports = { loadGameConfig, isConfigWorkbookFile };
