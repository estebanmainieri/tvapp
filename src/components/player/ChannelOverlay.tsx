import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, Image, Pressable, StyleSheet } from 'react-native';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { UnifiedChannel } from '../../types';
import { colors, spacing, typography } from '../../theme';

interface ChannelOverlayProps {
  visible: boolean;
}

export function ChannelOverlay({ visible }: ChannelOverlayProps) {
  const { channelList, channelIndex, currentChannel } = usePlayerStore();
  const listRef = useRef<FlatList>(null);
  const play = usePlayerStore(s => s.play);

  useEffect(() => {
    if (visible && listRef.current && channelIndex >= 0) {
      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: channelIndex,
          animated: true,
          viewPosition: 0.3,
        });
      }, 100);
    }
  }, [visible, channelIndex]);

  const handleChannelSelect = useCallback(
    (channel: UnifiedChannel, index: number) => {
      play(channel, channelList, index);
    },
    [play, channelList],
  );

  if (!visible) return null;

  const renderItem = ({
    item,
    index,
  }: {
    item: UnifiedChannel;
    index: number;
  }) => {
    const isActive = index === channelIndex;

    return (
      <Pressable
        onPress={() => handleChannelSelect(item, index)}
        // @ts-ignore
        hasTVPreferredFocus={isActive}
        style={({ focused }: { focused: boolean }) => [
          styles.channelItem,
          isActive && styles.activeItem,
          focused && styles.focusedItem,
        ]}
      >
        <Text style={styles.channelNumber}>{index + 1}</Text>
        {item.logo ? (
          <Image
            source={{ uri: item.logo }}
            style={styles.channelLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.channelLogoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>
              {item.name.charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.channelInfo}>
          <Text
            style={[styles.channelName, isActive && styles.activeText]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.categories.length > 0 && (
            <Text style={styles.channelCategory} numberOfLines={1}>
              {item.categories[0]}
            </Text>
          )}
        </View>
        {isActive && (
          <View style={styles.nowPlaying}>
            <View style={styles.nowPlayingDot} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Channels</Text>
          <Text style={styles.count}>
            {channelIndex + 1} / {channelList.length}
          </Text>
        </View>
        <FlatList
          ref={listRef}
          data={channelList}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          onScrollToIndexFailed={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  panel: {
    width: '40%',
    backgroundColor: colors.overlayDark,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  activeItem: {
    backgroundColor: colors.surfaceHighlight,
  },
  focusedItem: {
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.focusBorder,
  },
  channelNumber: {
    ...typography.caption,
    color: colors.textMuted,
    width: 30,
  },
  channelLogo: {
    width: 40,
    height: 30,
    marginRight: spacing.sm,
    borderRadius: 4,
  },
  channelLogoPlaceholder: {
    width: 40,
    height: 30,
    marginRight: spacing.sm,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  activeText: {
    color: colors.focusBorder,
    fontWeight: '700',
  },
  channelCategory: {
    ...typography.badge,
    color: colors.textMuted,
  },
  nowPlaying: {
    marginLeft: spacing.sm,
  },
  nowPlayingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live,
  },
});
