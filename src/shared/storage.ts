import { Settings, ProfileAnalysis } from './types';
import { DEFAULT_ENDPOINT, DEFAULT_MODEL } from './constants';

const DEFAULT_SETTINGS: Settings = {
  endpoint: DEFAULT_ENDPOINT,
  model: DEFAULT_MODEL,
  theme: 'dark',
};

export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...result.settings };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ settings: updated });
  return updated;
}

export async function getLastAnalysis(): Promise<ProfileAnalysis | null> {
  try {
    const result = await chrome.storage.local.get('lastAnalysis');
    return result.lastAnalysis || null;
  } catch {
    return null;
  }
}

export async function saveAnalysis(analysis: ProfileAnalysis): Promise<void> {
  await chrome.storage.local.set({ lastAnalysis: analysis });
}

export async function getHistory(): Promise<ProfileAnalysis[]> {
  try {
    const result = await chrome.storage.local.get('analysisHistory');
    return result.analysisHistory || [];
  } catch {
    return [];
  }
}

export async function addToHistory(analysis: ProfileAnalysis): Promise<void> {
  const history = await getHistory();
  history.unshift(analysis);
  // Keep last 20 analyses
  await chrome.storage.local.set({ analysisHistory: history.slice(0, 20) });
}
