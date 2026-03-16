import { UnifiedChannel } from '../types';
import { getItem, setItem, KEYS } from './storage';

export async function getFavorites(): Promise<UnifiedChannel[]> {
  return (await getItem<UnifiedChannel[]>(KEYS.FAVORITES)) ?? [];
}

export async function addFavorite(channel: UnifiedChannel): Promise<UnifiedChannel[]> {
  const favorites = await getFavorites();
  if (favorites.some(f => f.id === channel.id)) {
    return favorites;
  }
  const updated = [channel, ...favorites];
  await setItem(KEYS.FAVORITES, updated);
  return updated;
}

export async function removeFavorite(channelId: string): Promise<UnifiedChannel[]> {
  const favorites = await getFavorites();
  const updated = favorites.filter(f => f.id !== channelId);
  await setItem(KEYS.FAVORITES, updated);
  return updated;
}

export async function isFavorite(channelId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(f => f.id === channelId);
}
