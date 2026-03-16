import { create } from 'zustand';
import { getSettings, updateSettings } from '../data/settings';
import { getDefaultLangForCountry } from '../i18n/translations';

interface FilterState {
  selectedCountry: string; // country code or 'all'
  selectedLanguage: string; // language code or 'all'
  uiLanguage: string;
  showFavoritesOnly: boolean;
  showMainstreamOnly: boolean;
  sidebarVisible: boolean;
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

  initialize: (detectedCountry: string) => {
    getSettings().then(settings => {
      const country = settings.preferredCountry || detectedCountry || 'US';
      set({
        selectedCountry: country,
        selectedLanguage: settings.preferredLanguage ?? 'all',
        uiLanguage: settings.uiLanguage ?? getDefaultLangForCountry(country),
        showFavoritesOnly: settings.showFavoritesOnly ?? false,
        showMainstreamOnly: settings.showMainstreamOnly ?? false,
        sidebarVisible: settings.sidebarVisible ?? true,
        initialized: true,
      });
    });
  },
}));
