import { Platform } from 'react-native';

const isTV = Platform.isTV;

export const typography = {
  // Font sizes - larger for TV / elderly users
  hero: {
    fontSize: isTV ? 36 : 24,
    fontWeight: '700' as const,
    lineHeight: isTV ? 44 : 32,
  },
  title: {
    fontSize: isTV ? 28 : 20,
    fontWeight: '700' as const,
    lineHeight: isTV ? 36 : 28,
  },
  subtitle: {
    fontSize: isTV ? 22 : 16,
    fontWeight: '600' as const,
    lineHeight: isTV ? 28 : 22,
  },
  body: {
    fontSize: isTV ? 20 : 14,
    fontWeight: '400' as const,
    lineHeight: isTV ? 26 : 20,
  },
  caption: {
    fontSize: isTV ? 16 : 12,
    fontWeight: '400' as const,
    lineHeight: isTV ? 22 : 16,
  },
  badge: {
    fontSize: isTV ? 14 : 10,
    fontWeight: '700' as const,
    lineHeight: isTV ? 18 : 14,
  },
} as const;
