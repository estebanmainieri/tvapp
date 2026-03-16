import React, { useCallback, useMemo } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChannelCard } from '../components/home/ChannelCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useIPTVChannels } from '../hooks/useIPTVChannels';
import { useFavorites } from '../hooks/useFavorites';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { UnifiedChannel, RootStackParamList } from '../types';
import { colors, spacing, typography } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'Category'>;

const NUM_COLUMNS = 5;

export function CategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { categoryId, categoryName } = route.params;
  const { data: channelIndex, isLoading } = useIPTVChannels();
  const { toggleFavorite } = useFavorites();

  const channels = useMemo(
    () => channelIndex?.byCategory.get(categoryId) ?? [],
    [channelIndex, categoryId],
  );

  const handleChannelPress = useCallback(
    (channel: UnifiedChannel, index: number) => {
      usePlayerStore.getState().play(channel, channels, index);
      navigation.navigate('Player', { channelId: channel.id });
    },
    [navigation, channels],
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

  if (isLoading) {
    return <LoadingSpinner message={`Loading ${categoryName}...`} fullScreen />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{categoryName}</Text>
        <Text style={styles.count}>{channels.length} channels</Text>
      </View>
      <FlatList
        data={channels}
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
});
