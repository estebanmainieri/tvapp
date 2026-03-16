import { ViewStyle } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';

export const focusStyles = {
  focused: {
    borderColor: colors.focusBorder,
    borderWidth: spacing.focusBorderWidth,
    transform: [{ scale: spacing.focusScale }],
  } as ViewStyle,

  unfocused: {
    borderColor: 'transparent',
    borderWidth: spacing.focusBorderWidth,
    transform: [{ scale: 1 }],
  } as ViewStyle,

  cardBase: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    backgroundColor: colors.surface,
  } as ViewStyle,
} as const;
