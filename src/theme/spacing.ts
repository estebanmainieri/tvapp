import { Platform } from 'react-native';

const isTV = Platform.isTV;

export const spacing = {
  xs: isTV ? 8 : 4,
  sm: isTV ? 12 : 8,
  md: isTV ? 20 : 12,
  lg: isTV ? 32 : 20,
  xl: isTV ? 48 : 32,
  xxl: isTV ? 64 : 48,

  // Screen padding
  screenHorizontal: isTV ? 48 : 16,
  screenVertical: isTV ? 32 : 12,

  // Card dimensions
  cardWidth: isTV ? 220 : 160,
  cardHeight: isTV ? 140 : 100,
  cardGap: isTV ? 16 : 10,

  // Hero card
  heroWidth: isTV ? 500 : 340,
  heroHeight: isTV ? 280 : 180,

  // Country card
  countryCardWidth: isTV ? 160 : 120,
  countryCardHeight: isTV ? 100 : 80,

  // Focus
  focusBorderWidth: isTV ? 3 : 2,
  focusScale: 1.08,
} as const;
