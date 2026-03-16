import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FocusableCard } from '../common/FocusableCard';
import { UnifiedChannel } from '../../types';
import { colors, spacing, typography } from '../../theme';

interface HeroCardProps {
  channel: UnifiedChannel;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

export function HeroCard({ channel, onPress, hasTVPreferredFocus }: HeroCardProps) {
  return (
    <View style={styles.container}>
      <FocusableCard
        onPress={onPress}
        width={spacing.heroWidth}
        height={spacing.heroHeight}
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        <View style={styles.inner}>
          {channel.logo ? (
            <Image
              source={{ uri: channel.logo }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderLogo}>
              <Text style={styles.placeholderText}>
                {channel.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {channel.name}
            </Text>
            {channel.categories.length > 0 && (
              <Text style={styles.category} numberOfLines={1}>
                {channel.categories.join(' / ')}
              </Text>
            )}
            {channel.isLive && (
              <View style={styles.liveRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE NOW</Text>
              </View>
            )}
          </View>
        </View>
      </FocusableCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    marginBottom: spacing.lg,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  logo: {
    width: '40%',
    height: '100%',
    marginRight: spacing.md,
  },
  placeholderLogo: {
    width: '40%',
    height: '100%',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  placeholderText: {
    fontSize: 64,
    color: colors.textMuted,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  category: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live,
    marginRight: 6,
  },
  liveText: {
    ...typography.caption,
    color: colors.live,
    fontWeight: '700',
  },
});
