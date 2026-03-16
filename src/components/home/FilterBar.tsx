import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useIPTVCountries, useIPTVLanguages, useIPTVChannels } from '../../hooks/useIPTVChannels';
import { useFilterStore } from '../../hooks/useFilterStore';
import { colors, spacing, typography } from '../../theme';

function Picker({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.pickerGroup}>
        <Text style={styles.label}>{label}</Text>
        <select
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          style={{
            backgroundColor: colors.surfaceLight,
            color: colors.textPrimary,
            border: `1px solid ${colors.surfaceHighlight}`,
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 14,
            outline: 'none',
            cursor: 'pointer',
            minWidth: 160,
          } as any}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </View>
    );
  }

  // Native fallback - simple text for now, can use @react-native-picker/picker later
  return (
    <View style={styles.pickerGroup}>
      <Text style={styles.label}>{label}: {options.find(o => o.value === value)?.label}</Text>
    </View>
  );
}

export function FilterBar() {
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
    // Count channels per language
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
      <Picker
        label="Country"
        value={selectedCountry}
        onChange={setCountry}
        options={countryOptions}
      />
      <Picker
        label="Language"
        value={selectedLanguage}
        onChange={setLanguage}
        options={languageOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    gap: spacing.lg,
    alignItems: 'center',
  },
  pickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
