import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

// useTVEventHandler only exists in react-native-tvos, not in react-native-web
let useTVEventHandler: ((callback: (evt: { eventType: string }) => void) => void) | undefined;
try {
  // @ts-ignore - only available on TV platforms
  useTVEventHandler = require('react-native').useTVEventHandler;
} catch {}

export type TVRemoteEvent =
  | 'select'
  | 'longSelect'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'menu'
  | 'playPause';

interface TVRemoteHandlers {
  onSelect?: () => void;
  onLongSelect?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onMenu?: () => void;
  onPlayPause?: () => void;
}

// Keyboard mapping for web: arrow keys + enter simulate TV remote
function useWebKeyboardNav(handlers: TVRemoteHandlers) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handlers.onUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlers.onDown?.();
          break;
        case 'ArrowLeft':
          handlers.onLeft?.();
          break;
        case 'ArrowRight':
          handlers.onRight?.();
          break;
        case 'Enter':
          handlers.onSelect?.();
          break;
        case 'Escape':
          handlers.onMenu?.();
          break;
        case ' ':
          e.preventDefault();
          handlers.onPlayPause?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

export function useTVRemote(handlers: TVRemoteHandlers) {
  const handleEvent = useCallback(
    (evt: { eventType: string }) => {
      switch (evt.eventType) {
        case 'select':
          handlers.onSelect?.();
          break;
        case 'longSelect':
          handlers.onLongSelect?.();
          break;
        case 'up':
          handlers.onUp?.();
          break;
        case 'down':
          handlers.onDown?.();
          break;
        case 'left':
          handlers.onLeft?.();
          break;
        case 'right':
          handlers.onRight?.();
          break;
        case 'menu':
          handlers.onMenu?.();
          break;
        case 'playPause':
          handlers.onPlayPause?.();
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handlers],
  );

  // On TV platforms, use the native TV event handler
  if (Platform.isTV && useTVEventHandler) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTVEventHandler(handleEvent);
  }

  // On web, use keyboard navigation
  useWebKeyboardNav(handlers);
}
