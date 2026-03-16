import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChannelCard } from '../components/home/ChannelCard';
import { useIPTVChannels } from '../hooks/useIPTVChannels';
import { useFavorites } from '../hooks/useFavorites';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { UnifiedChannel, RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NUM_COLUMNS = 5;
const MAX_RESULTS = 100;

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [query, setQuery] = useState('');
  const { data: channelIndex } = useIPTVChannels();
  const { toggleFavorite } = useFavorites();

  const results = useMemo(() => {
    if (!channelIndex || query.length < 2) return [];
    const lower = query.toLowerCase();
    return channelIndex.all
      .filter(ch => ch.name.toLowerCase().includes(lower))
      .slice(0, MAX_RESULTS);
  }, [channelIndex, query]);

  const handleChannelPress = useCallback(
    (channel: UnifiedChannel, index: number) => {
      usePlayerStore.getState().play(channel, results, index);
      navigation.navigate('Player', { channelId: channel.id });
    },
    [navigation, results],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedChannel; index: number }) => (
      <View style={styles.cardWrapper}>
        <ChannelCard
          channel={item}
          onPress={() => handleChannelPress(item, index)}
          onLongPress={() => toggleFavorite(item)}
        />
      </View>
    ),
    [handleChannelPress, toggleFavorite],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search channels..."
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
      </View>
      {query.length >= 2 && (
        <Text style={styles.resultCount}>
          {results.length} result{results.length !== 1 ? 's' : ''}
          {results.length === MAX_RESULTS ? ' (showing first 100)' : ''}
        </Text>
      )}
      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={NUM_COLUMNS}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  searchBar: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.md,
  },
  input: {
    ...typography.subtitle,
    backgroundColor: colors.surfaceLight,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surfaceHighlight,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  cardWrapper: {
    margin: spacing.cardGap / 2,
  },
});
