import React, { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, AppState, Platform } from 'react-native';
import Video, { OnLoadData, OnBufferData, OnVideoErrorData } from 'react-native-video';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { colors } from '../../theme';

const bufferConfig = {
  minBufferMs: 5000,
  maxBufferMs: 30000,
  bufferForPlaybackMs: 2500,
  bufferForPlaybackAfterRebufferMs: 5000,
};

export function VideoPlayer() {
  const videoRef = useRef<any>(null);
  const { currentChannel, isPlaying, isMuted, isBuffering, error, setBuffering, setError } = usePlayerStore();

  // Force remount video when returning from background (fixes black screen)
  const [videoKey, setVideoKey] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setVideoKey(k => k + 1);
      }
    });
    return () => sub.remove();
  }, []);

  const handleLoad = useCallback(
    (_data: OnLoadData) => {
      setBuffering(false);
    },
    [setBuffering],
  );

  const handleBuffer = useCallback(
    ({ isBuffering: buffering }: OnBufferData) => {
      setBuffering(buffering);
    },
    [setBuffering],
  );

  const handleError = useCallback(
    (err: OnVideoErrorData) => {
      console.error('Video error:', err);
      setError('Sin señal');
    },
    [setError],
  );

  const source = useMemo(() => {
    if (!currentChannel) return null;
    const headers: Record<string, string> = {};
    if (currentChannel.meta?.userAgent) {
      headers['User-Agent'] = currentChannel.meta.userAgent;
    }
    if (currentChannel.meta?.referrer) {
      headers.Referer = currentChannel.meta.referrer;
    }
    return {
      uri: currentChannel.streamUrl,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };
  }, [currentChannel?.streamUrl, currentChannel?.meta?.userAgent, currentChannel?.meta?.referrer]);

  if (!currentChannel) return <NoSignalScreen />;

  return (
    <View style={styles.container}>
      {source && (
        <Video
          key={videoKey}
          ref={videoRef}
          source={source}
          style={styles.video}
          resizeMode="contain"
          paused={!isPlaying}
          muted={isMuted}
          onLoad={handleLoad}
          onBuffer={handleBuffer}
          onError={handleError}
          bufferConfig={bufferConfig}
        />
      )}

      {/* Error overlay — "no signal" */}
      {error && (
        <View style={styles.noSignalOverlay}>
          <Text style={styles.noSignalIcon}>⚠</Text>
          <Text style={styles.noSignalText}>{error}</Text>
        </View>
      )}

      {/* Buffering overlay */}
      {isBuffering && !error && (
        <View style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}
    </View>
  );
}

function NoSignalScreen() {
  return (
    <View style={styles.noSignalScreen}>
      <Text style={styles.noSignalScreenIcon}>📺</Text>
      <Text style={styles.noSignalScreenText}>Sin señal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  noSignalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSignalIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noSignalText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSignalScreen: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSignalScreenIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  noSignalScreenText: {
    color: colors.textMuted,
    fontSize: 18,
  },
});
