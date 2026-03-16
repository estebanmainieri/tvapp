import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FocusableCard } from '../common/FocusableCard';
import { IPTVCountry } from '../../types';
import { colors, spacing, typography } from '../../theme';

interface CountryCardProps {
  country: IPTVCountry;
  channelCount?: number;
  onPress: () => void;
}

export function CountryCard({ country, channelCount, onPress }: CountryCardProps) {
  return (
    <FocusableCard
      onPress={onPress}
      width={spacing.countryCardWidth}
      height={spacing.countryCardHeight}
    >
      <View style={styles.container}>
        <Text style={styles.flag}>{country.flag}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {country.name}
        </Text>
        {channelCount !== undefined && (
          <Text style={styles.count}>{channelCount}</Text>
        )}
      </View>
    </FocusableCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  flag: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  count: {
    ...typography.badge,
    color: colors.textMuted,
    marginTop: 2,
  },
});
