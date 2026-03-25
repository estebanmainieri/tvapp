import React, { useEffect, useCallback, useMemo, useRef, useState, memo } from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet, Platform, ActivityIndicator, ScrollView, TextInput, useWindowDimensions, NativeModules } from 'react-native';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { MulticamPlayer } from '../components/player/MulticamPlayer';
import { useIPTVChannels, useIPTVCountries } from '../hooks/useIPTVChannels';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useFilterStore, ViewMode, GuideFilter } from '../hooks/useFilterStore';
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
  ReloadIcon, FullscreenIcon,
  SkipPrevIcon, SkipNextIcon, GearIcon, LayoutIcon,
  GuideIcon, TVIcon, GridIcon,
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
  uiLanguage, setUiLanguage, updateInfo, setUpdateInfo, onClose, displayVersion,
  selectedCountry, setCountry, countryOptions,
}: {
  uiLanguage: string;
  setUiLanguage: (lang: string) => void;
  updateInfo: UpdateInfo | null;
  setUpdateInfo: (info: UpdateInfo | null) => void;
  onClose: () => void;
  displayVersion: string;
  selectedCountry: string;
  setCountry: (code: string) => void;
  countryOptions: { value: string; label: string }[];
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
  // Items: 0=language, 1=country, 2..N=sources, N+1=add source, N+2=updates, N+3=clear cache, N+4=close
  const [focusIdx, setFocusIdx] = useState(0);
  const langIdx = UI_LANGUAGES.findIndex(l => l.value === uiLanguage);
  const countryIdx = countryOptions.findIndex(c => c.value === selectedCountry);

  const COUNTRY_FOCUS_IDX = 1;
  const SOURCE_START = 2;
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
      setUpdateInfo({ version: displayVersion, downloadUrl: '', bundleUrl: '', hasUpdate: false, isOta: false });
      setTimeout(() => setUpdateInfo(null), 2000);
    }
  }, [setUpdateInfo]);

  const handleApplyUpdate = useCallback(async () => {
    if (!updateInfo?.downloadUrl && !updateInfo?.bundleUrl) return;
    setUpdateApplying(true);
    setUpdateError('');
    try {
      await applyUpdate(updateInfo);
    } catch (err: any) {
      console.error('Update failed:', err);
      setUpdateError(err?.message || 'Update failed');
      setUpdateApplying(false);
    }
  }, [updateInfo]);

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
      } else if (focusIdx === COUNTRY_FOCUS_IDX && countryOptions.length > 0) {
        const prevIdx = countryIdx <= 0 ? countryOptions.length - 1 : countryIdx - 1;
        setCountry(countryOptions[prevIdx].value);
      }
    },
    onRight: () => {
      if (focusIdx === 0) {
        const nextIdx = langIdx >= UI_LANGUAGES.length - 1 ? 0 : langIdx + 1;
        setUiLanguage(UI_LANGUAGES[nextIdx].value);
      } else if (focusIdx === COUNTRY_FOCUS_IDX && countryOptions.length > 0) {
        const nextIdx = countryIdx >= countryOptions.length - 1 ? 0 : countryIdx + 1;
        setCountry(countryOptions[nextIdx].value);
      }
    },
    onSelect: () => {
      if (focusIdx === 0) {
        const nextIdx = langIdx >= UI_LANGUAGES.length - 1 ? 0 : langIdx + 1;
        setUiLanguage(UI_LANGUAGES[nextIdx].value);
      } else if (focusIdx === COUNTRY_FOCUS_IDX && countryOptions.length > 0) {
        const nextIdx = countryIdx >= countryOptions.length - 1 ? 0 : countryIdx + 1;
        setCountry(countryOptions[nextIdx].value);
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
  }), [focusIdx, langIdx, countryIdx, uiLanguage, sources, updateInfo, addingSource,
    ITEM_COUNT, SOURCE_START, SOURCE_END, ADD_SOURCE_IDX, UPDATE_IDX, CACHE_IDX, CLOSE_IDX, COUNTRY_FOCUS_IDX,
    handleApplyUpdate, handleCheckUpdate, handleClearCache, onClose, setUiLanguage, setCountry, toggleSource, countryOptions]));

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

        {/* Country */}
        <Text style={[styles.modalLabel, ...modalLabelWithMargin]}>
          {t(uiLanguage, 'country')}
        </Text>
        {Platform.OS === 'web' ? (
          <SelectPicker
            value={selectedCountry}
            onChange={setCountry}
            options={countryOptions}
          />
        ) : (
          <View style={[styles.modalLangPicker, focusIdx === COUNTRY_FOCUS_IDX && styles.modalItemFocused]}>
            <Text style={styles.modalLangArrow}>{'\u25C0'}</Text>
            <Text style={styles.modalLangValue}>
              {countryOptions.find(c => c.value === selectedCountry)?.label || selectedCountry}
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
          <Text style={styles.modalVersion}>{t(uiLanguage, 'version')} {displayVersion}</Text>
          <Text style={styles.modalContact}>{t(uiLanguage, 'contact')}: teveplus@app.com</Text>
        </View>
      </ScrollView>
    </View>
  );

  // Fullscreen overlay — doesn't interrupt playback
  return <View style={styles.settingsOverlay}>{modalInner}</View>;
});

const ITEM_HEIGHT = 44;

export function TVModeScreen() {
  const { data: channelIndex, isLoading, error, refetch } = useIPTVChannels();
  const {
    selectedCountry, setCountry,
    selectedLanguage, setLanguage,
    uiLanguage, setUiLanguage,
    sidebarVisible, toggleSidebar,
    viewMode, setViewMode,
    guideFilter, setGuideFilter,
  } = useFilterStore();
  const { data: countries } = useIPTVCountries();
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [channelOsd, setChannelOsd] = useState<string | null>(null);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  // Focus zones for D-pad: toolbar (mode+settings icons) > filters (popular/fav/all) > channels > star > controls
  const [focusZone, setFocusZone] = useState<'toolbar' | 'filters' | 'channels' | 'star' | 'controls'>('filters');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [controlFocusIdx, setControlFocusIdx] = useState(0);
  // toolbarFocusIdx is reused: in 'toolbar' zone it indexes mode/settings, in 'filters' zone it indexes filter pills
  const [toolbarFocusIdx, setToolbarFocusIdx] = useState(0);

  const [updateBanner, setUpdateBanner] = useState<string | null>(null);
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);

  // Multicam state
  const [multicamSlots, setMulticamSlots] = useState<(UnifiedChannel | null)[]>([null, null, null, null]);
  const [multicamFocusedSlot, setMulticamFocusedSlot] = useState(0);
  const [multicamPickerOpen, setMulticamPickerOpen] = useState(false);

  const [displayVersion, setDisplayVersion] = useState(APP_VERSION);

  // Check OTA version — show banner if just updated, and display correct version
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const { AppUpdater } = NativeModules;
    if (!AppUpdater?.getOtaBundleVersion) return;
    AppUpdater.getOtaBundleVersion().then((otaVer: string) => {
      if (otaVer) {
        setDisplayVersion(otaVer);
        if (otaVer !== APP_VERSION) {
          setUpdateBanner(`Actualizado a v${otaVer} ✓`);
          setTimeout(() => setUpdateBanner(null), 5000);
        }
      }
    }).catch(() => {});
  }, []);

  // Background update check — shows banner and auto-applies
  useEffect(() => {
    startBackgroundUpdateCheck(async (info) => {
      setUpdateInfo(info);
      setUpdateBanner(`v${info.version} disponible`);

      // Auto-apply update on Android
      if (Platform.OS === 'android' && (info.bundleUrl || info.downloadUrl)) {
        try {
          setIsAutoUpdating(true);
          if (info.isOta) {
            setUpdateBanner(`Actualizando a v${info.version}...`);
          } else {
            setUpdateBanner(`Descargando v${info.version}...`);
          }
          await applyUpdate(info);
          // If OTA, the app will restart. If APK, the installer opens.
          // We won't reach here for OTA since the process gets killed.
        } catch (err: any) {
          console.warn('[Updater] Auto-update failed:', err);
          setUpdateBanner(`Update v${info.version} falló`);
          setIsAutoUpdating(false);
          // Clear error banner after 10s
          setTimeout(() => setUpdateBanner(null), 10000);
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
  }, [selectedCountry, guideFilter]);

  const filteredChannels = useMemo(() => {
    let list = allChannels.list;
    if (guideFilter === 'favorites') {
      list = list.filter(ch => favoriteIds.has(ch.id));
    } else if (guideFilter === 'popular') {
      list = list.filter(ch => ch.isMainstream);
    }
    // 'all' = no filter
    return list;
  }, [allChannels, guideFilter, favoriteIds]);

  const totalCount = filteredChannels.length;
  const isTruncated = !showAllChannels && guideFilter === 'popular' && totalCount > MAX_VISIBLE;
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
      if (multicamPickerOpen) {
        setMulticamSlots(prev => {
          const next = [...prev];
          next[multicamFocusedSlot] = channel;
          return next;
        });
        setMulticamPickerOpen(false);
        return;
      }
      play(channel, channels, index);
    },
    [channels, play, multicamPickerOpen, multicamFocusedSlot],
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

  // Guide filter pills
  const GUIDE_FILTERS: GuideFilter[] = ['popular', 'favorites', 'all'];
  const GUIDE_FILTER_LABELS: Record<GuideFilter, string> = {
    popular: t(uiLanguage, 'modePopular'),
    favorites: t(uiLanguage, 'modeFavorites'),
    all: t(uiLanguage, 'modeAll'),
  };
  const VIEW_MODE_LABELS: Record<ViewMode, string> = {
    guide: t(uiLanguage, 'modeGuide'),
    tv: t(uiLanguage, 'modeTV'),
    multicam: t(uiLanguage, 'modeMulticam'),
  };
  const VIEW_MODES: ViewMode[] = ['guide', 'tv', 'multicam'];
  // Filter bar indices: 0..2 = guide filters (Popular, Favoritos, Todos)
  const FILTER_COUNT = GUIDE_FILTERS.length;
  // Toolbar indices: 0 = mode picker, 1 = settings
  const MODE_PICKER_IDX = 0;
  const SETTINGS_IDX = 1;
  const TOOLBAR_MAX = SETTINGS_IDX;

  // Mode picker overlay state
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [modePickerIdx, setModePickerIdx] = useState(VIEW_MODES.indexOf(viewMode));

  // TV remote handlers — use refs so useTVRemote never re-attaches
  const stateRef = useRef({
    focusZone, highlightedIdx, controlFocusIdx, toolbarFocusIdx,
    channels, sidebarVisible, settingsOpen, viewMode, guideFilter,
    multicamFocusedSlot, multicamPickerOpen,
    modePickerOpen, modePickerIdx,
  });
  stateRef.current = {
    focusZone, highlightedIdx, controlFocusIdx, toolbarFocusIdx,
    channels, sidebarVisible, settingsOpen, viewMode, guideFilter,
    multicamFocusedSlot, multicamPickerOpen,
    modePickerOpen, modePickerIdx,
  };

  const actionsRef = useRef({
    channelUp, channelDown, play, togglePlay, toggleMute, toggleSidebar,
    toggleFavorite, controlActions,
    setViewMode, setGuideFilter, setMulticamFocusedSlot, setMulticamPickerOpen,
    handleChannelSelect, setMulticamSlots, setModePickerOpen, setModePickerIdx,
  });
  actionsRef.current = {
    channelUp, channelDown, play, togglePlay, toggleMute, toggleSidebar,
    toggleFavorite, controlActions,
    setViewMode, setGuideFilter, setMulticamFocusedSlot, setMulticamPickerOpen,
    handleChannelSelect, setMulticamSlots, setModePickerOpen, setModePickerIdx,
  };

  const remoteHandlers = useMemo(
    () => ({
      onDown: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        if (s.modePickerOpen) return; // horizontal mode picker — no vertical nav
        // Multicam with sidebar open — navigate sidebar
        if (s.multicamPickerOpen) {
          if (s.focusZone === 'filters') {
            setFocusZone('channels');
            if (s.channels.length > 0) setHighlightedIdx(0);
          } else if (s.focusZone === 'channels' && s.channels.length > 0) {
            setHighlightedIdx(prev => prev < 0 ? 0 : Math.min(prev + 1, s.channels.length - 1));
          }
          return;
        }
        if (s.viewMode === 'multicam') {
          if (s.multicamFocusedSlot < 2) actionsRef.current.setMulticamFocusedSlot(s.multicamFocusedSlot + 2);
          return;
        }
        if (s.viewMode === 'tv') {
          actionsRef.current.channelDown();
          return;
        }
        // Guide mode
        if (s.focusZone === 'toolbar') {
          setFocusZone('filters');
          setToolbarFocusIdx(0);
        } else if (s.focusZone === 'filters') {
          setFocusZone('channels');
          if (s.channels.length > 0) setHighlightedIdx(0);
        } else if (s.focusZone === 'channels') {
          if (s.channels.length > 0) {
            setHighlightedIdx(prev => prev < 0 ? 0 : Math.min(prev + 1, s.channels.length - 1));
          }
        } else if (s.focusZone === 'controls' || s.focusZone === 'star') {
          setFocusZone('channels');
        }
      },
      onUp: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        if (s.modePickerOpen) return; // horizontal mode picker — no vertical nav
        // Multicam with sidebar open — navigate sidebar
        if (s.multicamPickerOpen) {
          if (s.focusZone === 'channels') {
            if (s.highlightedIdx <= 0) {
              setFocusZone('filters');
              setHighlightedIdx(-1);
            } else {
              setHighlightedIdx(prev => prev - 1);
            }
          }
          return;
        }
        if (s.viewMode === 'multicam') {
          if (s.multicamFocusedSlot >= 2) actionsRef.current.setMulticamFocusedSlot(s.multicamFocusedSlot - 2);
          return;
        }
        if (s.viewMode === 'tv') {
          actionsRef.current.channelUp();
          return;
        }
        // Guide mode
        if (s.focusZone === 'toolbar') {
          setSettingsOpen(true);
        } else if (s.focusZone === 'filters') {
          setFocusZone('toolbar');
          setToolbarFocusIdx(0);
        } else if (s.focusZone === 'channels') {
          if (s.highlightedIdx <= 0) {
            setFocusZone('filters');
            setHighlightedIdx(-1);
          } else {
            setHighlightedIdx(prev => prev - 1);
          }
        } else if (s.focusZone === 'controls' || s.focusZone === 'star') {
          setFocusZone('channels');
        }
      },
      onRight: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        // Mode picker — horizontal navigation
        if (s.modePickerOpen) {
          actionsRef.current.setModePickerIdx((prev: number) => Math.min(prev + 1, VIEW_MODES.length - 1));
          return;
        }
        // Multicam with sidebar — navigate filters
        if (s.multicamPickerOpen) {
          if (s.focusZone === 'filters') {
            setToolbarFocusIdx(prev => Math.min(prev + 1, FILTER_COUNT - 1));
          }
          return;
        }
        if (s.viewMode === 'multicam') {
          if (s.multicamFocusedSlot % 2 === 0) actionsRef.current.setMulticamFocusedSlot(s.multicamFocusedSlot + 1);
          return;
        }
        if (s.viewMode === 'tv') return;
        // Guide mode
        if (s.focusZone === 'toolbar') {
          setToolbarFocusIdx(prev => Math.min(prev + 1, TOOLBAR_MAX));
        } else if (s.focusZone === 'filters') {
          setToolbarFocusIdx(prev => Math.min(prev + 1, FILTER_COUNT - 1));
        } else if (s.focusZone === 'channels') {
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
        // Mode picker — horizontal navigation
        if (s.modePickerOpen) {
          actionsRef.current.setModePickerIdx((prev: number) => Math.max(prev - 1, 0));
          return;
        }
        // Multicam with sidebar — navigate filters
        if (s.multicamPickerOpen) {
          if (s.focusZone === 'filters') {
            setToolbarFocusIdx(prev => Math.max(prev - 1, 0));
          }
          return;
        }
        if (s.viewMode === 'multicam') {
          if (s.multicamFocusedSlot % 2 === 1) actionsRef.current.setMulticamFocusedSlot(s.multicamFocusedSlot - 1);
          return;
        }
        if (s.viewMode === 'tv') return;
        // Guide mode
        if (s.focusZone === 'toolbar') {
          setToolbarFocusIdx(prev => Math.max(prev - 1, 0));
        } else if (s.focusZone === 'filters') {
          setToolbarFocusIdx(prev => Math.max(prev - 1, 0));
        } else if (s.focusZone === 'controls') {
          if (s.controlFocusIdx > 0) {
            setControlFocusIdx(prev => prev - 1);
          } else {
            setFocusZone('star');
          }
        } else if (s.focusZone === 'star') {
          setFocusZone('channels');
        }
      },
      onSelect: () => {
        const s = stateRef.current;
        if (s.settingsOpen) return;
        const a = actionsRef.current;
        // Mode picker — select a mode
        if (s.modePickerOpen) {
          a.setViewMode(VIEW_MODES[s.modePickerIdx]);
          a.setModePickerOpen(false);
          if (VIEW_MODES[s.modePickerIdx] === 'guide') {
            setFocusZone('filters');
            setToolbarFocusIdx(0);
          }
          return;
        }
        // Multicam sidebar — select channel for slot or change filter
        if (s.multicamPickerOpen) {
          if (s.focusZone === 'filters') {
            a.setGuideFilter(GUIDE_FILTERS[s.toolbarFocusIdx]);
          } else if (s.focusZone === 'channels' && s.highlightedIdx >= 0 && s.highlightedIdx < s.channels.length) {
            const ch = s.channels[s.highlightedIdx];
            a.setMulticamSlots((prev: (UnifiedChannel | null)[]) => {
              const next = [...prev];
              next[s.multicamFocusedSlot] = ch;
              return next;
            });
            a.setMulticamPickerOpen(false);
          }
          return;
        }
        // Multicam fullscreen — Select on a slot opens the sidebar
        if (s.viewMode === 'multicam') {
          a.setMulticamPickerOpen(true);
          setFocusZone('filters');
          setToolbarFocusIdx(0);
          return;
        }
        // Toolbar: mode picker icon or settings
        if (s.focusZone === 'toolbar') {
          if (s.toolbarFocusIdx === MODE_PICKER_IDX) {
            a.setModePickerIdx(VIEW_MODES.indexOf(s.viewMode as ViewMode));
            a.setModePickerOpen(true);
          } else if (s.toolbarFocusIdx === SETTINGS_IDX) {
            setSettingsOpen(true);
          }
        } else if (s.focusZone === 'filters') {
          // Select a guide filter
          a.setGuideFilter(GUIDE_FILTERS[s.toolbarFocusIdx]);
        } else if (s.focusZone === 'channels' && s.highlightedIdx >= 0 && s.highlightedIdx < s.channels.length) {
          if (Platform.OS === 'web') {
            a.play(s.channels[s.highlightedIdx], s.channels, s.highlightedIdx);
          }
        } else if (s.focusZone === 'star' && s.highlightedIdx >= 0 && s.highlightedIdx < s.channels.length) {
          if (Platform.OS === 'web') {
            a.toggleFavorite(s.channels[s.highlightedIdx]);
          }
        } else if (s.focusZone === 'controls') {
          a.controlActions[s.controlFocusIdx]?.action();
        }
      },
      onMenu: () => {
        const s = stateRef.current;
        if (s.modePickerOpen) { actionsRef.current.setModePickerOpen(false); return; }
        if (s.multicamPickerOpen) { actionsRef.current.setMulticamPickerOpen(false); return; }
        if (s.settingsOpen) return;
        if (s.viewMode === 'multicam' || s.viewMode === 'tv') {
          actionsRef.current.setViewMode('guide');
          setFocusZone('filters');
          setToolbarFocusIdx(0);
        }
      },
      onBack: () => {
        const s = stateRef.current;
        if (s.modePickerOpen) { actionsRef.current.setModePickerOpen(false); return true; }
        if (s.multicamPickerOpen) { actionsRef.current.setMulticamPickerOpen(false); return true; }
        if (s.settingsOpen) return true; // modal handles its own back
        if (s.viewMode === 'multicam' || s.viewMode === 'tv') {
          actionsRef.current.setViewMode('guide');
          setFocusZone('filters');
          setToolbarFocusIdx(0);
          return true;
        }
        return false;
      },
      onPlayPause: () => actionsRef.current.togglePlay(),
    }),
    [], // stable — reads from refs
  );

  useTVRemote(remoteHandlers);

  // Scroll highlighted channel into view
  useEffect(() => {
    if (highlightedIdx >= 0 && channels.length > 0) {
      const idx = Math.min(highlightedIdx, channels.length - 1);
      // Try FlatList first, fallback to ScrollView
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.3,
        });
      } else if (scrollViewRef.current) {
        const offset = Math.max(0, idx * ITEM_HEIGHT - windowHeight * 0.3);
        scrollViewRef.current.scrollTo({ y: offset, animated: true });
      }
    }
  }, [highlightedIdx, channels.length, windowHeight]);

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
      {(sidebarVisible || multicamPickerOpen) && (
        <View style={[styles.sidebar, { height: windowHeight }]} collapsable={false}>
          {/* Toolbar: Logo + Mode picker + Settings gear */}
          <View style={styles.toolbar}>
            <Text style={styles.logo}>Teve<Text style={styles.logoPlus}>+</Text></Text>
            <View style={styles.toolbarSpacer} />

            {/* Mode picker button */}
            <Pressable
              onPress={() => { setModePickerIdx(VIEW_MODES.indexOf(viewMode)); setModePickerOpen(true); }}
              style={({ pressed }) => [
                styles.toolbarBtn,
                pressed && styles.toolbarBtnPressed,
                focusZone === 'toolbar' && toolbarFocusIdx === MODE_PICKER_IDX && styles.toolbarItemFocused,
              ]}
            >
              <LayoutIcon size={24} color={colors.textSecondary} />
            </Pressable>

            {/* Settings button */}
            <Pressable
              onPress={() => setSettingsOpen(true)}
              style={({ pressed }) => [
                styles.toolbarBtn,
                pressed && styles.toolbarBtnPressed,
                focusZone === 'toolbar' && toolbarFocusIdx === SETTINGS_IDX && styles.toolbarItemFocused,
              ]}
            >
              <GearIcon size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Guide filter pills: Popular / Favoritos / Todos */}
          <View style={styles.modeSelector}>
            {GUIDE_FILTERS.map((filter, idx) => (
              <Pressable
                key={filter}
                onPress={() => setGuideFilter(filter)}
                style={[
                  styles.modeItem,
                  guideFilter === filter && styles.modeItemActive,
                  focusZone === 'filters' && toolbarFocusIdx === idx && styles.modeItemFocused,
                ]}
              >
                <Text style={[styles.modeItemText, guideFilter === filter && styles.modeItemTextActive]}>
                  {GUIDE_FILTER_LABELS[filter]}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Channel list header */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {t(uiLanguage, 'channels')}
            </Text>
            <Text style={styles.listCount}>
              {isTruncated ? `${MAX_VISIBLE}/${totalCount}` : totalCount}
            </Text>
          </View>

          {/* Channel list */}
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
          ) : Platform.OS === 'web' ? (
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
          ) : (
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {channels.map((item, index) => (
              <ChannelItemConnected
                key={item.id}
                channel={item}
                index={index}
                channelNumberMap={channelNumberMap}
                currentChannelId={currentChannel?.id ?? null}
                focusZone={focusZone}
                highlightedIdx={highlightedIdx}
                favoriteIds={favoriteIds}
                handlersRef={handlersRef}
              />
            ))}
            {isTruncated && (
              <Pressable
                onPress={() => setShowAllChannels(true)}
                style={({ pressed }) => [styles.showAllBtn, pressed && styles.showAllBtnPressed]}
              >
                <Text style={styles.showAllBtnText}>
                  {t(uiLanguage, 'showAll')} ({totalCount})
                </Text>
              </Pressable>
            )}
          </ScrollView>
          )}
        </View>
      )}

      {/* Player section — flex:1 fills remaining space */}
      <View style={[styles.playerSection, sidebarVisible && styles.playerWithSidebar]}>
        {viewMode === 'multicam' ? (
          <>
            <MulticamPlayer
              slots={multicamSlots}
              focusedSlot={multicamFocusedSlot}
              onSlotPress={(idx) => {
                setMulticamFocusedSlot(idx);
                if (Platform.OS === 'web') {
                  setMulticamPickerOpen(true);
                  setFocusZone('filters');
                  setToolbarFocusIdx(0);
                }
              }}
            />
          </>
        ) : currentChannel ? (
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

          </>
        ) : (
          <View style={styles.noChannel}>
            <Text style={styles.noChannelText}>{t(uiLanguage, 'selectChannel')}</Text>
          </View>
        )}
      </View>

      {/* Mode picker overlay — horizontal with icons */}
      {modePickerOpen && (
        <View style={styles.modePickerOverlay}>
          <View style={styles.modePickerContent}>
            {VIEW_MODES.map((mode, idx) => {
              const isFocused = modePickerIdx === idx;
              const isActive = viewMode === mode;
              const iconColor = isActive ? colors.accent : isFocused ? colors.textPrimary : colors.textMuted;
              const ModeIcon = mode === 'guide' ? GuideIcon : mode === 'tv' ? TVIcon : GridIcon;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setViewMode(mode);
                    setModePickerOpen(false);
                    if (mode === 'guide') {
                      setFocusZone('filters');
                      setToolbarFocusIdx(0);
                    }
                  }}
                  style={[
                    styles.modePickerItem,
                    isActive && styles.modePickerItemActive,
                    isFocused && styles.modePickerItemFocused,
                  ]}
                >
                  <ModeIcon size={28} color={iconColor} />
                  <Text style={[
                    styles.modePickerItemText,
                    isActive && styles.modePickerItemTextActive,
                    isFocused && styles.modePickerItemTextFocused,
                  ]}>
                    {VIEW_MODE_LABELS[mode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <SettingsModal
          uiLanguage={uiLanguage}
          setUiLanguage={setUiLanguage}
          updateInfo={updateInfo}
          setUpdateInfo={setUpdateInfo}
          onClose={() => setSettingsOpen(false)}
          displayVersion={displayVersion}
          selectedCountry={selectedCountry}
          setCountry={setCountry}
          countryOptions={countryOptions}
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

  // Sidebar — fixed width
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

  // Mode selector — compact segmented control
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden' as const,
  },
  modeItem: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modeItemActive: {
    backgroundColor: colors.accent,
  },
  modeItemText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  modeItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  modeItemFocused: {
    borderWidth: 2,
    borderColor: colors.focusBorder,
  },

  // Multicam channel picker overlay
  multicamPicker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    backgroundColor: 'rgba(18,18,22,0.95)',
    zIndex: 10,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceHighlight,
  } as any,
  multicamPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceHighlight,
  },
  multicamPickerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  multicamPickerClose: {
    color: colors.textMuted,
    fontSize: 18,
    padding: 4,
  },
  multicamPickerList: {
    flex: 1,
  },
  multicamPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: ITEM_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceLight,
  },
  multicamPickerItemFocused: {
    backgroundColor: colors.surfaceLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.focusBorder,
  },
  multicamPickerItemActive: {
    backgroundColor: colors.surfaceHighlight,
  },
  multicamPickerItemNum: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  multicamPickerItemName: {
    color: colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },

  // Mode picker overlay — horizontal centered
  modePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 90,
  } as any,
  modePickerContent: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceHighlight,
  },
  modePickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    gap: 8,
    minWidth: 90,
  } as any,
  modePickerItemActive: {
    backgroundColor: colors.surfaceHighlight,
  },
  modePickerItemFocused: {
    borderColor: colors.focusBorder,
    backgroundColor: colors.surfaceLight,
  },
  modePickerItemText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  modePickerItemTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  modePickerItemTextFocused: {
    color: colors.textPrimary,
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

  // Settings — fullscreen overlay panel
  settingsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  } as any,
  modalContent: {
    backgroundColor: colors.surface,
    width: 340,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: colors.surfaceHighlight,
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
