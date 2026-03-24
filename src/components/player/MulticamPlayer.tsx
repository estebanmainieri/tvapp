import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, AppState, Platform, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';
import { UnifiedChannel } from '../../types';
import { colors } from '../../theme';

interface MulticamPlayerProps {
  slots: (UnifiedChannel | null)[];
  focusedSlot: number;
  onSlotPress: (index: number) => void;
}

const bufferConfig = {
  minBufferMs: 5000,
  maxBufferMs: 30000,
  bufferForPlaybackMs: 2500,
  bufferForPlaybackAfterRebufferMs: 5000,
};

const SlotPlayer = memo(function SlotPlayer({
  channel,
  index,
  isFocused,
  onPress,
}: {
  channel: UnifiedChannel | null;
  index: number;
  isFocused: boolean;
  onPress: () => void;
}) {
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(false);
  const [videoKey, setVideoKey] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setVideoKey(k => k + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    setError(false);
    setIsBuffering(true);
  }, [channel?.streamUrl]);

  // Stable source ref — only recreate when URL actually changes
  const source = useMemo(() => {
    if (!channel) return null;
    return {
      uri: channel.streamUrl,
      headers: {
        ...(channel.meta?.userAgent ? { 'User-Agent': channel.meta.userAgent } : {}),
        ...(channel.meta?.referrer ? { Referer: channel.meta.referrer } : {}),
      },
    };
  }, [channel?.streamUrl, channel?.meta?.userAgent, channel?.meta?.referrer]);

  const handleLoad = useCallback(() => setIsBuffering(false), []);
  const handleBuffer = useCallback(({ isBuffering: b }: { isBuffering: boolean }) => setIsBuffering(b), []);
  const handleError = useCallback(() => setError(true), []);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.slot,
        isFocused && styles.slotFocused,
      ]}
    >
      {channel && source ? (
        <View style={styles.slotVideo}>
          <Video
            key={`${channel.streamUrl}-${videoKey}`}
            source={source}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            paused={false}
            muted={!isFocused}
            onLoad={handleLoad}
            onBuffer={handleBuffer}
            onError={handleError}
            bufferConfig={bufferConfig}
          />
          {error && (
            <View style={styles.slotError}>
              <Text style={styles.slotErrorIcon}>⚠</Text>
              <Text style={styles.slotErrorText}>Sin señal</Text>
            </View>
          )}
          {isBuffering && !error && (
            <View style={styles.slotBuffering}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          <View style={styles.slotLabel}>
            <Text style={styles.slotLabelText} numberOfLines={1}>
              {channel.name}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.slotEmpty}>
          <Text style={styles.slotEmptyNum}>{index + 1}</Text>
        </View>
      )}
    </Pressable>
  );
}, (prev, next) => {
  // Only re-render if something visual changed
  return prev.channel?.streamUrl === next.channel?.streamUrl
    && prev.channel?.name === next.channel?.name
    && prev.isFocused === next.isFocused
    && prev.index === next.index;
});

export const MulticamPlayer = memo(function MulticamPlayer({
  slots,
  focusedSlot,
  onSlotPress,
}: MulticamPlayerProps) {
  // Stable press handlers
  const press0 = useCallback(() => onSlotPress(0), [onSlotPress]);
  const press1 = useCallback(() => onSlotPress(1), [onSlotPress]);
  const press2 = useCallback(() => onSlotPress(2), [onSlotPress]);
  const press3 = useCallback(() => onSlotPress(3), [onSlotPress]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <SlotPlayer channel={slots[0]} index={0} isFocused={focusedSlot === 0} onPress={press0} />
        <SlotPlayer channel={slots[1]} index={1} isFocused={focusedSlot === 1} onPress={press1} />
      </View>
      <View style={styles.row}>
        <SlotPlayer channel={slots[2]} index={2} isFocused={focusedSlot === 2} onPress={press2} />
        <SlotPlayer channel={slots[3]} index={3} isFocused={focusedSlot === 3} onPress={press3} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  slot: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#333',
  },
  slotFocused: {
    borderColor: colors.accent,
    borderWidth: 3,
  },
  slotVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  slotEmpty: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmptyNum: {
    fontSize: 48,
    color: '#333',
    fontWeight: '700',
  },
  slotLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slotLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  slotError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotErrorIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  slotErrorText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  slotBuffering: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
