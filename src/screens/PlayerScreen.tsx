import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { PlayerControls } from '../components/player/PlayerControls';
import { ChannelOverlay } from '../components/player/ChannelOverlay';
import { ChannelIndicator } from '../components/player/ChannelIndicator';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useIPTVChannels } from '../hooks/useIPTVChannels';
import { useTVRemote } from '../hooks/useTVRemote';
import { useRecentlyWatched } from '../hooks/useRecentlyWatched';
import { useFavorites } from '../hooks/useFavorites';
import { RootStackParamList } from '../types';
import { colors } from '../theme';

type RouteType = RouteProp<RootStackParamList, 'Player'>;

const CONTROLS_AUTO_HIDE_MS = 5000;

export function PlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const channelIdFromUrl = route.params?.channelId;

  const { data: channelIndex } = useIPTVChannels();

  const {
    play,
    stop,
    channelUp,
    channelDown,
    toggleControls,
    toggleChannelOverlay,
    showControls,
    showChannelOverlay,
    currentChannel,
  } = usePlayerStore();

  const { addRecent } = useRecentlyWatched();
  const { toggleFavorite } = useFavorites();

  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore channel from URL on refresh (when store is empty but URL has channelId)
  useEffect(() => {
    if (!currentChannel && channelIdFromUrl && channelIndex) {
      const channel = channelIndex.byId.get(channelIdFromUrl);
      if (channel) {
        const idx = channelIndex.all.indexOf(channel);
        play(channel, channelIndex.all, Math.max(0, idx));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelIdFromUrl, channelIndex]);

  // Update URL when channel changes (e.g. channel up/down)
  useEffect(() => {
    if (currentChannel && Platform.OS === 'web') {
      navigation.setParams({ channelId: currentChannel.id } as any);
    }
  }, [currentChannel?.id, navigation]);

  // Track recently watched on mount
  useEffect(() => {
    if (currentChannel) {
      addRecent(currentChannel);
    }
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track recently watched on channel change
  useEffect(() => {
    if (currentChannel) {
      addRecent(currentChannel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannel?.id]);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = setTimeout(() => {
      const state = usePlayerStore.getState();
      if (state.showControls && !state.showChannelOverlay) {
        state.toggleControls();
      }
    }, CONTROLS_AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    if (showControls && !showChannelOverlay) {
      resetControlsTimer();
    }
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [showControls, showChannelOverlay, resetControlsTimer]);

  // Show controls on mouse move (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMouseMove = () => {
      const state = usePlayerStore.getState();
      if (!state.showControls && !state.showChannelOverlay) {
        state.toggleControls();
      }
      resetControlsTimer();
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [resetControlsTimer]);

  // Handle Android/TV back button (not supported on web)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showChannelOverlay) {
        toggleChannelOverlay();
        return true;
      }
      if (showControls) {
        toggleControls();
        return true;
      }
      stop();
      navigation.goBack();
      return true;
    });

    return () => handler.remove();
  }, [
    showChannelOverlay,
    showControls,
    toggleChannelOverlay,
    toggleControls,
    stop,
    navigation,
  ]);

  // TV remote handling
  const remoteHandlers = useMemo(
    () => ({
      onSelect: () => {
        if (!showChannelOverlay) {
          toggleControls();
        }
      },
      onUp: () => {
        if (!showChannelOverlay) {
          channelUp();
        }
      },
      onDown: () => {
        if (!showChannelOverlay) {
          channelDown();
        }
      },
      onMenu: () => {
        toggleChannelOverlay();
      },
      onLongSelect: () => {
        if (currentChannel) {
          toggleFavorite(currentChannel);
        }
      },
      onPlayPause: () => {
        toggleControls();
      },
    }),
    [
      showChannelOverlay,
      toggleControls,
      toggleChannelOverlay,
      channelUp,
      channelDown,
      currentChannel,
      toggleFavorite,
    ],
  );

  useTVRemote(remoteHandlers);

  // Show loading while restoring channel from URL
  if (!currentChannel && channelIdFromUrl) {
    return <LoadingSpinner message="Loading channel..." fullScreen />;
  }

  return (
    <View style={styles.container}>
      <VideoPlayer />
      <PlayerControls visible={showControls && !showChannelOverlay} />
      <ChannelOverlay visible={showChannelOverlay} />
      <ChannelIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
