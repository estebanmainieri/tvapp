import { create } from 'zustand';
import { getSettings, updateSettings } from '../data/settings';
import { getDefaultLangForCountry } from '../i18n/translations';

export type ViewMode = 'guide' | 'multicam';
export type GuideFilter = 'popular' | 'favorites' | 'all';

interface FilterState {
  selectedCountry: string; // country code or 'all'
  selectedLanguage: string; // language code or 'all'
  uiLanguage: string;
  sidebarVisible: boolean;
  viewMode: ViewMode;
  guideFilter: GuideFilter;
  initialized: boolean;
}

interface FilterActions {
  setCountry: (code: string) => void;
  setLanguage: (code: string) => void;
  setUiLanguage: (code: string) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setGuideFilter: (filter: GuideFilter) => void;
  initialize: (detectedCountry: string) => void;
}

type FilterStore = FilterState & FilterActions;

export const useFilterStore = create<FilterStore>((set, get) => ({
  selectedCountry: 'US',
  selectedLanguage: 'all',
  uiLanguage: 'en',
  sidebarVisible: true,
  viewMode: 'guide' as ViewMode,
  guideFilter: 'popular' as GuideFilter,
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
    const sidebarVisible = mode === 'guide';
    set({ viewMode: mode, sidebarVisible });
    updateSettings({ viewMode: mode, sidebarVisible });
  },

  setGuideFilter: (filter: GuideFilter) => {
    set({ guideFilter: filter });
    updateSettings({ guideFilter: filter });
  },

  initialize: (detectedCountry: string) => {
    getSettings()
      .then(settings => {
        const country = settings.preferredCountry || detectedCountry || 'US';
        const viewMode = (settings.viewMode as ViewMode) ?? 'guide';
        // Migrate old viewModes to new ones
        const validModes: ViewMode[] = ['guide', 'multicam'];
        const finalViewMode = validModes.includes(viewMode) ? viewMode : 'guide';
        const guideFilter = (settings.guideFilter as GuideFilter) ?? 'popular';
        set({
          selectedCountry: country,
          selectedLanguage: settings.preferredLanguage ?? 'all',
          uiLanguage: settings.uiLanguage ?? getDefaultLangForCountry(country),
          sidebarVisible: settings.sidebarVisible ?? true,
          viewMode: finalViewMode,
          guideFilter,
          initialized: true,
        });
      })
      .catch(() => {
        set({ selectedCountry: detectedCountry || 'US', initialized: true });
      });
  },
}));
