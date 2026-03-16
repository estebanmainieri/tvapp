import React, { useCallback, useMemo } from 'react';
import { ScrollView, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';
import { useIPTVChannels } from '../hooks/useIPTVChannels';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useFilterStore } from '../hooks/useFilterStore';
import { useFavorites } from '../hooks/useFavorites';
import { UnifiedChannel, RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function GuideScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: channelIndex, isLoading, error, refetch } = useIPTVChannels();
  const { selectedLanguage } = useFilterStore();
  const { toggleFavorite, isFavorite } = useFavorites();

  const channels = useMemo(() => {
    if (!channelIndex) return [];
    let list = channelIndex.all;
    if (selectedLanguage !== 'all') {
      list = list.filter(ch => ch.language === selectedLanguage);
    }
    return [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [channelIndex, selectedLanguage]);

  const handlePress = useCallback(
    (channel: UnifiedChannel, index: number) => {
      usePlayerStore.getState().play(channel, channels, index);
      navigation.navigate('Player', { channelId: channel.id });
    },
    [channels, navigation],
  );

  if (isLoading && !channelIndex) {
    return <LoadingSpinner message="Loading channels..." fullScreen />;
  }

  if (error && !channelIndex) {
    return (
      <ErrorState
        message="Failed to load channels."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Channel Guide</Text>
        <Text style={styles.count}>{channels.length} channels</Text>
      </View>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.colStar]}></Text>
        <Text style={[styles.headerCell, styles.colNum]}>#</Text>
        <Text style={[styles.headerCell, styles.colLogo]}></Text>
        <Text style={[styles.headerCell, styles.colName]}>Name</Text>
        <Text style={[styles.headerCell, styles.colCategory]}>Category</Text>
        <Text style={[styles.headerCell, styles.colCountry]}>Country</Text>
        <Text style={[styles.headerCell, styles.colLanguage]}>Language</Text>
        <Text style={[styles.headerCell, styles.colQuality]}>Quality</Text>
        <Text style={[styles.headerCell, styles.colSource]}>Source</Text>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {channels.map((ch, idx) => (
          <Pressable
            key={ch.id}
            onPress={() => handlePress(ch, idx)}
            style={({ pressed }: { pressed: boolean }) => [
              styles.row,
              idx % 2 === 0 && styles.rowEven,
              pressed && styles.rowPressed,
            ]}
          >
            <Pressable
              onPress={() => toggleFavorite(ch)}
              style={styles.colStar}
              hitSlop={8}
            >
              <Text style={[styles.starIcon, isFavorite(ch.id) && styles.starActive]}>
                {isFavorite(ch.id) ? '\u2605' : '\u2606'}
              </Text>
            </Pressable>
            <Text style={[styles.cellMuted, styles.colNum]}>{ch.channelNumber}</Text>
            {ch.logo ? (
              <Image source={{ uri: ch.logo }} style={styles.rowLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.rowLogo, styles.rowLogoPlaceholder]}>
                <Text style={styles.rowLogoText}>{ch.channelNumber}</Text>
              </View>
            )}
            <Text style={[styles.cell, styles.colName]} numberOfLines={1}>
              {ch.name || 'Unknown'}
            </Text>
            <Text style={[styles.cellMuted, styles.colCategory]} numberOfLines={1}>
              {ch.categories.join(', ') || '-'}
            </Text>
            <Text style={[styles.cellMuted, styles.colCountry]} numberOfLines={1}>
              {ch.country || '-'}
            </Text>
            <Text style={[styles.cellMuted, styles.colLanguage]} numberOfLines={1}>
              {ch.language || '-'}
            </Text>
            <Text style={[styles.cellMuted, styles.colQuality]} numberOfLines={1}>
              {ch.quality || '-'}
            </Text>
            <Text style={[styles.cellMuted, styles.colSource]} numberOfLines={1}>
              {ch.source}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
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
    alignItems: 'baseline',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHighlight,
  },
  headerCell: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase' as any,
    letterSpacing: 1,
    fontSize: 11,
  },
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceLight,
  },
  rowEven: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  rowPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  rowLogo: {
    width: 32,
    height: 24,
    marginRight: spacing.sm,
    borderRadius: 4,
  },
  rowLogoPlaceholder: {
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLogoText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cell: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 14,
  },
  cellMuted: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  colStar: {
    width: 28,
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  starActive: {
    color: colors.focusBorder,
  },
  colNum: {
    width: 36,
    textAlign: 'right',
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  colLogo: {
    width: 40,
  },
  colName: {
    flex: 3,
    marginRight: spacing.sm,
  },
  colCategory: {
    flex: 2,
    marginRight: spacing.sm,
  },
  colCountry: {
    flex: 1,
    marginRight: spacing.sm,
  },
  colLanguage: {
    flex: 1,
    marginRight: spacing.sm,
  },
  colQuality: {
    width: 60,
    marginRight: spacing.sm,
  },
  colSource: {
    width: 60,
  },
});
