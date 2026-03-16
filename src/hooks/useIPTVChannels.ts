import { useQuery } from '@tanstack/react-query';
import {
  fetchChannels,
  fetchStreams,
  fetchCategories,
  fetchCountries,
  fetchLanguages,
  buildChannelIndex,
} from '../services/iptv/iptvApi';
import { ChannelIndex, IPTVCategory, IPTVCountry, IPTVLanguage } from '../types';

const STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours

export function useIPTVChannels() {
  return useQuery<ChannelIndex>({
    queryKey: ['iptv', 'channels'],
    queryFn: async () => {
      const [channels, streams] = await Promise.all([
        fetchChannels(),
        fetchStreams(),
      ]);
      console.log(`[IPTV] Building index from ${channels.length} channels and ${streams.length} streams...`);
      try {
        const index = buildChannelIndex(channels, streams);
        console.log(`[IPTV] Index built: ${index.all.length} playable channels, ${index.byCategory.size} categories, ${index.byCountry.size} countries`);
        return index;
      } catch (err) {
        console.error('[IPTV] buildChannelIndex failed:', err);
        throw err;
      }
    },
    staleTime: STALE_TIME,
    gcTime: Infinity, // Never garbage collect - we want offline support
  });
}

export function useIPTVCategories() {
  return useQuery<IPTVCategory[]>({
    queryKey: ['iptv', 'categories'],
    queryFn: fetchCategories,
    staleTime: STALE_TIME,
    gcTime: Infinity,
  });
}

export function useIPTVCountries() {
  return useQuery<IPTVCountry[]>({
    queryKey: ['iptv', 'countries'],
    queryFn: fetchCountries,
    staleTime: STALE_TIME,
    gcTime: Infinity,
  });
}

export function useIPTVLanguages() {
  return useQuery<IPTVLanguage[]>({
    queryKey: ['iptv', 'languages'],
    queryFn: fetchLanguages,
    staleTime: STALE_TIME,
    gcTime: Infinity,
  });
}
