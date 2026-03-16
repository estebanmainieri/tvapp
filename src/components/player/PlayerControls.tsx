import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { colors, spacing, typography } from '../../theme';

interface PlayerControlsProps {
  visible: boolean;
}

export function PlayerControls({ visible }: PlayerControlsProps) {
  const {
    currentChannel,
    channelIndex,
    channelList,
    isPlaying,
    isBuffering,
    error,
    togglePlay,
    reload,
  } = usePlayerStore();

  if (!visible || !currentChannel) return null;

  return (
    <View style={styles.overlay}>
      {/* Top bar - channel info */}
      <View style={styles.topBar} pointerEvents="none">
        {currentChannel.logo && (
          <Image
            source={{ uri: currentChannel.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        <View style={styles.channelInfo}>
          <Text style={styles.channelName}>{currentChannel.name}</Text>
          <Text style={styles.channelMeta}>
            {currentChannel.categories.join(' / ')}
            {currentChannel.country ? ` - ${currentChannel.country}` : ''}
          </Text>
        </View>
        <View style={styles.channelNumber}>
          <Text style={styles.channelNumberText}>
            {channelIndex + 1}/{channelList.length}
          </Text>
        </View>
      </View>

      {/* Center - playback controls */}
      <View style={styles.centerControls}>
        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            pressed && styles.controlButtonPressed,
          ]}
          onPress={togglePlay}
        >
          <Text style={styles.controlIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.controlButton,
            pressed && styles.controlButtonPressed,
          ]}
          onPress={reload}
        >
          <Text style={styles.controlIcon}>↻</Text>
        </Pressable>
      </View>

      {/* Bottom bar - status */}
      <View style={styles.bottomBar} pointerEvents="none">
        {isBuffering && (
          <Text style={styles.bufferingText}>Buffering...</Text>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {!isBuffering && !error && (
          <Text style={styles.hintText}>
            UP/DOWN: Change channel | MENU: Channel list | BACK: Exit
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.overlayDark,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: spacing.md,
    borderRadius: 8,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  channelMeta: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  channelNumber: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  channelNumberText: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controlButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  controlIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  bottomBar: {
    padding: spacing.lg,
    backgroundColor: colors.overlayDark,
    alignItems: 'center',
  },
  bufferingText: {
    ...typography.body,
    color: colors.buffering,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  hintText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
