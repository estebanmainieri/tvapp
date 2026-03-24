import { useQuery } from '@tanstack/react-query';
import {
  fetchChannels,
  fetchStreams,
  fetchCountries,
  fetchLanguages,
  buildChannelIndex,
} from '../services/iptv/iptvApi';
import { parseM3U } from '../services/iptv/m3uParser';
import { getFreeTVUrl } from '../data/channelSources';
import { resolveYouTubeChannels } from '../services/youtube/youtubeResolver';
import { useFilterStore } from './useFilterStore';
import { useSourceStore } from './useSourceStore';
import { ChannelIndex, IPTVCountry, IPTVLanguage, UnifiedChannel } from '../types';

const STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours

async function fetchM3USource(url: string, sourceId: string): Promise<UnifiedChannel[]> {
  console.log(`[M3U] Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  const channels = parseM3U(text, sourceId);
  console.log(`[M3U] Parsed ${channels.length} channels from ${sourceId}`);
  return channels;
}

/**
 * Fetch M3U, keep YouTube URLs, resolve them to HLS, and mark all as mainstream.
 */
async function fetchM3USourceWithYT(url: string, sourceId: string): Promise<UnifiedChannel[]> {
  console.log(`[M3U+YT] Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  const channels = parseM3U(text, sourceId, { keepYouTube: true });
  console.log(`[M3U+YT] Parsed ${channels.length} channels (incl. YouTube) from ${sourceId}`);

  // Resolve YouTube URLs to HLS manifests
  const resolved = await resolveYouTubeChannels(channels);

  // Mark all Free-TV channels as mainstream
  return resolved.map(ch => ({ ...ch, isMainstream: true }));
}

function normalizeStreamUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
}

function mergeChannels(
  baseIndex: ChannelIndex,
  extraChannels: UnifiedChannel[],
): ChannelIndex {
  const seenUrls = new Set<string>();
  const seenNames = new Set<string>();
  for (const ch of baseIndex.all) {
    seenUrls.add(normalizeStreamUrl(ch.streamUrl));
    seenNames.add(`${ch.name.toLowerCase().trim()}|${ch.country || ''}`);
  }

  const all = [...baseIndex.all];
  const byCategory = new Map(baseIndex.byCategory);
  const byCountry = new Map(baseIndex.byCountry);
  const byId = new Map(baseIndex.byId);

  let dupeCount = 0;
  for (const ch of extraChannels) {
    const urlKey = normalizeStreamUrl(ch.streamUrl);
    const nameKey = `${ch.name.toLowerCase().trim()}|${ch.country || ''}`;

    if (seenUrls.has(urlKey) || seenNames.has(nameKey)) {
      dupeCount++;
      continue;
    }
    seenUrls.add(urlKey);
    seenNames.add(nameKey);

    const merged: UnifiedChannel = { ...ch, channelNumber: all.length + 1 };
    all.push(merged);
    byId.set(merged.id, merged);

    for (const cat of merged.categories) {
      const list = byCategory.get(cat);
      if (list) list.push(merged);
      else byCategory.set(cat, [merged]);
    }

    if (merged.country) {
      const list = byCountry.get(merged.country);
      if (list) list.push(merged);
      else byCountry.set(merged.country, [merged]);
    }
  }

  if (dupeCount > 0) {
    console.log(`[Sources] Skipped ${dupeCount} duplicate channels`);
  }

  const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
  all.sort((a, b) => collator.compare(a.name, b.name));

  return { all, byCategory, byCountry, byId };
}

export function useIPTVChannels() {
  const { initialized, selectedCountry } = useFilterStore();
  const { sources } = useSourceStore();

  const enabledIds = sources
    .filter(s => s.enabled)
    .map(s => s.id)
    .sort()
    .join(',');

  // Include country in queryKey so Free-TV refetches when country changes
  const freeTVEnabled = sources.some(s => s.id === 'free-tv' && s.enabled);
  const queryCountry = freeTVEnabled ? selectedCountry : '';

  return useQuery<ChannelIndex>({
    queryKey: ['iptv', 'channels', enabledIds, queryCountry],
    queryFn: async () => {
      const enabledSources = sources.filter(s => s.enabled);
      const iptvOrgEnabled = enabledSources.some(s => s.type === 'iptv-org');
      const m3uSources = enabledSources.filter(s => s.type === 'm3u');
      const freeTVSource = enabledSources.find(s => s.type === 'free-tv');

      let baseIndex: ChannelIndex;

      if (iptvOrgEnabled) {
        const [channels, streams] = await Promise.all([
          fetchChannels(),
          fetchStreams(),
        ]);
        console.log(`[IPTV] Building index from ${channels.length} channels and ${streams.length} streams...`);
        // When Free-TV is enabled, it owns the "popular" list — skip iptv-org mainstream marking
        baseIndex = buildChannelIndex(channels, streams, undefined, !!freeTVSource);
        console.log(`[IPTV] Index built: ${baseIndex.all.length} playable channels`);
      } else {
        baseIndex = { all: [], byCategory: new Map(), byCountry: new Map(), byId: new Map() };
      }

      // Fetch Free-TV country playlist
      if (freeTVSource) {
        const freeTVUrl = getFreeTVUrl(selectedCountry);
        if (freeTVUrl) {
          try {
            const channels = await fetchM3USourceWithYT(freeTVUrl, 'free-tv');
            if (channels.length > 0) {
              console.log(`[Free-TV] ${channels.length} channels for ${selectedCountry}`);
              baseIndex = mergeChannels(baseIndex, channels);
            }
          } catch (err) {
            console.warn(`[Free-TV] No playlist for ${selectedCountry}:`, err);
          }
        } else {
          console.log(`[Free-TV] No playlist available for ${selectedCountry}`);
        }
      }

      // Fetch custom M3U sources in parallel
      if (m3uSources.length > 0) {
        const m3uResults = await Promise.allSettled(
          m3uSources.map(s => fetchM3USource(s.url, s.id)),
        );

        const extraChannels: UnifiedChannel[] = [];
        for (let i = 0; i < m3uResults.length; i++) {
          const result = m3uResults[i];
          if (result.status === 'fulfilled') {
            extraChannels.push(...result.value);
          } else {
            console.warn(`[M3U] Failed to fetch ${m3uSources[i].name}:`, result.reason);
          }
        }

        if (extraChannels.length > 0) {
          console.log(`[Sources] Merging ${extraChannels.length} channels from ${m3uSources.length} M3U sources`);
          baseIndex = mergeChannels(baseIndex, extraChannels);
          console.log(`[Sources] Total after merge: ${baseIndex.all.length} channels`);
        }
      }

      return baseIndex;
    },
    staleTime: STALE_TIME,
    gcTime: 2 * 60 * 60 * 1000,
    enabled: initialized,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useIPTVCountries() {
  return useQuery<IPTVCountry[]>({
    queryKey: ['iptv', 'countries'],
    queryFn: fetchCountries,
    staleTime: STALE_TIME,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useIPTVLanguages() {
  return useQuery<IPTVLanguage[]>({
    queryKey: ['iptv', 'languages'],
    queryFn: fetchLanguages,
    staleTime: STALE_TIME,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
