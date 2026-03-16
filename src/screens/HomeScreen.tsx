import React, { useCallback } from 'react';
import { ScrollView, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';
import { useIPTVChannels } from '../hooks/useIPTVChannels';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useFavorites } from '../hooks/useFavorites';
import { useRecentlyWatched } from '../hooks/useRecentlyWatched';
import { UnifiedChannel, RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';
import { SectionHeader } from '../components/home/SectionHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: channelIndex, isLoading, error, refetch } = useIPTVChannels();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { recentlyWatched } = useRecentlyWatched();

  const handleChannelPress = useCallback(
    (channel: UnifiedChannel, channelList: UnifiedChannel[], index: number) => {
      usePlayerStore.getState().play(channel, channelList, index);
      navigation.navigate('Player', { channelId: channel.id });
    },
    [navigation],
  );

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

  const recent5 = recentlyWatched.slice(0, 5);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Recently Watched — 5 items, full width, no scroll */}
        {recent5.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Recently Watched" channelCount={recent5.length} />
            <View style={styles.recentRow}>
              {recent5.map((ch) => (
                <Pressable
                  key={ch.id}
                  onPress={() => handleChannelPress(ch, recentlyWatched, recentlyWatched.indexOf(ch))}
                  style={({ pressed }) => [
                    styles.recentCard,
                    pressed && styles.cardPressed,
                  ]}
                >
                  {ch.logo ? (
                    <Image source={{ uri: ch.logo }} style={styles.recentLogo} resizeMode="contain" />
                  ) : (
                    <View style={[styles.recentLogo, styles.recentLogoPlaceholder]}>
                      <Text style={styles.placeholderText}>{ch.channelNumber}</Text>
                    </View>
                  )}
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentNumber}>{ch.channelNumber}</Text>
                    <Text style={styles.recentName} numberOfLines={1}>{ch.name || 'Unknown'}</Text>
                  </View>
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); toggleFavorite(ch); }}
                    style={styles.starButton}
                    hitSlop={8}
                  >
                    <Text style={[styles.starIcon, isFavorite(ch.id) && styles.starActive]}>
                      {isFavorite(ch.id) ? '\u2605' : '\u2606'}
                    </Text>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Favorites — grid */}
        {favorites.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Favorites" channelCount={favorites.length} />
            <View style={styles.favGrid}>
              {favorites.map((ch) => (
                <View key={ch.id} style={styles.favCardWrapper}>
                  <Pressable
                    onPress={() => handleChannelPress(ch, favorites, favorites.indexOf(ch))}
                    style={({ pressed }) => [
                      styles.favCard,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    {ch.logo ? (
                      <Image source={{ uri: ch.logo }} style={styles.favLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.favLogo, styles.favLogoPlaceholder]}>
                        <Text style={styles.placeholderText}>{ch.channelNumber}</Text>
                      </View>
                    )}
                    <View style={styles.favInfo}>
                      <Text style={styles.favNumber}>{ch.channelNumber}</Text>
                      <Text style={styles.favName} numberOfLines={1}>{ch.name || 'Unknown'}</Text>
                    </View>
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); toggleFavorite(ch); }}
                      style={styles.starButton}
                      hitSlop={8}
                    >
                      <Text style={[styles.starIcon, styles.starActive]}>{'\u2605'}</Text>
                    </Pressable>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {recent5.length === 0 && favorites.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Welcome to TVApp</Text>
            <Text style={styles.emptyText}>
              Go to Guide or TV Mode to start watching channels.{'\n'}
              Channels you watch will appear here.
            </Text>
          </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },

  // Recently Watched
  recentRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.cardGap,
  },
  recentCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  recentLogo: {
    width: '100%',
    height: 80,
    backgroundColor: colors.surfaceLight,
  },
  recentLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingRight: 32,
  },
  recentNumber: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginRight: 6,
    minWidth: 20,
  },
  recentName: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },

  // Favorites grid
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.screenHorizontal,
    gap: spacing.cardGap,
  },
  favCardWrapper: {
    width: spacing.cardWidth,
  },
  favCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
  },
  favLogo: {
    width: '100%',
    height: spacing.cardHeight - 36,
    backgroundColor: colors.surfaceLight,
  },
  favLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  favInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingRight: 32,
  },
  favNumber: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    marginRight: 6,
    minWidth: 20,
  },
  favName: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },

  // Shared
  cardPressed: {
    opacity: 0.7,
  },
  placeholderText: {
    ...typography.title,
    color: colors.textMuted,
  },
  starButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
  },
  starIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  starActive: {
    color: colors.focusBorder, // gold
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
