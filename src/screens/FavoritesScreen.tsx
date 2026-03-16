import React, { useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChannelCard } from '../components/home/ChannelCard';
import { useFavorites } from '../hooks/useFavorites';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { UnifiedChannel, RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NUM_COLUMNS = 5;

export function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { favorites, toggleFavorite } = useFavorites();

  const handleChannelPress = useCallback(
    (channel: UnifiedChannel, index: number) => {
      usePlayerStore.getState().play(channel, favorites, index);
      navigation.navigate('Player', { channelId: channel.id });
    },
    [navigation, favorites],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedChannel; index: number }) => (
      <View style={styles.cardWrapper}>
        <ChannelCard
          channel={item}
          onPress={() => handleChannelPress(item, index)}
          onLongPress={() => toggleFavorite(item)}
          hasTVPreferredFocus={index === 0}
        />
      </View>
    ),
    [handleChannelPress, toggleFavorite],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.count}>{favorites.length} channels</Text>
      </View>
      {favorites.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No favorites yet</Text>
          <Text style={styles.emptyHint}>
            Long press on any channel to add it to favorites
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
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
