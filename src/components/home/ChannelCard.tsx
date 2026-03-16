import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FocusableCard } from '../common/FocusableCard';
import { UnifiedChannel } from '../../types';
import { colors, spacing, typography } from '../../theme';

interface ChannelCardProps {
  channel: UnifiedChannel;
  onPress: () => void;
  onLongPress?: () => void;
  hasTVPreferredFocus?: boolean;
}

export function ChannelCard({
  channel,
  onPress,
  onLongPress,
  hasTVPreferredFocus,
}: ChannelCardProps) {
  return (
    <FocusableCard
      onPress={onPress}
      onLongPress={onLongPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <View style={styles.container}>
        {channel.logo ? (
          <Image
            source={{ uri: channel.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderLogo}>
            <Text style={styles.placeholderText}>
              {(channel.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {channel.name || 'Unknown Channel'}
          </Text>
          {channel.quality && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{channel.quality}</Text>
            </View>
          )}
        </View>
        {channel.isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
    </FocusableCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.sm,
  },
  logo: {
    flex: 1,
    width: '100%',
    marginBottom: spacing.xs,
  },
  placeholderLogo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  placeholderText: {
    ...typography.hero,
    color: colors.textMuted,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.xs,
  },
  badge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  liveIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlayDark,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.live,
    marginRight: 4,
  },
  liveText: {
    ...typography.badge,
    color: colors.live,
  },
});
