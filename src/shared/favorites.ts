export type FavoriteType = 'analysis' | 'headline' | 'summary';

export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  content: string;
  label?: string;
  score?: number;
  createdAt: number;
}

const STORAGE_KEY = 'lpo_favorites';

export async function getFavorites(): Promise<FavoriteItem[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  } catch {
    return [];
  }
}

export async function addFavorite(item: Omit<FavoriteItem, 'id' | 'createdAt'>): Promise<FavoriteItem> {
  const favorites = await getFavorites();
  const newItem: FavoriteItem = {
    ...item,
    id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36),
    createdAt: Date.now(),
  };
  favorites.unshift(newItem);
  // Cap at 50
  await chrome.storage.local.set({ [STORAGE_KEY]: favorites.slice(0, 50) });
  return newItem;
}

export async function removeFavorite(id: string): Promise<void> {
  const favorites = await getFavorites();
  await chrome.storage.local.set({
    [STORAGE_KEY]: favorites.filter(f => f.id !== id),
  });
}

export async function isFavorited(type: FavoriteType, content: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(f => f.type === type && f.content === content);
}

export async function toggleFavorite(
  item: Omit<FavoriteItem, 'id' | 'createdAt'>
): Promise<{ added: boolean; count: number }> {
  const favorites = await getFavorites();
  const existing = favorites.find(f => f.type === item.type && f.content === item.content);
  if (existing) {
    const updated = favorites.filter(f => f.id !== existing.id);
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    return { added: false, count: updated.length };
  } else {
    const newItem: FavoriteItem = {
      ...item,
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: Date.now(),
    };
    const updated = [newItem, ...favorites].slice(0, 50);
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    return { added: true, count: updated.length };
  }
}

export async function getFavoritesCount(): Promise<number> {
  const favorites = await getFavorites();
  return favorites.length;
}
