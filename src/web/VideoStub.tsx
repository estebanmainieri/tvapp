/**
 * Web stub for react-native-video.
 * Uses HTML5 <video> + hls.js for HLS stream support in browsers.
 */
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Hls from 'hls.js';

interface VideoSource {
  uri: string;
  headers?: Record<string, string>;
}

/** Rewrite external stream URLs through our local CORS proxy */
function proxyUrl(uri: string): string {
  if (!uri) return uri;
  // Already relative or already proxied
  if (uri.startsWith('/') || uri.startsWith('blob:')) return uri;
  return `/stream-proxy/${encodeURIComponent(uri)}`;
}

interface VideoProps {
  source: VideoSource;
  style?: any;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  paused?: boolean;
  muted?: boolean;
  onLoad?: (data: any) => void;
  onBuffer?: (data: { isBuffering: boolean }) => void;
  onError?: (error: any) => void;
  bufferConfig?: any;
}

function Video({
  source,
  style,
  resizeMode = 'contain',
  paused,
  muted,
  onLoad,
  onBuffer,
  onError,
}: VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source.uri) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = source.uri.includes('.m3u8') || source.uri.includes('m3u');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr) => {
          // URLs are already rewritten by the proxy's m3u8 rewriter,
          // so no need to rewrite here. Just set custom headers if any.
          if (source.headers) {
            Object.entries(source.headers).forEach(([key, value]) => {
              try { xhr.setRequestHeader(key, value); } catch (_) {}
            });
          }
        },
      });

      hls.loadSource(proxyUrl(source.uri));
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        onLoad?.({ duration: 0, naturalSize: {} });
        if (!paused) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data.type, data.details);
          onError?.({ error: { errorString: `HLS error: ${data.details}` } });
        }
      });

      hlsRef.current = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = proxyUrl(source.uri);
      video.addEventListener('loadeddata', () => {
        onLoad?.({ duration: 0, naturalSize: {} });
      }, { once: true });
      if (!paused) {
        video.play().catch(() => {});
      }
    } else {
      // Direct video (mp4, etc.)
      video.src = proxyUrl(source.uri);
      video.addEventListener('loadeddata', () => {
        onLoad?.({ duration: 0, naturalSize: {} });
      }, { once: true });
      if (!paused) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [source.uri]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !!muted;
  }, [muted]);

  const objectFit =
    resizeMode === 'contain'
      ? 'contain'
      : resizeMode === 'cover'
        ? 'cover'
        : 'fill';

  return (
    <View style={[styles.container, style]}>
      <video
        ref={videoRef}
        autoPlay={!paused}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          backgroundColor: '#000',
        }}
        onWaiting={() => onBuffer?.({ isBuffering: true })}
        onPlaying={() => onBuffer?.({ isBuffering: false })}
        onError={() =>
          onError?.({ error: { errorString: 'Video playback error' } })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

// Named exports for type compatibility
export type OnLoadData = any;
export type OnBufferData = { isBuffering: boolean };
export type OnVideoErrorData = any;

export default Video;
