import React, { useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChannelCard } from '../components/home/ChannelCard';
import { useRecentlyWatched } from '../hooks/useRecentlyWatched';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { UnifiedChannel, RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NUM_COLUMNS = 5;

export function RecentlyWatchedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { recentlyWatched } = useRecentlyWatched();

  const handleChannelPress = useCallback(
    (channel: UnifiedChannel, index: number) => {
      usePlayerStore.getState().play(channel, recentlyWatched, index);
      navigation.navigate('Player', { channelId: channel.id });
    },
    [navigation, recentlyWatched],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedChannel; index: number }) => (
      <View style={styles.cardWrapper}>
        <ChannelCard
          channel={item}
          onPress={() => handleChannelPress(item, index)}
          hasTVPreferredFocus={index === 0}
        />
      </View>
    ),
    [handleChannelPress],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Recently Watched</Text>
        <Text style={styles.count}>{recentlyWatched.length} channels</Text>
      </View>
      {recentlyWatched.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No recently watched channels</Text>
          <Text style={styles.emptyHint}>
            Channels you watch will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={recentlyWatched}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  cardWrapper: {
    margin: spacing.cardGap / 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.title,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    ...typography.body,
    color: colors.textMuted,
  },
});
