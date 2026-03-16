import { UnifiedChannel } from '../types';
import { getItem, setItem, KEYS } from './storage';

const MAX_RECENT = 50;

interface RecentEntry {
  channel: UnifiedChannel;
  timestamp: number;
}

export async function getRecentlyWatched(): Promise<UnifiedChannel[]> {
  const entries = (await getItem<RecentEntry[]>(KEYS.RECENTLY_WATCHED)) ?? [];
  return entries.map(e => e.channel);
}

export async function addRecentlyWatched(channel: UnifiedChannel): Promise<void> {
  const entries = (await getItem<RecentEntry[]>(KEYS.RECENTLY_WATCHED)) ?? [];
  const filtered = entries.filter(e => e.channel.id !== channel.id);
  const updated = [{ channel, timestamp: Date.now() }, ...filtered].slice(
    0,
    MAX_RECENT,
  );
  await setItem(KEYS.RECENTLY_WATCHED, updated);
}
