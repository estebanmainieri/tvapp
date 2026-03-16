import { getItem, setItem, KEYS } from './storage';

export interface CustomStream {
  id: string;
  type: 'youtube' | 'twitch' | 'm3u_url';
  url: string;
  label: string;
  addedAt: number;
}

export async function getCustomStreams(): Promise<CustomStream[]> {
  return (await getItem<CustomStream[]>(KEYS.CUSTOM_STREAMS)) ?? [];
}

export async function addCustomStream(
  stream: Omit<CustomStream, 'id' | 'addedAt'>,
): Promise<CustomStream[]> {
  const streams = await getCustomStreams();
  const newStream: CustomStream = {
    ...stream,
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
  };
  const updated = [newStream, ...streams];
  await setItem(KEYS.CUSTOM_STREAMS, updated);
  return updated;
}

export async function removeCustomStream(id: string): Promise<CustomStream[]> {
  const streams = await getCustomStreams();
  const updated = streams.filter(s => s.id !== id);
  await setItem(KEYS.CUSTOM_STREAMS, updated);
  return updated;
}
