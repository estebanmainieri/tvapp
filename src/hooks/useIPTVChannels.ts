import { useQuery } from '@tanstack/react-query';
import {
  fetchChannels,
  fetchStreams,
  fetchCountries,
  fetchLanguages,
  buildChannelIndex,
} from '../services/iptv/iptvApi';
import { useFilterStore } from './useFilterStore';
import { ChannelIndex, IPTVCountry, IPTVLanguage } from '../types';

const STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours

export function useIPTVChannels() {
  const { initialized } = useFilterStore();

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
        console.log(`[IPTV] Index built: ${index.all.length} playable channels, ${index.byCategory.size} categories`);
        return index;
      } catch (err) {
        console.error('[IPTV] buildChannelIndex failed:', err);
        throw err;
      }
    },
    staleTime: STALE_TIME,
    gcTime: 2 * 60 * 60 * 1000, // 2 hours — free memory on low-end devices
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
