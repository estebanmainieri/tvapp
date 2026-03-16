import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { colors, spacing, typography } from '../../theme';

/**
 * Brief on-screen display when switching channels.
 * Shows channel number and name, auto-hides after 2 seconds.
 */
export function ChannelIndicator() {
  const { currentChannel, channelIndex, channelList } = usePlayerStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const prevChannelRef = useRef(currentChannel?.id);

  useEffect(() => {
    if (currentChannel && currentChannel.id !== prevChannelRef.current) {
      prevChannelRef.current = currentChannel.id;
      // Show indicator
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentChannel, opacity]);

  if (!currentChannel) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.number}>{channelIndex + 1}</Text>
      <Text style={styles.name}>{currentChannel.name}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.overlayDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  number: {
    ...typography.hero,
    color: colors.focusBorder,
    marginRight: spacing.md,
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
  },
});
