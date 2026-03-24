import React, { useEffect, useCallback, useMemo, useRef, useState, memo } from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet, Platform, Modal, ActivityIndicator, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { useIPTVChannels, useIPTVCountries } from '../hooks/useIPTVChannels';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useFilterStore } from '../hooks/useFilterStore';
import { useSourceStore } from '../hooks/useSourceStore';
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

const selectStyle = {
  backgroundColor: colors.surfaceLight,
  color: colors.textSecondary,
  border: `1px solid ${colors.surfaceHighlight}`,
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 12,
  outline: 'none',
  cursor: 'pointer',
  width: '100%',
} as any;

const countrySelectStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
} as any;

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
        style={selectStyle}
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

// Channel initial for lazy logo fallback
function channelInitial(name: string): string {
  return (name || '?')[0].toUpperCase();
}

// Lazy logo — shows initial letter, loads image only when visible
const LazyLogo = memo(function LazyLogo({ uri, name }: { uri?: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={styles.itemLogoInitial}>
        <Text style={styles.itemLogoInitialText}>{channelInitial(name)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.itemLogoWrap}>
      {!loaded && (
        <View style={[styles.itemLogoInitial, styles.itemLogoInitialAbsolute]}>
          <Text style={styles.itemLogoInitialText}>{channelInitial(name)}</Text>
        </View>
      )}
      <Image
        source={{ uri }}
        style={[styles.itemLogo, !loaded && styles.itemLogoHidden]}
        resizeMode="contain"
        fadeDuration={0}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </View>
  );
});

// Memoized channel list item — simplified for TV performance
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
  const highlighted = isActive || isHighlighted;
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
      <Text style={[styles.itemNumber, highlighted && styles.itemTextActive]}>
        {number}
      </Text>
      <Text
        style={[styles.itemName, highlighted && styles.itemTextActive]}
        numberOfLines={1}
      >
        {channel.name || '?'}
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

// Smart wrapper — only re-renders when THIS item's derived state changes
const ChannelItemConnected = memo(function ChannelItemConnected({
  channel, index, channelNumberMap, currentChannelId, focusZone, highlightedIdx, favoriteIds, handlersRef,
}: {
  channel: UnifiedChannel;
  index: number;
  channelNumberMap: Map<string, number>;
  currentChannelId: string | null;
  focusZone: string;
  highlightedIdx: number;
  favoriteIds: Set<string>;
  handlersRef: React.MutableRefObject<{ handleChannelSelect: (ch: UnifiedChannel, i: number) => void; toggleFavorite: (ch: UnifiedChannel) => void }>;
}) {
  const isActive = currentChannelId === channel.id;
  const isHighlighted = focusZone === 'channels' && highlightedIdx === index;
  const starFocused = focusZone === 'star' && highlightedIdx === index;
  const isFav = favoriteIds.has(channel.id);
  const number = channelNumberMap.get(channel.id) ?? index + 1;

  const onPress = useCallback(() => handlersRef.current.handleChannelSelect(channel, index), [channel, index, handlersRef]);
  const onStarPress = useCallback(() => handlersRef.current.toggleFavorite(channel), [channel, handlersRef]);

  return (
    <ChannelItem
      channel={channel}
      number={number}
      isActive={isActive}
      isHighlighted={isHighlighted}
      isFav={isFav}
      starFocused={starFocused}
      onPress={onPress}
      onStarPress={onStarPress}
    />
  );
}, (prev, next) => {
  // Only re-render if THIS item's visual state changed
  const prevActive = prev.currentChannelId === prev.channel.id;
  const nextActive = next.currentChannelId === next.channel.id;
  if (prevActive !== nextActive) return false;

  const prevHL = prev.focusZone === 'channels' && prev.highlightedIdx === prev.index;
  const nextHL = next.focusZone === 'channels' && next.highlightedIdx === next.index;
  if (prevHL !== nextHL) return false;

  const prevStar = prev.focusZone === 'star' && prev.highlightedIdx === prev.index;
  const nextStar = next.focusZone === 'star' && next.highlightedIdx === next.index;
  if (prevStar !== nextStar) return false;

  const prevFav = prev.favoriteIds.has(prev.channel.id);
  const nextFav = next.favoriteIds.has(next.channel.id);
  if (prevFav !== nextFav) return false;

  if (prev.channel.id !== next.channel.id) return false;
  if (prev.channelNumberMap !== next.channelNumberMap) return false;

  return true;
});

const modalLabelWithMargin = [{ marginTop: spacing.md }];

const SettingsModal = memo(function SettingsModal({
  uiLanguage, setUiLanguage, updateInfo, setUpdateInfo, onClose,
}: {
  uiLanguage: string;
  setUiLanguage: (lang: string) => void;
  updateInfo: UpdateInfo | null;
  setUpdateInfo: (info: UpdateInfo | null) => void;
  onClose: () => void;
}) {
  const [cacheCleared, setCacheCleared] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateApplying, setUpdateApplying] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [addingSource, setAddingSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  const { sources, toggleSource, addCustomSource, removeCustomSource } = useSourceStore();

  // D-pad focus management for TV
  // Items: 0=language, 1..N=sources, N+1=add source, N+2=updates, N+3=clear cache, N+4=close
  const [focusIdx, setFocusIdx] = useState(0);
  const langIdx = UI_LANGUAGES.findIndex(l => l.value === uiLanguage);

  const SOURCE_START = 1;
  const SOURCE_END = SOURCE_START + sources.length; // exclusive
  const ADD_SOURCE_IDX = SOURCE_END;
  const UPDATE_IDX = ADD_SOURCE_IDX + 1;
  const CACHE_IDX = UPDATE_IDX + 1;
  const CLOSE_IDX = CACHE_IDX + 1;
  const ITEM_COUNT = CLOSE_IDX + 1;

  const handleClearCache = useCallback(async () => {
    await AsyncStorage.clear();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    setUpdateChecking(true);
    setUpdateError('');
    const info = await checkForUpdate();
    setUpdateInfo(info.hasUpdate ? info : null);
    setUpdateChecking(false);
    if (info.error) {
      setUpdateError(info.error);
      setTimeout(() => setUpdateError(''), 5000);
    } else if (!info.hasUpdate) {
      setUpdateInfo({ version: APP_VERSION, downloadUrl: '', hasUpdate: false });
      setTimeout(() => setUpdateInfo(null), 2000);
    }
  }, [setUpdateInfo]);

  const handleApplyUpdate = useCallback(async () => {
    if (!updateInfo?.downloadUrl) return;
    setUpdateApplying(true);
    setUpdateError('');
    try {
      await applyUpdate(updateInfo.downloadUrl);
    } catch (err: any) {
      console.error('Update failed:', err);
      setUpdateError(err?.message || 'Update failed');
      setUpdateApplying(false);
    }
  }, [updateInfo?.downloadUrl]);

  const handleAddSource = useCallback(() => {
    if (newSourceName.trim() && newSourceUrl.trim()) {
      addCustomSource(newSourceName.trim(), newSourceUrl.trim());
      setNewSourceName('');
      setNewSourceUrl('');
      setAddingSource(false);
    }
  }, [newSourceName, newSourceUrl, addCustomSource]);

  // Handle D-pad inside modal (TV remote)
  useTVRemote(useMemo(() => ({
    onUp: () => setFocusIdx(prev => Math.max(prev - 1, 0)),
    onDown: () => setFocusIdx(prev => Math.min(prev + 1, ITEM_COUNT - 1)),
    onLeft: () => {
      if (focusIdx === 0) {
        const prevIdx = langIdx <= 0 ? UI_LANGUAGES.length - 1 : langIdx - 1;
        setUiLanguage(UI_LANGUAGES[prevIdx].value);
      }
    },
    onRight: () => {
      if (focusIdx === 0) {
        const nextIdx = langIdx >= UI_LANGUAGES.length - 1 ? 0 : langIdx + 1;
        setUiLanguage(UI_LANGUAGES[nextIdx].value);
      }
    },
    onSelect: () => {
      if (focusIdx === 0) {
        const nextIdx = langIdx >= UI_LANGUAGES.length - 1 ? 0 : langIdx + 1;
        setUiLanguage(UI_LANGUAGES[nextIdx].value);
      } else if (focusIdx >= SOURCE_START && focusIdx < SOURCE_END) {
        const sourceIdx = focusIdx - SOURCE_START;
        toggleSource(sources[sourceIdx].id);
      } else if (focusIdx === ADD_SOURCE_IDX) {
        setAddingSource(true);
      } else if (focusIdx === UPDATE_IDX) {
        if (updateInfo?.hasUpdate) handleApplyUpdate();
        else handleCheckUpdate();
      } else if (focusIdx === CACHE_IDX) {
        handleClearCache();
      } else if (focusIdx === CLOSE_IDX) {
        onClose();
      }
    },
    onBack: () => {
      if (addingSource) { setAddingSource(false); return true; }
      onClose(); return true;
    },
    onMenu: () => {
      if (addingSource) setAddingSource(false);
      else onClose();
    },
  }), [focusIdx, langIdx, uiLanguage, sources, updateInfo, addingSource,
    ITEM_COUNT, SOURCE_START, SOURCE_END, ADD_SOURCE_IDX, UPDATE_IDX, CACHE_IDX, CLOSE_IDX,
    handleApplyUpdate, handleCheckUpdate, handleClearCache, onClose, setUiLanguage, toggleSource]));

  const modalInner = (
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{t(uiLanguage, 'settings')}</Text>
        <Pressable onPress={onClose} style={[styles.modalClose, focusIdx === CLOSE_IDX && styles.modalItemFocused]}>
          <Text style={styles.modalCloseIcon}>{'\u2715'}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.modalBody}>
        {/* Language */}
        <Text style={styles.modalLabel}>{t(uiLanguage, 'language')}</Text>
        {Platform.OS === 'web' ? (
          <SelectPicker value={uiLanguage} onChange={setUiLanguage} options={UI_LANGUAGES} />
        ) : (
          <View style={[styles.modalLangPicker, focusIdx === 0 && styles.modalItemFocused]}>
            <Text style={styles.modalLangArrow}>{'\u25C0'}</Text>
            <Text style={styles.modalLangValue}>
              {UI_LANGUAGES.find(l => l.value === uiLanguage)?.label || uiLanguage}
            </Text>
            <Text style={styles.modalLangArrow}>{'\u25B6'}</Text>
          </View>
        )}

        {/* Channel Sources */}
        <Text style={[styles.modalLabel, ...modalLabelWithMargin]}>
          {t(uiLanguage, 'sources')}
        </Text>
        {sources.map((source, i) => (
          <Pressable
            key={source.id}
            onPress={() => toggleSource(source.id)}
            style={[
              styles.sourceRow,
              focusIdx === SOURCE_START + i && styles.modalItemFocused,
            ]}
          >
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceName}>{source.name}</Text>
              {!source.isBuiltIn && (
                <Pressable onPress={() => removeCustomSource(source.id)} style={styles.sourceRemoveBtn}>
                  <Text style={styles.sourceRemoveText}>{'\u2715'}</Text>
                </Pressable>
              )}
            </View>
            <Text style={[styles.sourceStatus, source.enabled && styles.sourceStatusActive]}>
              {source.enabled ? t(uiLanguage, 'enabled') : t(uiLanguage, 'disabled')}
            </Text>
          </Pressable>
        ))}

        {/* Add custom source */}
        {addingSource ? (
          <View style={styles.addSourceForm}>
            <TextInput
              style={styles.addSourceInput}
              placeholder={t(uiLanguage, 'addSourceName')}
              placeholderTextColor={colors.textMuted}
              value={newSourceName}
              onChangeText={setNewSourceName}
              autoFocus
            />
            <TextInput
              style={styles.addSourceInput}
              placeholder={t(uiLanguage, 'addSourceUrl')}
              placeholderTextColor={colors.textMuted}
              value={newSourceUrl}
              onChangeText={setNewSourceUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.addSourceButtons}>
              <Pressable onPress={handleAddSource} style={styles.addSourceConfirmBtn}>
                <Text style={styles.addSourceConfirmText}>{t(uiLanguage, 'add')}</Text>
              </Pressable>
              <Pressable onPress={() => setAddingSource(false)} style={styles.addSourceCancelBtn}>
                <Text style={styles.addSourceCancelText}>{t(uiLanguage, 'cancel')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setAddingSource(true)}
            style={[styles.modalCheckBtn, focusIdx === ADD_SOURCE_IDX && styles.modalItemFocused]}
          >
            <Text style={styles.modalCheckBtnText}>+ {t(uiLanguage, 'addSource')}</Text>
          </Pressable>
        )}

        {/* Updates */}
        <Text style={[styles.modalLabel, ...modalLabelWithMargin]}>
          {t(uiLanguage, 'checkUpdates')}
        </Text>
        {updateInfo?.hasUpdate ? (
          <Pressable
            onPress={handleApplyUpdate}
            disabled={updateApplying}
            style={({ pressed }) => [styles.modalUpdateBtn, pressed && styles.modalUpdateBtnPressed, focusIdx === UPDATE_IDX && styles.modalItemFocused]}
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
            style={({ pressed }) => [styles.modalCheckBtn, pressed && styles.modalCheckBtnPressed, focusIdx === UPDATE_IDX && styles.modalItemFocused]}
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
        {updateError ? (
          <Text style={styles.modalErrorText}>{updateError}</Text>
        ) : null}

        {/* Clear cache */}
        <Text style={[styles.modalLabel, ...modalLabelWithMargin]}>
          {t(uiLanguage, 'clearCache')}
        </Text>
        <Pressable
          onPress={handleClearCache}
          style={({ pressed }) => [styles.modalDangerBtn, pressed && styles.modalDangerBtnPressed, focusIdx === CACHE_IDX && styles.modalItemFocused]}
        >
          <Text style={styles.modalDangerBtnText}>
            {cacheCleared ? t(uiLanguage, 'clearCacheDone') : t(uiLanguage, 'clearCache')}
          </Text>
        </Pressable>

        <View style={styles.modalFooter}>
          <Text style={styles.modalVersion}>{t(uiLanguage, 'version')} {APP_VERSION}</Text>
          <Text style={styles.modalContact}>{t(uiLanguage, 'contact')}: tveplus@app.com</Text>
        </View>
      </ScrollView>
    </View>
  );

  if (Platform.OS === 'web') {
    return <View style={styles.modalOverlay}>{modalInner}</View>;
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {modalInner}
      </View>
    </Modal>
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
  const flatListRef = useRef<FlatList>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [channelOsd, setChannelOsd] = useState<string | null>(null);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  // Focus zones for D-pad navigation: toolbar > channels > star > controls
  const [focusZone, setFocusZone] = useState<'channels' | 'star' | 'controls' | 'toolbar'>('channels');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [controlFocusIdx, setControlFocusIdx] = useState(0);
  // Toolbar items: 0=Favorites, 1=Popular, 2=Country, 3=Settings
  const [toolbarFocusIdx, setToolbarFocusIdx] = useState(0);

  const [updateBanner, setUpdateBanner] = useState<string | null>(null);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);

  // Background update check — shows banner and auto-applies
  useEffect(() => {
    startBackgroundUpdateCheck(async (info) => {
      setUpdateInfo(info);
      setUpdateBanner(`v${info.version} disponible`);

      // Auto-apply update on Android TV
      if (Platform.OS === 'android' && info.downloadUrl) {
        try {
          setIsAutoUpdating(true);
          setUpdateBanner(`Descargando v${info.version}...`);
          await applyUpdate(info.downloadUrl);
        } catch (err: any) {
          console.warn('[Updater] Auto-update failed:', err);
          setUpdateBanner(`Update v${info.version} - abrir Settings`);
          setIsAutoUpdating(false);
        }
      }
    });
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
  const { favorites, favoriteIds, toggleFavorite, isFavorite } = useFavorites();

  // Base list per country+language — assigns stable channel numbers
  // Data comes pre-sorted from buildChannelIndex, no need to re-sort
  const allChannels = useMemo(() => {
    if (!channelIndex) return { list: [] as UnifiedChannel[], numberMap: new Map<string, number>() };
    let list = channelIndex.all.filter(ch => ch.country === selectedCountry);
    if (selectedLanguage !== 'all') {
      list = list.filter(ch => ch.language === selectedLanguage);
    }
    const numberMap = new Map<string, number>();
    for (let i = 0; i < list.length; i++) {
      numberMap.set(list[i].id, i + 1);
    }
    return { list, numberMap };
  }, [channelIndex, selectedCountry, selectedLanguage]);

  const channelNumberMap = allChannels.numberMap;

  const MAX_VISIBLE = 100;
  const [showAllChannels, setShowAllChannels] = useState(false);

  // Reset "show all" when country or filters change
  useEffect(() => {
    setShowAllChannels(false);
  }, [selectedCountry, showFavoritesOnly, showMainstreamOnly]);

  const filteredChannels = useMemo(() => {
    let list = allChannels.list;
    if (showFavoritesOnly) {
      list = list.filter(ch => favoriteIds.has(ch.id));
    }
    if (showMainstreamOnly) {
      list = list.filter(ch => ch.isMainstream);
    }
    return list;
  }, [allChannels, showFavoritesOnly, showMainstreamOnly, favoriteIds]);

  const totalCount = filteredChannels.length;
  const isTruncated = !showAllChannels && !showFavoritesOnly && !showMainstreamOnly && totalCount > MAX_VISIBLE;
  const channels = isTruncated ? filteredChannels.slice(0, MAX_VISIBLE) : filteredChannels;

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
    { id: 'prev', action: () => { if (currentIdx > 0) { play(channels[currentIdx - 1], channels, currentIdx - 1); } } },
    { id: 'playpause', action: togglePlay },
    { id: 'next', action: () => { if (currentIdx < channels.length - 1) { play(channels[currentIdx + 1], channels, currentIdx + 1); } } },
    { id: 'mute', action: toggleMute },
    { id: 'fav', action: () => { if (currentChannel) toggleFavorite(currentChannel); } },
    { id: 'reload', action: reload },
    { id: 'fullscreen', action: toggleSidebar },
  ], [channels, currentChannel, currentIdx, play, togglePlay, toggleMute, toggleFavorite, reload, toggleSidebar]);

  // TV remote handlers — use refs so useTVRemote never re-attaches
  const stateRef = useRef({
    focusZone, highlightedIdx, controlFocusIdx, toolbarFocusIdx,
    channels, sidebarVisible, settingsOpen,
  });
  stateRef.current = {
    focusZone, highlightedIdx, controlFocusIdx, toolbarFocusIdx,
    channels, sidebarVisible, settingsOpen,
  };

  const actionsRef = useRef({
    channelUp, channelDown, play, togglePlay, toggleMute, toggleSidebar,
    toggleFavorite, toggleFavoritesOnly, toggleMainstreamOnly, controlActions,
  });
  actionsRef.current = {
    channelUp, channelDown, play, togglePlay, toggleMute, toggleSidebar,
    toggleFavorite, toggleFavoritesOnly, toggleMainstreamOnly, controlActions,
  };

  const remoteHandlers = useMemo(
    () => ({
      onDown: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return; // modal handles its own input
        if (s.focusZone === 'toolbar') {
          setFocusZone('channels');
          if (s.channels.length > 0) setHighlightedIdx(0);
        } else if (s.focusZone === 'channels') {
          if (s.sidebarVisible) {
            if (s.channels.length > 0) {
              setHighlightedIdx(prev => prev < 0 ? 0 : Math.min(prev + 1, s.channels.length - 1));
            }
          } else {
            actionsRef.current.channelDown();
          }
        } else if (s.focusZone === 'controls' || s.focusZone === 'star') {
          setFocusZone('channels');
        }
      },
      onUp: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        if (s.focusZone === 'channels') {
          if (s.sidebarVisible) {
            if (s.highlightedIdx <= 0) {
              setFocusZone('toolbar');
              setToolbarFocusIdx(0);
              setHighlightedIdx(-1);
            } else {
              setHighlightedIdx(prev => prev - 1);
            }
          } else {
            actionsRef.current.channelUp();
          }
        } else if (s.focusZone === 'controls' || s.focusZone === 'star') {
          setFocusZone('channels');
        }
      },
      onRight: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        if (s.focusZone === 'toolbar') {
          setToolbarFocusIdx(prev => Math.min(prev + 1, 3));
        } else if (s.focusZone === 'channels' && s.sidebarVisible) {
          setFocusZone('star');
        } else if (s.focusZone === 'star') {
          setFocusZone('controls');
          setControlFocusIdx(0);
        } else if (s.focusZone === 'controls') {
          setControlFocusIdx(prev => Math.min(prev + 1, 6));
        }
      },
      onLeft: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        if (s.focusZone === 'toolbar') {
          setToolbarFocusIdx(prev => Math.max(prev - 1, 0));
        } else if (s.focusZone === 'controls') {
          if (s.controlFocusIdx > 0) {
            setControlFocusIdx(prev => prev - 1);
          } else {
            setFocusZone('star');
          }
        } else if (s.focusZone === 'star') {
          setFocusZone('channels');
        } else if (!s.sidebarVisible) {
          actionsRef.current.toggleSidebar();
          setFocusZone('channels');
        }
      },
      onSelect: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        const a = actionsRef.current;
        if (s.focusZone === 'toolbar') {
          if (s.toolbarFocusIdx === 0) a.toggleFavoritesOnly();
          else if (s.toolbarFocusIdx === 1) a.toggleMainstreamOnly();
          else if (s.toolbarFocusIdx === 3) setSettingsOpen(true);
        } else if (s.focusZone === 'channels' && s.highlightedIdx >= 0 && s.highlightedIdx < s.channels.length) {
          a.play(s.channels[s.highlightedIdx], s.channels, s.highlightedIdx);
        } else if (s.focusZone === 'star' && s.highlightedIdx >= 0 && s.highlightedIdx < s.channels.length) {
          a.toggleFavorite(s.channels[s.highlightedIdx]);
        } else if (s.focusZone === 'controls') {
          a.controlActions[s.controlFocusIdx]?.action();
        }
      },
      onMenu: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        if (!s.sidebarVisible) {
          actionsRef.current.toggleSidebar();
          setFocusZone('channels');
        } else if (s.settingsOpen) {
          setSettingsOpen(false);
        }
      },
      onBack: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return true; // modal handles its own back
        if (!s.sidebarVisible) {
          actionsRef.current.toggleSidebar();
          setFocusZone('channels');
          return true;
        }
        return false; // sidebar visible, no modal — let app close
      },
      onPlayPause: () => actionsRef.current.togglePlay(),
    }),
    [], // stable — reads from refs
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

  // Stable callbacks via ref — prevents renderItem from depending on volatile state
  const handlersRef = useRef({ handleChannelSelect, toggleFavorite });
  handlersRef.current = { handleChannelSelect, toggleFavorite };

  // FlatList renderItem — only depends on stable refs
  const renderChannelItem = useCallback(({ item, index }: { item: UnifiedChannel; index: number }) => {
    return (
      <ChannelItemConnected
        channel={item}
        index={index}
        channelNumberMap={channelNumberMap}
        currentChannelId={currentChannel?.id ?? null}
        focusZone={focusZone}
        highlightedIdx={highlightedIdx}
        favoriteIds={favoriteIds}
        handlersRef={handlersRef}
      />
    );
  }, [channelNumberMap, currentChannel?.id, focusZone, highlightedIdx, favoriteIds]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: UnifiedChannel) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Left sidebar: toolbar + filters + channel list */}
      {sidebarVisible && (
        <View style={[styles.sidebar, { height: windowHeight }]}>
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
                  style={countrySelectStyle}
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
            <Text style={styles.listCount}>
              {isTruncated ? `${MAX_VISIBLE}/${totalCount}` : totalCount}
            </Text>
          </View>

          {/* Channel list — FlatList for performance */}
          {isLoading && !channelIndex ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.inlineLoadingText}>{t(uiLanguage, 'loading')}</Text>
            </View>
          ) : error && !channelIndex ? (
            <View style={styles.inlineLoading}>
              <Text style={styles.inlineErrorText}>{t(uiLanguage, 'loadError')}</Text>
              <Pressable onPress={() => refetch()} style={styles.inlineRetryBtn}>
                <Text style={styles.inlineRetryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
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
            removeClippedSubviews={false}
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            }}
            ListFooterComponent={isTruncated ? (
              <Pressable
                onPress={() => setShowAllChannels(true)}
                style={({ pressed }) => [styles.showAllBtn, pressed && styles.showAllBtnPressed]}
              >
                <Text style={styles.showAllBtnText}>
                  {t(uiLanguage, 'showAll')} ({totalCount})
                </Text>
              </Pressable>
            ) : null}
          />
          )}
        </View>
      )}

      {/* Player section — flex:1 fills remaining space */}
      <View style={[styles.playerSection, sidebarVisible && styles.playerWithSidebar]}>
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

            {/* Update banner */}
            {updateBanner && (
              <View style={styles.updateBanner} pointerEvents="none">
                {isAutoUpdating && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
                <Text style={styles.updateBannerText}>{updateBanner}</Text>
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
      {settingsOpen && (
        <SettingsModal
          uiLanguage={uiLanguage}
          setUiLanguage={setUiLanguage}
          updateInfo={updateInfo}
          setUpdateInfo={setUpdateInfo}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },

  // Sidebar — fixed width, height set dynamically via inline style for Android TV
  sidebar: {
    width: 280,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceHighlight,
    zIndex: 2,
    overflow: 'hidden' as const,
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
  itemNumber: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  itemLogoWrap: {
    width: 24,
    height: 20,
    marginRight: spacing.xs,
    position: 'relative',
  } as any,
  itemLogo: {
    width: 24,
    height: 20,
    borderRadius: 2,
  },
  itemLogoHidden: {
    opacity: 0,
    position: 'absolute',
  } as any,
  itemLogoInitial: {
    width: 24,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLogoInitialAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  } as any,
  itemLogoInitialText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
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

  inlineLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  } as any,
  inlineLoadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontSize: 12,
  },
  inlineErrorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    textAlign: 'center',
  } as any,
  inlineRetryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
  },
  inlineRetryText: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 12,
  },
  showAllBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: 8,
  } as any,
  showAllBtnPressed: {
    backgroundColor: colors.surfaceHighlight,
  },
  showAllBtnText: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },

  // Player — fills remaining space
  playerSection: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  } as any,
  playerWithSidebar: {
    // No marginLeft needed — sidebar is in normal flow, not absolute
  },
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
  updateBanner: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 150, 136, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  updateBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
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
    borderRadius: 4,
  },
  modalCloseIcon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalItemFocused: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  modalLangPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalLangValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  modalLangArrow: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 4,
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
  modalErrorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 6,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  sourceName: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  sourceRemoveBtn: {
    padding: 4,
  },
  sourceRemoveText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sourceStatus: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sourceStatusActive: {
    color: colors.accent,
  },
  addSourceForm: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 6,
    padding: 10,
    gap: 8,
    marginBottom: 6,
  },
  addSourceInput: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  addSourceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addSourceConfirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addSourceConfirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  addSourceCancelBtn: {
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addSourceCancelText: {
    color: colors.textMuted,
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
