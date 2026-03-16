import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIPTVCountries, useIPTVLanguages, useIPTVChannels } from '../../hooks/useIPTVChannels';
import { useFilterStore } from '../../hooks/useFilterStore';
import { RootStackParamList } from '../../types';
import { colors, spacing, typography } from '../../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NAV_ITEMS = [
  { key: 'Home', label: 'Home' },
  { key: 'Favorites', label: 'Favorites' },
  { key: 'RecentlyWatched', label: 'Recent' },
  { key: 'Search', label: 'Search' },
  { key: 'Settings', label: 'Settings' },
] as const;

function SelectPicker({ value, onChange, options }: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  if (Platform.OS === 'web') {
    return (
      <select
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          backgroundColor: colors.surfaceLight,
          color: colors.textSecondary,
          border: `1px solid ${colors.surfaceHighlight}`,
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 13,
          outline: 'none',
          cursor: 'pointer',
          minWidth: 130,
        } as any}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  return (
    <Text style={styles.pickerFallback}>
      {options.find(o => o.value === value)?.label ?? value}
    </Text>
  );
}

export function NavBar() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { selectedCountry, setCountry, selectedLanguage, setLanguage } = useFilterStore();
  const { data: countries } = useIPTVCountries();
  const { data: languages } = useIPTVLanguages();
  const { data: channelIndex } = useIPTVChannels();

  const countryOptions = useMemo(() => {
    if (!countries || !channelIndex) return [{ value: 'all', label: 'All Countries' }];
    const withChannels = countries
      .filter(c => channelIndex.byCountry.has(c.code))
      .sort((a, b) => {
        const countA = channelIndex.byCountry.get(a.code)?.length ?? 0;
        const countB = channelIndex.byCountry.get(b.code)?.length ?? 0;
        return countB - countA;
      });
    return [
      { value: 'all', label: 'All Countries' },
      ...withChannels.map(c => ({
        value: c.code,
        label: `${c.flag} ${c.name} (${channelIndex.byCountry.get(c.code)?.length ?? 0})`,
      })),
    ];
  }, [countries, channelIndex]);

  const languageOptions = useMemo(() => {
    if (!languages || !channelIndex) return [{ value: 'all', label: 'All Languages' }];
    const langCounts = new Map<string, number>();
    for (const ch of channelIndex.all) {
      if (ch.language) {
        langCounts.set(ch.language, (langCounts.get(ch.language) ?? 0) + 1);
      }
    }
    const langMap = new Map(languages.map(l => [l.code, l.name]));
    const withChannels = Array.from(langCounts.entries())
      .map(([code, count]) => ({
        value: code,
        label: `${langMap.get(code) ?? code} (${count})`,
        count,
      }))
      .sort((a, b) => b.count - a.count);
    return [
      { value: 'all', label: 'All Languages' },
      ...withChannels,
    ];
  }, [languages, channelIndex]);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.navigate('Home')}>
        <Text style={styles.logo}>TVApp</Text>
      </Pressable>
      <View style={styles.links}>
        {NAV_ITEMS.map(item => {
          const isActive = route.name === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => navigation.navigate(item.key as any)}
              style={({ pressed }: { pressed: boolean }) => [
                styles.link,
                isActive && styles.linkActive,
                pressed && styles.linkPressed,
              ]}
            >
              <Text style={[styles.linkText, isActive && styles.linkTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.filters}>
        <SelectPicker value={selectedCountry} onChange={setCountry} options={countryOptions} />
        <SelectPicker value={selectedLanguage} onChange={setLanguage} options={languageOptions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  logo: {
    ...typography.title,
    color: colors.accent,
    fontWeight: '800',
    marginRight: spacing.lg,
  },
  links: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
  },
  link: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  linkActive: {
    backgroundColor: colors.surfaceHighlight,
  },
  linkPressed: {
    opacity: 0.7,
  },
  linkText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  linkTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  pickerFallback: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
