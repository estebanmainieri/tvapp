import { create } from 'zustand';
import {
  ChannelSourceConfig,
  BUILT_IN_SOURCES,
  getSavedSources,
  saveSources,
  addCustomSource as addCustomSourceData,
  removeCustomSource as removeCustomSourceData,
} from '../data/channelSources';

interface SourceState {
  sources: ChannelSourceConfig[];
  initialized: boolean;
}

interface SourceActions {
  initialize: () => void;
  toggleSource: (id: string) => void;
  addCustomSource: (name: string, url: string) => void;
  removeCustomSource: (id: string) => void;
}

type SourceStore = SourceState & SourceActions;

export const useSourceStore = create<SourceStore>((set, get) => ({
  sources: BUILT_IN_SOURCES,
  initialized: false,

  initialize: () => {
    getSavedSources()
      .then(sources => set({ sources, initialized: true }))
      .catch(() => set({ sources: BUILT_IN_SOURCES, initialized: true }));
  },

  toggleSource: (id: string) => {
    const updated = get().sources.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    set({ sources: updated });
    saveSources(updated);
  },

  addCustomSource: (name: string, url: string) => {
    addCustomSourceData(name, url).then(sources => set({ sources }));
  },

  removeCustomSource: (id: string) => {
    removeCustomSourceData(id).then(sources => set({ sources }));
  },
}));
