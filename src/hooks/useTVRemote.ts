import { useEffect, useCallback, useRef } from 'react';
import { Platform, BackHandler } from 'react-native';

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
  onBack?: () => boolean; // return true to prevent app close
  onPlayPause?: () => void;
}

// Use ref to avoid re-attaching listeners on every handler change
function useWebKeyboardNav(handlers: TVRemoteHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          h.onUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          h.onDown?.();
          break;
        case 'ArrowLeft':
          h.onLeft?.();
          break;
        case 'ArrowRight':
          h.onRight?.();
          break;
        case 'Enter':
          h.onSelect?.();
          break;
        case 'Escape':
          h.onMenu?.();
          break;
        case ' ':
          e.preventDefault();
          h.onPlayPause?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // attach once, read from ref
}

export function useTVRemote(handlers: TVRemoteHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleEvent = useCallback(
    (evt: { eventType: string }) => {
      const h = handlersRef.current;
      switch (evt.eventType) {
        case 'select': h.onSelect?.(); break;
        case 'longSelect': h.onLongSelect?.(); break;
        case 'up': h.onUp?.(); break;
        case 'down': h.onDown?.(); break;
        case 'left': h.onLeft?.(); break;
        case 'right': h.onRight?.(); break;
        case 'menu': h.onMenu?.(); break;
        case 'playPause': h.onPlayPause?.(); break;
      }
    },
    [],
  );

  // On TV platforms, use the native TV event handler
  if (Platform.isTV && useTVEventHandler) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTVEventHandler(handleEvent);
  }

  // Android back button → onBack or onMenu
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const h = handlersRef.current;
      if (h.onBack) {
        return h.onBack(); // true = handled, false = let app close
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  // On web, use keyboard navigation
  useWebKeyboardNav(handlers);
}
