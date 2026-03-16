import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  Animated,
  ViewStyle,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { colors, spacing } from '../../theme';

interface FocusableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: ViewStyle;
  width?: number;
  height?: number;
  hasTVPreferredFocus?: boolean;
}

export function FocusableCard({
  children,
  onPress,
  onLongPress,
  onFocus,
  onBlur,
  style,
  width = spacing.cardWidth,
  height = spacing.cardHeight,
  hasTVPreferredFocus,
}: FocusableCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: spacing.focusScale,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
    onFocus?.();
  }, [scaleAnim, borderAnim, onFocus]);

  const handleBlur = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
    onBlur?.();
  }, [scaleAnim, borderAnim, onBlur]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', colors.focusBorder],
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // @ts-ignore - react-native-tvos prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View
        style={[
          styles.card,
          {
            width,
            height,
            transform: [{ scale: scaleAnim }],
            borderColor,
            borderWidth: spacing.focusBorderWidth,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});
