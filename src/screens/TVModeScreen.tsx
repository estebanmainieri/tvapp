import React, { useEffect, useCallback, useMemo, useRef, useState, memo } from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet, Platform, Modal } from 'react-native';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';
import { useIPTVChannels, useIPTVCountries, useIPTVLanguages } from '../hooks/useIPTVChannels';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useFilterStore } from '../hooks/useFilterStore';
import { useTVRemote } from '../hooks/useTVRemote';
import { useFavorites } from '../hooks/useFavorites';
import { UnifiedChannel } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../theme';
import { APP_VERSION } from '../version';
import { t, UI_LANGUAGES } from '../i18n/translations';
import { checkForUpdate, applyUpdate, startBackgroundUpdateCheck, stopBackgroundUpdateCheck, UpdateInfo } from '../services/updater';
import {
  PlayIcon, PauseIcon, VolumeOnIcon, VolumeMuteIcon,
  ReloadIcon, FullscreenIcon, FullscreenExitIcon,
  SkipPrevIcon, SkipNextIcon, GlobeIcon, GearIcon,
} from '../components/player/PlayerIcons';

function SelectPicker({ value, onChange, options }: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  if (Platform.OS === 'web') {
    return (
      <select
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          backgroundColor: colors.surfaceLight,
          color: colors.textSecondary,
          border: `1px solid ${colors.surfaceHighlight}`,
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 12,
          outline: 'none',
          cursor: 'pointer',
          width: '100%',
        } as any}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  return (
    <Text style={styles.pickerFallback}>
      {options.find(o => o.value === value)?.label ?? value}
    </Text>
  );
}

// Memoized channel list item for performance
const ChannelItem = memo(function ChannelItem({
  channel,
  number,
  isActive,
  isHighlighted,
  isFav,
  starFocused,
  onPress,
  onStarPress,
}: {
  channel: UnifiedChannel;
  number: number;
  isActive: boolean;
  isHighlighted: boolean;
  isFav: boolean;
  starFocused: boolean;
  onPress: () => void;
  onStarPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.listItem,
        isActive && styles.listItemActive,
        isHighlighted && styles.listItemHighlighted,
        pressed && styles.listItemPressed,
      ]}
    >
      <View style={[styles.itemNumberBubble, (isActive || isHighlighted) && styles.itemNumberBubbleActive]}>
        <Text style={[styles.itemNumber, (isActive || isHighlighted) && styles.itemTextActive]}>
          {number}
        </Text>
      </View>
      {channel.logo && (
        <Image source={{ uri: channel.logo }} style={styles.itemLogo} resizeMode="contain" />
      )}
      <Text
        style={[styles.itemName, (isActive || isHighlighted) && styles.itemTextActive]}
        numberOfLines={1}
      >
        {channel.name || 'Unknown'}
      </Text>
      <Pressable
        onPress={onStarPress}
        style={[
          styles.itemStar,
          starFocused && styles.itemStarFocused,
        ]}
        hitSlop={8}
      >
        <Text style={[styles.itemStarIcon, isFav && styles.itemStarActive]}>
          {isFav ? '\u2605' : '\u2606'}
        </Text>
      </Pressable>
    </Pressable>
  );
});

const ITEM_HEIGHT = 44;

export function TVModeScreen() {
  const { data: channelIndex, isLoading, error, refetch } = useIPTVChannels();
  const {
    selectedCountry, setCountry,
    selectedLanguage, setLanguage,
    uiLanguage, setUiLanguage,
    showFavoritesOnly, toggleFavoritesOnly,
    showMainstreamOnly, toggleMainstreamOnly,
    sidebarVisible, toggleSidebar,
  } = useFilterStore();
  const { data: countries } = useIPTVCountries();
  const { data: languages } = useIPTVLanguages();
  const flatListRef = useRef<FlatList>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [channelOsd, setChannelOsd] = useState<string | null>(null);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateApplying, setUpdateApplying] = useState(false);

  // Focus zones for D-pad navigation: toolbar > channels > star > controls
  const [focusZone, setFocusZone] = useState<'channels' | 'star' | 'controls' | 'toolbar'>('channels');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [controlFocusIdx, setControlFocusIdx] = useState(0);
  // Toolbar items: 0=Favorites, 1=Popular, 2=Country, 3=Settings
  const [toolbarFocusIdx, setToolbarFocusIdx] = useState(0);

  // Background update check
  useEffect(() => {
    startBackgroundUpdateCheck((info) => setUpdateInfo(info));
    return () => stopBackgroundUpdateCheck();
  }, []);

  const {
    currentChannel,
    channelIndex: currentIdx,
    isPlaying,
    isMuted,
    isBuffering,
    error: playerError,
    play,
    channelUp,
    channelDown,
    togglePlay,
    toggleMute,
    reload,
  } = usePlayerStore();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Base list per country+language — assigns stable channel numbers
  const allChannels = useMemo(() => {
    if (!channelIndex) return { list: [] as UnifiedChannel[], numberMap: new Map<string, number>() };
    let list = channelIndex.all.filter(ch => ch.country === selectedCountry);
    if (selectedLanguage !== 'all') {
      list = list.filter(ch => ch.language === selectedLanguage);
    }
    const sorted = [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
    // Assign stable number per country list (persists across filters)
    const numberMap = new Map<string, number>();
    sorted.forEach((ch, i) => numberMap.set(ch.id, i + 1));
    return { list: sorted, numberMap };
  }, [channelIndex, selectedCountry, selectedLanguage]);

  const channelNumberMap = allChannels.numberMap;

  const channels = useMemo(() => {
    let list = allChannels.list;
    if (showFavoritesOnly) {
      const favIds = new Set(favorites.map(f => f.id));
      list = list.filter(ch => favIds.has(ch.id));
    }
    if (showMainstreamOnly) {
      list = list.filter(ch => ch.isMainstream);
    }
    return list;
  }, [allChannels, showFavoritesOnly, showMainstreamOnly, favorites]);

  // Auto-play first channel only on initial mount (not on filter changes)
  const hasAutoPlayed = useRef(false);
  useEffect(() => {
    if (channels.length > 0 && !currentChannel && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      play(channels[0], channels, 0);
    }
  }, [channels, currentChannel, play]);

  // Navigate channels WITHOUT auto-playing — confirm with Enter
  const handleChannelSelect = useCallback(
    (channel: UnifiedChannel, index: number) => {
      play(channel, channels, index);
    },
    [channels, play],
  );

  // Control buttons in order for D-pad navigation
  const controlActions = useMemo(() => [
    { id: 'prev', action: () => { const idx = channels.indexOf(currentChannel!); if (idx > 0) { play(channels[idx - 1], channels, idx - 1); } } },
    { id: 'playpause', action: togglePlay },
    { id: 'next', action: () => { const idx = channels.indexOf(currentChannel!); if (idx < channels.length - 1) { play(channels[idx + 1], channels, idx + 1); } } },
    { id: 'mute', action: toggleMute },
    { id: 'fav', action: () => { if (currentChannel) toggleFavorite(currentChannel); } },
    { id: 'reload', action: reload },
    { id: 'fullscreen', action: toggleSidebar },
  ], [channels, currentChannel, play, togglePlay, toggleMute, toggleFavorite, reload, toggleSidebar]);

  // TV remote handlers — D-pad navigation with focus zones
  const remoteHandlers = useMemo(
    () => ({
      // Down arrow
      onDown: () => {
        if (focusZone === 'toolbar') {
          setFocusZone('channels');
          if (channels.length > 0) setHighlightedIdx(0);
        } else if (focusZone === 'channels') {
          if (sidebarVisible) {
            if (channels.length > 0) {
              setHighlightedIdx(prev => prev < 0 ? 0 : Math.min(prev + 1, channels.length - 1));
            }
          } else {
            channelDown();
          }
        } else if (focusZone === 'controls' || focusZone === 'star') {
          setFocusZone('channels');
        }
      },
      // Up arrow
      onUp: () => {
        if (focusZone === 'channels') {
          if (sidebarVisible) {
            if (highlightedIdx <= 0) {
              setFocusZone('toolbar');
              setToolbarFocusIdx(0);
              setHighlightedIdx(-1);
            } else {
              setHighlightedIdx(prev => prev - 1);
            }
          } else {
            channelUp();
          }
        } else if (focusZone === 'controls' || focusZone === 'star') {
          setFocusZone('channels');
        }
      },
      // Right
      onRight: () => {
        if (focusZone === 'toolbar') {
          setToolbarFocusIdx(prev => Math.min(prev + 1, 3));
        } else if (focusZone === 'channels' && sidebarVisible) {
          setFocusZone('star');
        } else if (focusZone === 'star') {
          setFocusZone('controls');
          setControlFocusIdx(0);
        } else if (focusZone === 'controls') {
          setControlFocusIdx(prev => Math.min(prev + 1, controlActions.length - 1));
        }
      },
      // Left
      onLeft: () => {
        if (focusZone === 'toolbar') {
          setToolbarFocusIdx(prev => Math.max(prev - 1, 0));
        } else if (focusZone === 'controls') {
          if (controlFocusIdx > 0) {
            setControlFocusIdx(prev => prev - 1);
          } else {
            setFocusZone('star');
          }
        } else if (focusZone === 'star') {
          setFocusZone('channels');
        } else if (!sidebarVisible) {
          toggleSidebar();
          setFocusZone('channels');
        }
      },
      // Select/Enter = confirm action in current focus zone
      onSelect: () => {
        if (focusZone === 'toolbar') {
          // 0=Favorites, 1=Popular, 2=Country (no-op, use native picker), 3=Settings
          if (toolbarFocusIdx === 0) toggleFavoritesOnly();
          else if (toolbarFocusIdx === 1) toggleMainstreamOnly();
          else if (toolbarFocusIdx === 3) setSettingsOpen(true);
        } else if (focusZone === 'channels' && highlightedIdx >= 0 && highlightedIdx < channels.length) {
          play(channels[highlightedIdx], channels, highlightedIdx);
        } else if (focusZone === 'star' && highlightedIdx >= 0 && highlightedIdx < channels.length) {
          toggleFavorite(channels[highlightedIdx]);
        } else if (focusZone === 'controls') {
          controlActions[controlFocusIdx]?.action();
        }
      },
      onMenu: () => {
        if (!sidebarVisible) {
          toggleSidebar();
          setFocusZone('channels');
        } else if (settingsOpen) {
          setSettingsOpen(false);
        }
      },
      onPlayPause: togglePlay,
    }),
    [focusZone, highlightedIdx, controlFocusIdx, toolbarFocusIdx, channels, sidebarVisible,
     channelUp, channelDown, play, togglePlay, toggleMute, toggleSidebar,
     toggleFavorite, toggleFavoritesOnly, toggleMainstreamOnly, controlActions, settingsOpen],
  );

  useTVRemote(remoteHandlers);

  // Scroll highlighted channel into view using FlatList
  useEffect(() => {
    if (highlightedIdx >= 0 && channels.length > 0 && flatListRef.current) {
      const idx = Math.min(highlightedIdx, channels.length - 1);
      flatListRef.current.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [highlightedIdx, channels.length]);

  // OSD channel indicator for fullscreen zapping
  const showOsd = useCallback((text: string) => {
    setChannelOsd(text);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => setChannelOsd(null), 3000);
  }, []);

  // Show OSD when channel changes in fullscreen
  const prevChannelRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentChannel) return;
    const prevId = prevChannelRef.current;
    prevChannelRef.current = currentChannel.id;
    if (prevId && prevId !== currentChannel.id && !sidebarVisible) {
      const num = channelNumberMap.get(currentChannel.id) ?? '';
      showOsd(`${num}  ${currentChannel.name}`);
    }
  }, [currentChannel, sidebarVisible, showOsd, channelNumberMap]);

  // Country options
  const countryOptions = useMemo(() => {
    if (!countries) return [];
    return [...countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        value: c.code,
        label: `${c.flag} ${c.name}`,
      }));
  }, [countries]);

  // FlatList renderItem — memoized
  const renderChannelItem = useCallback(({ item, index }: { item: UnifiedChannel; index: number }) => {
    const isActive = currentChannel?.id === item.id;
    const isHighlighted = focusZone === 'channels' && highlightedIdx === index;
    return (
      <ChannelItem
        channel={item}
        number={channelNumberMap.get(item.id) ?? index + 1}
        isActive={isActive}
        isHighlighted={isHighlighted}
        isFav={isFavorite(item.id)}
        starFocused={focusZone === 'star' && highlightedIdx === index}
        onPress={() => handleChannelSelect(item, index)}
        onStarPress={() => toggleFavorite(item)}
      />
    );
  }, [currentChannel?.id, focusZone, highlightedIdx, channelNumberMap, isFavorite, handleChannelSelect, toggleFavorite]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: UnifiedChannel) => item.id, []);

  if (isLoading && !channelIndex) {
    return <LoadingSpinner message={t(uiLanguage, 'loading')} fullScreen />;
  }

  if (error && !channelIndex) {
    return <ErrorState message={t(uiLanguage, 'loadError')} onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      {/* Left sidebar: toolbar + filters + channel list */}
      {sidebarVisible && (
        <View style={styles.sidebar}>
          {/* Toolbar: Logo ... Country flag + Config */}
          <View style={styles.toolbar}>
            <Text style={styles.logo}>Tve<Text style={styles.logoPlus}>+</Text></Text>
            <View style={styles.toolbarSpacer} />

            {/* Country picker — globe icon with ISO code */}
            <View style={[
              styles.countryPickerWrap,
              focusZone === 'toolbar' && toolbarFocusIdx === 2 && styles.toolbarItemFocused,
            ]}>
              <GlobeIcon
                size={24}
                color={colors.textSecondary}
                label={selectedCountry.toUpperCase()}
              />
              {Platform.OS === 'web' && (
                <select
                  value={selectedCountry}
                  onChange={(e: any) => setCountry(e.target.value)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  } as any}
                >
                  {countryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </View>

            <Pressable
              onPress={() => setSettingsOpen(true)}
              style={({ pressed }) => [
                styles.toolbarBtn,
                pressed && styles.toolbarBtnPressed,
                focusZone === 'toolbar' && toolbarFocusIdx === 3 && styles.toolbarItemFocused,
              ]}
            >
              <GearIcon size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Filter tags row */}
          <View style={styles.filterRow}>
            <Pressable
              onPress={toggleFavoritesOnly}
              style={[
                styles.filterTag,
                showFavoritesOnly && styles.filterTagActive,
                focusZone === 'toolbar' && toolbarFocusIdx === 0 && styles.toolbarItemFocused,
              ]}
            >
              <Text style={[styles.filterTagText, showFavoritesOnly && styles.filterTagTextActive]}>
                {'\u2605'} {t(uiLanguage, 'favorites')}
              </Text>
            </Pressable>

            <Pressable
              onPress={toggleMainstreamOnly}
              style={[
                styles.filterTag,
                showMainstreamOnly && styles.filterTagActive,
                focusZone === 'toolbar' && toolbarFocusIdx === 1 && styles.toolbarItemFocused,
              ]}
            >
              <Text style={[styles.filterTagText, showMainstreamOnly && styles.filterTagTextActive]}>
                {'\u265B'} {t(uiLanguage, 'popular')}
              </Text>
            </Pressable>
          </View>

          {/* Channel list header */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t(uiLanguage, 'channels')}</Text>
            <Text style={styles.listCount}>{channels.length}</Text>
          </View>

          {/* Channel list — FlatList for performance */}
          <FlatList
            ref={flatListRef}
            data={channels}
            renderItem={renderChannelItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={7}
            removeClippedSubviews={Platform.OS !== 'web'}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
          />
        </View>
      )}

      {/* Player section — flex:1 fills remaining space, never behind sidebar */}
      <View style={styles.playerSection}>
        {currentChannel ? (
          <>
            <VideoPlayer />

            {/* Controls bar — always visible when sidebar is open */}
            {sidebarVisible && (
              <View style={styles.controlBarWrap}>
                <View style={[styles.overlayGradient, Platform.OS === 'web' && { background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' } as any]} />
                <View style={styles.controlBar}>
                  <View style={styles.controlBarLeft}>
                    {/* Prev — idx 0 */}
                    <Pressable
                      onPress={controlActions[0].action}
                      style={({ pressed }) => [
                        styles.ctrlBtn,
                        pressed && styles.ctrlBtnPressed,
                        focusZone === 'controls' && controlFocusIdx === 0 && styles.ctrlBtnFocused,
                      ]}
                    >
                      <SkipPrevIcon size={18} color="#fff" />
                    </Pressable>

                    {/* Play/Pause — idx 1 */}
                    <Pressable
                      onPress={togglePlay}
                      style={({ pressed }) => [
                        styles.ctrlBtn,
                        pressed && styles.ctrlBtnPressed,
                        focusZone === 'controls' && controlFocusIdx === 1 && styles.ctrlBtnFocused,
                      ]}
                    >
                      {isPlaying ? <PauseIcon size={22} color="#fff" /> : <PlayIcon size={22} color="#fff" />}
                    </Pressable>

                    {/* Next — idx 2 */}
                    <Pressable
                      onPress={controlActions[2].action}
                      style={({ pressed }) => [
                        styles.ctrlBtn,
                        pressed && styles.ctrlBtnPressed,
                        focusZone === 'controls' && controlFocusIdx === 2 && styles.ctrlBtnFocused,
                      ]}
                    >
                      <SkipNextIcon size={18} color="#fff" />
                    </Pressable>

                    {/* Mute — idx 3 */}
                    <Pressable
                      onPress={toggleMute}
                      style={({ pressed }) => [
                        styles.ctrlBtn,
                        pressed && styles.ctrlBtnPressed,
                        focusZone === 'controls' && controlFocusIdx === 3 && styles.ctrlBtnFocused,
                      ]}
                    >
                      {isMuted ? <VolumeMuteIcon size={20} color="#fff" /> : <VolumeOnIcon size={20} color="#fff" />}
                    </Pressable>

                    <Text style={styles.controlBarTitle} numberOfLines={1}>
                      {channelNumberMap.get(currentChannel.id) ?? ''}. {currentChannel.name}
                    </Text>
                  </View>

                  {isBuffering && (
                    <Text style={styles.controlBarStatus}>{t(uiLanguage, 'buffering')}</Text>
                  )}

                  {playerError && (
                    <Text style={styles.controlBarError}>{playerError}</Text>
                  )}

                  <View style={styles.controlBarRight}>
                    {/* Favorite — idx 4 */}
                    <Pressable
                      onPress={controlActions[4].action}
                      style={({ pressed }) => [
                        styles.ctrlBtn,
                        pressed && styles.ctrlBtnPressed,
                        focusZone === 'controls' && controlFocusIdx === 4 && styles.ctrlBtnFocused,
                      ]}
                    >
                      <Text style={[styles.ctrlStarIcon, currentChannel && isFavorite(currentChannel.id) && styles.ctrlStarActive]}>
                        {currentChannel && isFavorite(currentChannel.id) ? '\u2605' : '\u2606'}
                      </Text>
                    </Pressable>

                    {/* Reload — idx 5 */}
                    <Pressable
                      onPress={reload}
                      style={({ pressed }) => [
                        styles.ctrlBtn,
                        pressed && styles.ctrlBtnPressed,
                        focusZone === 'controls' && controlFocusIdx === 5 && styles.ctrlBtnFocused,
                      ]}
                    >
                      <ReloadIcon size={18} color="#fff" />
                    </Pressable>

                    {/* Fullscreen — idx 6 */}
                    <Pressable
                      onPress={toggleSidebar}
                      style={({ pressed }) => [
                        styles.ctrlBtn,
                        pressed && styles.ctrlBtnPressed,
                        focusZone === 'controls' && controlFocusIdx === 6 && styles.ctrlBtnFocused,
                      ]}
                    >
                      <FullscreenIcon size={20} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Fullscreen: OSD channel number (zapping style) */}
            {!sidebarVisible && channelOsd && (
              <View style={styles.osd} pointerEvents="none">
                <Text style={styles.osdText}>{channelOsd}</Text>
              </View>
            )}

            {/* Fullscreen: exit button (subtle, top-left) */}
            {!sidebarVisible && (
              <Pressable
                onPress={toggleSidebar}
                style={({ pressed }) => [styles.fsExitBtn, pressed && styles.fsExitBtnPressed]}
              >
                <FullscreenExitIcon size={22} color="rgba(255,255,255,0.5)" />
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.noChannel}>
            <Text style={styles.noChannelText}>{t(uiLanguage, 'selectChannel')}</Text>
          </View>
        )}
      </View>

      {/* Settings modal */}
      {settingsOpen && (() => {
        const handleClearCache = async () => {
          await AsyncStorage.clear();
          setCacheCleared(true);
          setTimeout(() => setCacheCleared(false), 2000);
        };

        const handleCheckUpdate = async () => {
          setUpdateChecking(true);
          const info = await checkForUpdate();
          setUpdateInfo(info.hasUpdate ? info : null);
          setUpdateChecking(false);
          if (!info.hasUpdate) {
            setUpdateInfo({ version: APP_VERSION, downloadUrl: '', hasUpdate: false });
            setTimeout(() => setUpdateInfo(null), 2000);
          }
        };

        const handleApplyUpdate = async () => {
          if (!updateInfo?.downloadUrl) return;
          setUpdateApplying(true);
          try {
            await applyUpdate(updateInfo.downloadUrl);
          } catch (err) {
            console.error('Update failed:', err);
            setUpdateApplying(false);
          }
        };

        const modalInner = (
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(uiLanguage, 'settings')}</Text>
              <Pressable onPress={() => setSettingsOpen(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseIcon}>{'\u2715'}</Text>
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {/* Language */}
              <Text style={styles.modalLabel}>{t(uiLanguage, 'language')}</Text>
              <SelectPicker
                value={uiLanguage}
                onChange={setUiLanguage}
                options={UI_LANGUAGES}
              />

              {/* Check for updates */}
              <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>
                {t(uiLanguage, 'checkUpdates')}
              </Text>
              {updateInfo?.hasUpdate ? (
                <Pressable
                  onPress={handleApplyUpdate}
                  disabled={updateApplying}
                  style={({ pressed }) => [styles.modalUpdateBtn, pressed && styles.modalUpdateBtnPressed]}
                >
                  <Text style={styles.modalUpdateBtnText}>
                    {updateApplying
                      ? t(uiLanguage, 'updating')
                      : `${t(uiLanguage, 'updateAvailable')}: v${updateInfo.version}`}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleCheckUpdate}
                  disabled={updateChecking}
                  style={({ pressed }) => [styles.modalCheckBtn, pressed && styles.modalCheckBtnPressed]}
                >
                  <Text style={styles.modalCheckBtnText}>
                    {updateChecking
                      ? t(uiLanguage, 'checking')
                      : updateInfo && !updateInfo.hasUpdate
                        ? t(uiLanguage, 'upToDate')
                        : t(uiLanguage, 'checkUpdates')}
                  </Text>
                </Pressable>
              )}

              {/* Clear cache */}
              <Text style={[styles.modalLabel, { marginTop: spacing.md }]}>
                {t(uiLanguage, 'clearCache')}
              </Text>
              <Pressable
                onPress={handleClearCache}
                style={({ pressed }) => [styles.modalDangerBtn, pressed && styles.modalDangerBtnPressed]}
              >
                <Text style={styles.modalDangerBtnText}>
                  {cacheCleared ? t(uiLanguage, 'clearCacheDone') : t(uiLanguage, 'clearCache')}
                </Text>
              </Pressable>

              {/* Version + Contact */}
              <View style={styles.modalFooter}>
                <Text style={styles.modalVersion}>
                  {t(uiLanguage, 'version')} {APP_VERSION}
                </Text>
                <Text style={styles.modalContact}>
                  {t(uiLanguage, 'contact')}: tveplus@app.com
                </Text>
              </View>
            </View>
          </View>
        );

        if (Platform.OS === 'web') {
          return <View style={styles.modalOverlay}>{modalInner}</View>;
        }
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
            <Pressable style={styles.modalOverlay} onPress={() => setSettingsOpen(false)}>
              {modalInner}
            </Pressable>
          </Modal>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },

  // Sidebar — fixed width, never overlaps player
  sidebar: {
    width: 280,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceHighlight,
    zIndex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHighlight,
    gap: spacing.sm,
    minHeight: 52,
  },
  logo: {
    ...typography.title,
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 22,
  },
  logoPlus: {
    color: colors.accent,
    fontWeight: '800',
  },
  toolbarSpacer: {
    flex: 1,
  },
  toolbarBtn: {
    padding: 6,
    borderRadius: 6,
  },
  toolbarBtnPressed: {
    opacity: 0.7,
  },

  // Filter tags
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHighlight,
    alignItems: 'center',
  },
  countryPickerWrap: {
    position: 'relative',
    padding: 6,
    borderRadius: 6,
  } as any,
  filterTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTagActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterTagText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  filterTagTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  toolbarItemFocused: {
    borderWidth: 2,
    borderColor: colors.focusBorder,
    borderRadius: 8,
  },

  pickerFallback: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // List
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHighlight,
    gap: spacing.xs,
  },
  listTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  listCount: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  listScroll: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    height: ITEM_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceLight,
  },
  listItemActive: {
    backgroundColor: colors.surfaceHighlight,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  listItemHighlighted: {
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.focusBorder,
  },
  listItemPressed: {
    backgroundColor: colors.surfaceLight,
  },
  itemNumberBubble: {
    minWidth: 28,
    height: 22,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    paddingHorizontal: 4,
  },
  itemNumberBubbleActive: {
    backgroundColor: colors.accent,
  },
  itemNumber: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  itemLogo: {
    width: 24,
    height: 18,
    marginRight: spacing.xs,
    borderRadius: 2,
  },
  itemName: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
  },
  itemTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  itemStar: {
    paddingLeft: spacing.xs,
    paddingRight: 4,
  },
  itemStarIcon: {
    fontSize: 14,
    color: colors.textMuted,
  },
  itemStarActive: {
    color: colors.focusBorder,
  },
  itemStarFocused: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.focusBorder,
  },

  // Player — fills remaining space
  playerSection: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  } as any,
  noChannel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noChannelText: {
    ...typography.body,
    color: colors.textMuted,
  },

  // Control bar — fixed at bottom of player section
  controlBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  } as any,
  overlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  } as any,
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  controlBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  controlBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ctrlBtn: {
    padding: 8,
    borderRadius: 6,
  },
  ctrlBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  ctrlBtnFocused: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: colors.focusBorder,
    borderRadius: 6,
  },
  ctrlStarIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.6)',
  },
  ctrlStarActive: {
    color: colors.focusBorder,
  },
  controlBarTitle: {
    ...typography.body,
    color: '#fff',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    opacity: 0.9,
  },
  controlBarStatus: {
    ...typography.caption,
    color: colors.buffering,
    fontSize: 11,
    marginHorizontal: 8,
  },
  controlBarError: {
    ...typography.caption,
    color: colors.error,
    fontSize: 11,
    marginHorizontal: 8,
  },

  // Fullscreen OSD — channel number zapping style
  osd: {
    position: 'absolute',
    top: 40,
    right: 40,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    zIndex: 20,
  } as any,
  osdText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 2,
  } as any,
  fsExitBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 20,
  } as any,
  fsExitBtnPressed: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },

  // Settings modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  } as any,
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: 340,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.surfaceHighlight,
  } as any,
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHighlight,
  },
  modalTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  modalClose: {
    padding: 4,
  },
  modalCloseIcon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalBody: {
    padding: spacing.md,
  },
  modalLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase' as any,
    letterSpacing: 1,
    fontSize: 10,
    marginBottom: spacing.sm,
  },
  modalCheckBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceHighlight,
    alignItems: 'center',
  } as any,
  modalCheckBtnPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  modalCheckBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  modalUpdateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
  } as any,
  modalUpdateBtnPressed: {
    opacity: 0.8,
  },
  modalUpdateBtnText: {
    ...typography.body,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalDangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceHighlight,
    alignItems: 'center',
  } as any,
  modalDangerBtnPressed: {
    backgroundColor: 'rgba(229,62,62,0.15)',
    borderColor: colors.error,
  },
  modalDangerBtnText: {
    ...typography.body,
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHighlight,
  },
  modalVersion: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  modalContact: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
