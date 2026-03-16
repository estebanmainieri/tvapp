import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Video, { OnLoadData, OnBufferData, OnVideoErrorData } from 'react-native-video';
import { usePlayerStore } from '../../hooks/usePlayerStore';
import { colors } from '../../theme';

export function VideoPlayer() {
  const videoRef = useRef<any>(null);
  const { currentChannel, isPlaying, setBuffering, setError } = usePlayerStore();

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
    (error: OnVideoErrorData) => {
      console.error('Video error:', error);
      setError('Stream unavailable. Try another channel.');
    },
    [setError],
  );

  if (!currentChannel) return null;

  const headers: Record<string, string> = {};
  if (currentChannel.meta?.userAgent) {
    headers['User-Agent'] = currentChannel.meta.userAgent;
  }
  if (currentChannel.meta?.referrer) {
    headers.Referer = currentChannel.meta.referrer;
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{
          uri: currentChannel.streamUrl,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        }}
        style={styles.video}
        resizeMode="contain"
        paused={!isPlaying}
        onLoad={handleLoad}
        onBuffer={handleBuffer}
        onError={handleError}
        bufferConfig={{
          minBufferMs: 5000,
          maxBufferMs: 30000,
          bufferForPlaybackMs: 2500,
          bufferForPlaybackAfterRebufferMs: 5000,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  video: {
    flex: 1,
  },
});
