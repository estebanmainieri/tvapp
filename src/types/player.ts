import { UnifiedChannel } from './channel';

export interface PlayerState {
  isPlaying: boolean;
  currentChannel: UnifiedChannel | null;
  channelList: UnifiedChannel[];
  channelIndex: number;
  showControls: boolean;
  showChannelOverlay: boolean;
  error: string | null;
  isBuffering: boolean;
}

export interface PlayerActions {
  play: (
    channel: UnifiedChannel,
    list: UnifiedChannel[],
    index: number,
  ) => void;
  channelUp: () => void;
  channelDown: () => void;
  toggleControls: () => void;
  toggleChannelOverlay: () => void;
  setError: (error: string | null) => void;
  setBuffering: (buffering: boolean) => void;
  togglePlay: () => void;
  reload: () => void;
  stop: () => void;
}
