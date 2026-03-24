import {
  IPTVRawChannel,
  IPTVRawStream,
  IPTVCategory,
  IPTVCountry,
  IPTVLanguage,
  UnifiedChannel,
  ChannelIndex,
} from '../../types';
import { isMainstreamChannel } from '../../data/mainstream';

const BASE_URL = 'https://iptv-org.github.io/api';

async function fetchJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  console.log(`[IPTV] Fetching ${url}...`);
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  console.log(`[IPTV] Fetched ${url} - ${Array.isArray(data) ? data.length + ' items' : 'ok'}`);
  return data as T;
}

export async function fetchChannels(): Promise<IPTVRawChannel[]> {
  return fetchJSON<IPTVRawChannel[]>(`${BASE_URL}/channels.json`);
}

export async function fetchStreams(): Promise<IPTVRawStream[]> {
  return fetchJSON<IPTVRawStream[]>(`${BASE_URL}/streams.json`);
}

export async function fetchCategories(): Promise<IPTVCategory[]> {
  return fetchJSON<IPTVCategory[]>(`${BASE_URL}/categories.json`);
}

export async function fetchCountries(): Promise<IPTVCountry[]> {
  return fetchJSON<IPTVCountry[]>(`${BASE_URL}/countries.json`);
}

export async function fetchLanguages(): Promise<IPTVLanguage[]> {
  return fetchJSON<IPTVLanguage[]>(`${BASE_URL}/languages.json`);
}

export function buildChannelIndex(
  rawChannels: IPTVRawChannel[],
  rawStreams: IPTVRawStream[],
  countryFilter?: string,
): ChannelIndex {
  // Build stream lookup: channel ID -> streams
  const streamsByChannel = new Map<string, IPTVRawStream[]>();
  for (const stream of rawStreams) {
    const existing = streamsByChannel.get(stream.channel);
    if (existing) {
      existing.push(stream);
    } else {
      streamsByChannel.set(stream.channel, [stream]);
    }
  }

  const all: UnifiedChannel[] = [];
  const byCategory = new Map<string, UnifiedChannel[]>();
  const byCountry = new Map<string, UnifiedChannel[]>();
  const byId = new Map<string, UnifiedChannel>();

  for (const raw of rawChannels) {
    const streams = streamsByChannel.get(raw.id);
    if (!streams || streams.length === 0) continue;
    if (raw.is_nsfw) continue;
    if (raw.closed) continue;
    if (!raw.name) continue;
    if (countryFilter && raw.country !== countryFilter) continue;

    // Pick best stream (prefer highest quality)
    const bestStream = pickBestStream(streams);

    const isMainstream = isMainstreamChannel(
      raw.id, raw.country, !!raw.logo, raw.categories,
    );

    const channel: UnifiedChannel = {
      id: raw.id,
      source: 'iptv',
      name: raw.name,
      logo: raw.logo || undefined,
      categories: raw.categories,
      country: raw.country || undefined,
      language: raw.languages?.[0] || undefined,
      streamUrl: bestStream.url,
      quality: bestStream.quality || undefined,
      isLive: true,
      isMainstream,
      channelNumber: all.length + 1,
      meta: {
        userAgent: bestStream.user_agent || undefined,
        referrer: bestStream.http_referrer || undefined,
      },
    };

    all.push(channel);
    byId.set(channel.id, channel);

    // Index by category
    for (const cat of channel.categories) {
      const list = byCategory.get(cat);
      if (list) {
        list.push(channel);
      } else {
        byCategory.set(cat, [channel]);
      }
    }

    // Index by country
    if (channel.country) {
      const list = byCountry.get(channel.country);
      if (list) {
        list.push(channel);
      } else {
        byCountry.set(channel.country, [channel]);
      }
    }
  }

  // Pre-sort alphabetically — avoids repeated sort in UI
  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  all.sort((a, b) => collator.compare(a.name, b.name));

  return { all, byCategory, byCountry, byId };
}


function pickBestStream(streams: IPTVRawStream[]): IPTVRawStream {
  // Single pass — find highest quality stream without filter+sort
  let best = streams[0];
  let bestQ = 0;
  for (const s of streams) {
    if (s.quality) {
      const q = parseInt(s.quality, 10);
      if (q > bestQ) {
        bestQ = q;
        best = s;
      }
    }
  }
  return best;
}
