import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { CountryCard } from './CountryCard';
import { SectionHeader } from './SectionHeader';
import { IPTVCountry } from '../../types';
import { spacing } from '../../theme';

interface CountryRowProps {
  countries: IPTVCountry[];
  countryCounts: Map<string, number>;
  onCountryPress: (country: IPTVCountry) => void;
}

export function CountryRow({ countries, countryCounts, onCountryPress }: CountryRowProps) {
  return (
    <View style={styles.container}>
      <SectionHeader title="Browse by Country" channelCount={countries.length} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {countries.map(country => (
          <View key={country.code} style={styles.cardWrapper}>
            <CountryCard
              country={country}
              channelCount={countryCounts.get(country.code)}
              onPress={() => onCountryPress(country)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  cardWrapper: {
    marginRight: spacing.cardGap,
  },
});
