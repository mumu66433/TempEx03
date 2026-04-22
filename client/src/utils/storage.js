const STORAGE_KEY = 'temp_ex03_account_profile';

const DEFAULT_ACCOUNT_PROFILE = {
  account: '',
  nickname: '少侠',
  name: '少侠',
};

export function getSavedAccountProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_ACCOUNT_PROFILE };
    }

    return {
      name: parsed.name || parsed.nickname || parsed.account || '少侠',
      nickname: parsed.nickname || parsed.name || parsed.account || '少侠',
      account: parsed.account || '',
    };
  } catch {
    return { ...DEFAULT_ACCOUNT_PROFILE };
  }
}

export function saveAccountProfile(player) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function clearAccountProfile() {
  localStorage.removeItem(STORAGE_KEY);
}
