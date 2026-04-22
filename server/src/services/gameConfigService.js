const { loadGameConfig } = require('../config/excelLoader');

let cachedGameConfig = null;
let cachedGameConfigError = null;
let gameConfigLoaded = false;

function ensureGameConfigLoaded() {
  if (gameConfigLoaded) {
    return;
  }

  gameConfigLoaded = true;
  try {
    cachedGameConfig = loadGameConfig();
  } catch (error) {
    cachedGameConfigError = error;
  }
}

function getGameConfigState() {
  ensureGameConfigLoaded();

  return {
    loaded: Boolean(cachedGameConfig),
    error: cachedGameConfigError ? cachedGameConfigError.message : null,
    sheetNames: cachedGameConfig ? Object.keys(cachedGameConfig.sheets || {}) : [],
    config: cachedGameConfig,
  };
}

module.exports = {
  getGameConfigState,
};
