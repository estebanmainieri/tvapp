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
  const { initialized, selectedCountry } = useFilterStore();

  return useQuery<ChannelIndex>({
    queryKey: ['iptv', 'channels', selectedCountry],
    queryFn: async () => {
      const [channels, streams] = await Promise.all([
        fetchChannels(),
        fetchStreams(),
      ]);
      console.log(`[IPTV] Building index from ${channels.length} channels and ${streams.length} streams (country: ${selectedCountry})...`);
      try {
        const countryFilter = selectedCountry !== 'all' ? selectedCountry : undefined;
        const index = buildChannelIndex(channels, streams, countryFilter);
        console.log(`[IPTV] Index built: ${index.all.length} playable channels, ${index.byCategory.size} categories`);
        return index;
      } catch (err) {
        console.error('[IPTV] buildChannelIndex failed:', err);
        throw err;
      }
    },
    staleTime: STALE_TIME,
    gcTime: Infinity,
    enabled: initialized, // Don't fetch until geo is resolved
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
