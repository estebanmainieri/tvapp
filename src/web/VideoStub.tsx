/**
 * Web stub for react-native-video.
 * Uses HTML5 <video> + hls.js for HLS stream support in browsers.
 */
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Hls from 'hls.js';

interface VideoSource {
  uri: string;
  headers?: Record<string, string>;
}

/** Rewrite external stream URLs through our local CORS proxy */
function proxyUrl(uri: string): string {
  if (!uri) return uri;
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

  // Pre-compute header entries once per source change
  const headerEntries = useMemo(() => {
    if (!source.headers) return null;
    return Object.entries(source.headers);
  }, [source.headers]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source.uri) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = source.uri.includes('.m3u8') || source.uri.includes('m3u');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        maxBufferSize: 30 * 1000 * 1000,
        startLevel: -1,
        abrEwmaDefaultEstimate: 500000,
        xhrSetup: (xhr) => {
          xhr.timeout = 15000;
          if (headerEntries) {
            for (const [key, value] of headerEntries) {
              try { xhr.setRequestHeader(key, value); } catch (_) {}
            }
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
      video.src = proxyUrl(source.uri);
      video.addEventListener('loadeddata', () => {
        onLoad?.({ duration: 0, naturalSize: {} });
      }, { once: true });
      if (!paused) {
        video.play().catch(() => {});
      }
    } else {
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
  }, [source.uri, headerEntries]);

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

  const handleWaiting = useCallback(() => onBuffer?.({ isBuffering: true }), [onBuffer]);
  const handlePlaying = useCallback(() => onBuffer?.({ isBuffering: false }), [onBuffer]);
  const handleError = useCallback(() => onError?.({ error: { errorString: 'Video playback error' } }), [onError]);

  const videoStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    objectFit: resizeMode === 'contain' ? 'contain' as const
      : resizeMode === 'cover' ? 'cover' as const : 'fill' as const,
    backgroundColor: '#000',
  }), [resizeMode]);

  return (
    <View style={[styles.container, style]}>
      <video
        ref={videoRef}
        autoPlay={!paused}
        style={videoStyle}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onError={handleError}
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

export type OnLoadData = any;
export type OnBufferData = { isBuffering: boolean };
export type OnVideoErrorData = any;

export default Video;
