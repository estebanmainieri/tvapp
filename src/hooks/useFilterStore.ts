import { create } from 'zustand';
import { getSettings, updateSettings } from '../data/settings';

interface FilterState {
  selectedCountry: string; // country code or 'all'
  selectedLanguage: string; // language code or 'all'
  initialized: boolean;
}

interface FilterActions {
  setCountry: (code: string) => void;
  setLanguage: (code: string) => void;
  initialize: (detectedCountry: string) => void;
}

type FilterStore = FilterState & FilterActions;

export const useFilterStore = create<FilterStore>((set) => ({
  selectedCountry: 'all',
  selectedLanguage: 'all',
  initialized: false,

  setCountry: (code: string) => {
    set({ selectedCountry: code });
    updateSettings({ preferredCountry: code });
  },

  setLanguage: (code: string) => {
    set({ selectedLanguage: code });
    updateSettings({ preferredLanguage: code });
  },

  initialize: (detectedCountry: string) => {
    getSettings().then(settings => {
      set({
        selectedCountry: settings.preferredCountry ?? detectedCountry,
        selectedLanguage: settings.preferredLanguage ?? 'all',
        initialized: true,
      });
    });
  },
}));
