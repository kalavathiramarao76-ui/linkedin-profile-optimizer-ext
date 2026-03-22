const KEY = 'usage_count';
const MAX_FREE = 3;

export const getUsageCount = (): number => {
  return parseInt(localStorage.getItem(KEY) || '0', 10);
};

export const incrementUsage = (): number => {
  const n = getUsageCount() + 1;
  localStorage.setItem(KEY, String(n));
  window.dispatchEvent(new CustomEvent('usage-changed', { detail: n }));
  return n;
};

export const hasReachedLimit = (): boolean => {
  return getUsageCount() >= MAX_FREE;
};

export const MAX_FREE_USES = MAX_FREE;
