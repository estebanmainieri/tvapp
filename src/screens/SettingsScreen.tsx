import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { FocusableButton } from '../components/common/FocusableButton';
import { colors, spacing, typography } from '../theme';

export function SettingsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.text}>TVApp v0.1.0</Text>
        <Text style={styles.text}>
          Free streaming aggregator. No content is hosted by this app.
        </Text>
        <Text style={styles.text}>
          Channel data provided by iptv-org (github.com/iptv-org/iptv)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <FocusableButton
          label="Refresh Channel Data"
          onPress={() => {
            // Will be wired up to react-query invalidation
          }}
          variant="secondary"
          hasTVPreferredFocus
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
