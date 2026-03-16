import { create } from 'zustand';
import { UnifiedChannel, PlayerState, PlayerActions } from '../types';

type PlayerStore = PlayerState & PlayerActions;

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // State
  isPlaying: false,
  currentChannel: null,
  channelList: [],
  channelIndex: 0,
  showControls: false,
  showChannelOverlay: false,
  error: null,
  isBuffering: false,

  // Actions
  play: (channel: UnifiedChannel, list: UnifiedChannel[], index: number) => {
    set({
      isPlaying: true,
      currentChannel: channel,
      channelList: list,
      channelIndex: index,
      showControls: true,
      showChannelOverlay: false,
      error: null,
      isBuffering: true,
    });
  },

  channelUp: () => {
    const { channelList, channelIndex } = get();
    if (channelList.length === 0) return;
    const nextIndex = (channelIndex + 1) % channelList.length;
    set({
      channelIndex: nextIndex,
      currentChannel: channelList[nextIndex],
      error: null,
      isBuffering: true,
      showControls: true,
    });
  },

  channelDown: () => {
    const { channelList, channelIndex } = get();
    if (channelList.length === 0) return;
    const prevIndex =
      channelIndex === 0 ? channelList.length - 1 : channelIndex - 1;
    set({
      channelIndex: prevIndex,
      currentChannel: channelList[prevIndex],
      error: null,
      isBuffering: true,
      showControls: true,
    });
  },

  toggleControls: () => {
    set(state => ({ showControls: !state.showControls }));
  },

  toggleChannelOverlay: () => {
    set(state => ({
      showChannelOverlay: !state.showChannelOverlay,
      showControls: false,
    }));
  },

  setError: (error: string | null) => {
    set({ error, isBuffering: false });
  },

  setBuffering: (isBuffering: boolean) => {
    set({ isBuffering });
  },

  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }));
  },

  reload: () => {
    const { currentChannel } = get();
    if (!currentChannel) return;
    // Force re-mount by toggling channel off and back on
    set({ currentChannel: null, isPlaying: false, isBuffering: true, error: null });
    setTimeout(() => {
      set({ currentChannel, isPlaying: true });
    }, 100);
  },

  stop: () => {
    set({
      isPlaying: false,
      currentChannel: null,
      channelList: [],
      channelIndex: 0,
      showControls: false,
      showChannelOverlay: false,
      error: null,
      isBuffering: false,
    });
  },
}));
