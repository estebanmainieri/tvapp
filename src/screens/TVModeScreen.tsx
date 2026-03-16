import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Platform, Modal } from 'react-native';
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
  const scrollRef = useRef<ScrollView>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [channelOsd, setChannelOsd] = useState<string | null>(null);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

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
    // Assign stable number per country list
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

  const handleChannelSelect = useCallback(
    (channel: UnifiedChannel, index: number) => {
      play(channel, channels, index);
    },
    [channels, play],
  );

  // TV remote handlers
  const remoteHandlers = useMemo(
    () => ({
      onUp: () => channelUp(),
      onDown: () => channelDown(),
      onSelect: () => {},
    }),
    [channelUp, channelDown],
  );

  useTVRemote(remoteHandlers);

  // Scroll active channel into view
  useEffect(() => {
    if (currentIdx >= 0 && scrollRef.current) {
      const itemHeight = 44;
      scrollRef.current.scrollTo({ y: Math.max(0, currentIdx * itemHeight - 150), animated: true });
    }
  }, [currentIdx]);

  // OSD channel indicator for fullscreen zapping
  const showOsd = useCallback((text: string) => {
    setChannelOsd(text);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => setChannelOsd(null), 2000);
  }, []);

  // Show OSD when channel changes in fullscreen
  const prevChannelRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentChannel) return;
    const prevId = prevChannelRef.current;
    prevChannelRef.current = currentChannel.id;
    // Only show OSD if channel actually changed (not on first mount)
    if (prevId && prevId !== currentChannel.id && !sidebarVisible) {
      const num = channelNumberMap.get(currentChannel.id) ?? '';
      showOsd(`${num}  ${currentChannel.name}`);
    }
  }, [currentChannel, sidebarVisible, showOsd]);

  // Country options — all countries, no "All" option
  const countryOptions = useMemo(() => {
    if (!countries) return [];
    return [...countries]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({
        value: c.code,
        label: `${c.flag} ${c.name}`,
      }));
  }, [countries]);

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
            <View style={styles.countryPickerWrap}>
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
              ]}
            >
              <GearIcon size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Filter tags row */}
          <View style={styles.filterRow}>
            {/* Favorites toggle */}
            <Pressable
              onPress={toggleFavoritesOnly}
              style={[styles.filterTag, showFavoritesOnly && styles.filterTagActive]}
            >
              <Text style={[styles.filterTagText, showFavoritesOnly && styles.filterTagTextActive]}>
                {'\u2605'} {t(uiLanguage, 'favorites')}
              </Text>
            </Pressable>

            {/* Popular toggle */}
            <Pressable
              onPress={toggleMainstreamOnly}
              style={[styles.filterTag, showMainstreamOnly && styles.filterTagActive]}
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

          {/* Channel list */}
          <ScrollView ref={scrollRef} style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {channels.map((ch, idx) => {
              const isActive = currentChannel?.id === ch.id;
              return (
                <Pressable
                  key={ch.id}
                  onPress={() => handleChannelSelect(ch, idx)}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.listItem,
                    isActive && styles.listItemActive,
                    pressed && styles.listItemPressed,
                  ]}
                >
                  <Text style={[styles.itemNumber, isActive && styles.itemTextActive]}>
                    {channelNumberMap.get(ch.id) ?? ''}
                  </Text>
                  {ch.logo && (
                    <Image source={{ uri: ch.logo }} style={styles.itemLogo} resizeMode="contain" />
                  )}
                  <Text
                    style={[styles.itemName, isActive && styles.itemTextActive]}
                    numberOfLines={1}
                  >
                    {ch.name || 'Unknown'}
                  </Text>
                  <Pressable
                    onPress={() => toggleFavorite(ch)}
                    style={styles.itemStar}
                    hitSlop={8}
                  >
                    <Text style={[styles.itemStarIcon, isFavorite(ch.id) && styles.itemStarActive]}>
                      {isFavorite(ch.id) ? '\u2605' : '\u2606'}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Player section */}
      <View style={styles.playerSection}>
        {currentChannel ? (
          <>
            <VideoPlayer />

            {/* Controls bar — always visible when sidebar is open */}
            {sidebarVisible && (
              <View style={styles.controlBarWrap}>
                <View style={styles.overlayGradient} />
                <View style={styles.controlBar}>
                  <View style={styles.controlBarLeft}>
                    <Pressable
                      onPress={() => channelDown()}
                      style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                    >
                      <SkipPrevIcon size={18} color="#fff" />
                    </Pressable>

                    <Pressable
                      onPress={togglePlay}
                      style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                    >
                      {isPlaying ? <PauseIcon size={22} color="#fff" /> : <PlayIcon size={22} color="#fff" />}
                    </Pressable>

                    <Pressable
                      onPress={() => channelUp()}
                      style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                    >
                      <SkipNextIcon size={18} color="#fff" />
                    </Pressable>

                    <Pressable
                      onPress={toggleMute}
                      style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                    >
                      {isMuted ? <VolumeMuteIcon size={20} color="#fff" /> : <VolumeOnIcon size={20} color="#fff" />}
                    </Pressable>

                    <Text style={styles.controlBarTitle} numberOfLines={1}>
                      {channelNumberMap.get(currentChannel.id) ?? ''}. {currentChannel.name}
                    </Text>
                  </View>

                  {isBuffering && (
                    <Text style={styles.controlBarStatus}>Buffering...</Text>
                  )}
                  {playerError && (
                    <Text style={styles.controlBarError}>{playerError}</Text>
                  )}

                  <View style={styles.controlBarRight}>
                    <Pressable
                      onPress={reload}
                      style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                    >
                      <ReloadIcon size={18} color="#fff" />
                    </Pressable>

                    <Pressable
                      onPress={toggleSidebar}
                      style={({ pressed }) => [styles.ctrlBtn, pressed && styles.ctrlBtnPressed]}
                    >
                      <FullscreenIcon size={20} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* Fullscreen: OSD channel number (zapping style) */}
            {!sidebarVisible && channelOsd && (
              <View style={styles.osd}>
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

  // Sidebar
  sidebar: {
    width: 280,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.surfaceHighlight,
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
  toolbarIcon: {
    fontSize: 24,
    color: colors.textSecondary,
    lineHeight: 24,
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

  // Settings (kept for pickerFallback)
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
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surfaceLight,
  },
  listItemActive: {
    backgroundColor: colors.surfaceHighlight,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  listItemPressed: {
    backgroundColor: colors.surfaceLight,
  },
  itemNumber: {
    ...typography.caption,
    color: colors.textMuted,
    width: 26,
    textAlign: 'right',
    marginRight: spacing.xs,
    fontSize: 11,
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
  },
  itemStarIcon: {
    fontSize: 13,
    color: colors.textMuted,
  },
  itemStarActive: {
    color: colors.focusBorder,
  },

  // Player
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

  // Control bar — fixed at bottom when sidebar visible
  controlBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  } as any,
  overlayGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
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
    borderRadius: 4,
  },
  ctrlBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.15)',
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
