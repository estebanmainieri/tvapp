import React, { useCallback, useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ContentRow } from '../components/home/ContentRow';
import { CountryRow } from '../components/home/CountryRow';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';
import { useIPTVChannels, useIPTVCountries } from '../hooks/useIPTVChannels';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useFilterStore } from '../hooks/useFilterStore';
import { UnifiedChannel, IPTVCountry, RootStackParamList } from '../types';
import { colors, spacing } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FEATURED_CATEGORIES = [
  { id: 'news', label: 'News' },
  { id: 'sports', label: 'Sports' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'movies', label: 'Movies' },
  { id: 'music', label: 'Music' },
  { id: 'kids', label: 'Kids' },
  { id: 'documentary', label: 'Documentary' },
];

const MAX_CHANNELS_PER_ROW = 30;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: channelIndex, isLoading, error, refetch } = useIPTVChannels();
  const { data: countries } = useIPTVCountries();
  const { selectedCountry, selectedLanguage } = useFilterStore();

  // Filter by language (country is already filtered in the index)
  const filteredChannels = useMemo(() => {
    if (!channelIndex) return [];
    if (selectedLanguage === 'all') return channelIndex.all;
    return channelIndex.all.filter(ch => ch.language === selectedLanguage);
  }, [channelIndex, selectedLanguage]);

  const handleChannelPress = useCallback(
    (channel: UnifiedChannel, channelList: UnifiedChannel[], index: number) => {
      usePlayerStore.getState().play(channel, channelList, index);
      navigation.navigate('Player', { channelId: channel.id });
    },
    [navigation],
  );

  const handleCountryPress = useCallback(
    (country: IPTVCountry) => {
      navigation.navigate('Country', {
        countryCode: country.code,
        countryName: country.name,
      });
    },
    [navigation],
  );

  const categoryRows = useMemo(() => {
    if (filteredChannels.length === 0) return [];
    // Build category buckets from filtered channels
    const byCat = new Map<string, UnifiedChannel[]>();
    for (const ch of filteredChannels) {
      for (const cat of ch.categories) {
        const list = byCat.get(cat);
        if (list) list.push(ch);
        else byCat.set(cat, [ch]);
      }
    }
    return FEATURED_CATEGORIES.map(cat => ({
      ...cat,
      channels: byCat.get(cat.id)?.slice(0, MAX_CHANNELS_PER_ROW) ?? [],
    })).filter(cat => cat.channels.length > 0);
  }, [filteredChannels]);

  const { countriesWithChannels, countryCounts } = useMemo(() => {
    if (!channelIndex || !countries) return { countriesWithChannels: [], countryCounts: new Map<string, number>() };
    const filtered = countries.filter(c => channelIndex.byCountry.has(c.code));
    const counts = new Map<string, number>();
    for (const c of filtered) {
      const chans = channelIndex.byCountry.get(c.code);
      if (chans) counts.set(c.code, chans.length);
    }
    filtered.sort((a, b) => (counts.get(b.code) ?? 0) - (counts.get(a.code) ?? 0));
    return { countriesWithChannels: filtered.slice(0, 50), countryCounts: counts };
  }, [channelIndex, countries]);

  if (isLoading && !channelIndex) {
    return <LoadingSpinner message="Loading channels..." fullScreen />;
  }

  if (error && !channelIndex) {
    return (
      <ErrorState
        message="Failed to load channels. Check your internet connection."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {categoryRows.map(cat => (
          <ContentRow
            key={cat.id}
            title={cat.label}
            channels={cat.channels}
            onChannelPress={(ch, idx) => handleChannelPress(ch, cat.channels, idx)}
          />
        ))}

        {filteredChannels.length > 0 && (
          <ContentRow
            title={`All Channels (${filteredChannels.length})`}
            channels={filteredChannels}
            onChannelPress={(ch, idx) => handleChannelPress(ch, filteredChannels, idx)}
          />
        )}

        {selectedCountry === 'all' && countriesWithChannels.length > 0 && (
          <CountryRow
            countries={countriesWithChannels}
            countryCounts={countryCounts}
            onCountryPress={handleCountryPress}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    height: '100%',
  } as any,
  scrollView: {
    flex: 1,
    overflow: 'scroll',
  } as any,
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
