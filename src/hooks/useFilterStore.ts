import { create } from 'zustand';
import { getSettings, updateSettings } from '../data/settings';
import { getDefaultLangForCountry } from '../i18n/translations';

export type ViewMode = 'all' | 'popular' | 'favorites' | 'tv' | 'multicam';

interface FilterState {
  selectedCountry: string; // country code or 'all'
  selectedLanguage: string; // language code or 'all'
  uiLanguage: string;
  showFavoritesOnly: boolean;
  showMainstreamOnly: boolean;
  sidebarVisible: boolean;
  viewMode: ViewMode;
  initialized: boolean;
}

interface FilterActions {
  setCountry: (code: string) => void;
  setLanguage: (code: string) => void;
  setUiLanguage: (code: string) => void;
  toggleFavoritesOnly: () => void;
  toggleMainstreamOnly: () => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  initialize: (detectedCountry: string) => void;
}

type FilterStore = FilterState & FilterActions;

export const useFilterStore = create<FilterStore>((set, get) => ({
  selectedCountry: 'US',
  selectedLanguage: 'all',
  uiLanguage: 'en',
  showFavoritesOnly: false,
  showMainstreamOnly: false,
  sidebarVisible: true,
  viewMode: 'popular' as ViewMode,
  initialized: false,

  setCountry: (code: string) => {
    set({ selectedCountry: code });
    updateSettings({ preferredCountry: code });
  },

  setLanguage: (code: string) => {
    set({ selectedLanguage: code });
    updateSettings({ preferredLanguage: code });
  },

  setUiLanguage: (code: string) => {
    set({ uiLanguage: code });
    updateSettings({ uiLanguage: code });
  },

  toggleFavoritesOnly: () => {
    const next = !get().showFavoritesOnly;
    set({ showFavoritesOnly: next });
    updateSettings({ showFavoritesOnly: next });
  },

  toggleMainstreamOnly: () => {
    const next = !get().showMainstreamOnly;
    set({ showMainstreamOnly: next });
    updateSettings({ showMainstreamOnly: next });
  },

  toggleSidebar: () => {
    const next = !get().sidebarVisible;
    set({ sidebarVisible: next });
    updateSettings({ sidebarVisible: next });
  },

  setSidebarVisible: (visible: boolean) => {
    set({ sidebarVisible: visible });
    updateSettings({ sidebarVisible: visible });
  },

  setViewMode: (mode: ViewMode) => {
    // Derive filter flags from view mode
    const showFavoritesOnly = mode === 'favorites';
    const showMainstreamOnly = mode === 'popular';
    const sidebarVisible = mode !== 'tv' && mode !== 'multicam';
    set({ viewMode: mode, showFavoritesOnly, showMainstreamOnly, sidebarVisible });
    updateSettings({ viewMode: mode, showFavoritesOnly, showMainstreamOnly, sidebarVisible });
  },

  initialize: (detectedCountry: string) => {
    getSettings()
      .then(settings => {
        const country = settings.preferredCountry || detectedCountry || 'US';
        const viewMode = (settings.viewMode as ViewMode) ?? 'popular';
        set({
          selectedCountry: country,
          selectedLanguage: settings.preferredLanguage ?? 'all',
          uiLanguage: settings.uiLanguage ?? getDefaultLangForCountry(country),
          showFavoritesOnly: settings.showFavoritesOnly ?? false,
          showMainstreamOnly: settings.showMainstreamOnly ?? true,
          sidebarVisible: settings.sidebarVisible ?? true,
          viewMode,
          initialized: true,
        });
      })
      .catch(() => {
        set({ selectedCountry: detectedCountry || 'US', initialized: true });
      });
  },
}));
