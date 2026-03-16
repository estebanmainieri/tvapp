import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { UnifiedChannel } from '../../types';
import { ChannelCard } from './ChannelCard';
import { SectionHeader } from './SectionHeader';
import { spacing } from '../../theme';

interface ContentRowProps {
  title: string;
  channels: UnifiedChannel[];
  onChannelPress: (channel: UnifiedChannel, index: number) => void;
  onChannelLongPress?: (channel: UnifiedChannel) => void;
  isFirstRow?: boolean;
}

export function ContentRow({
  title,
  channels,
  onChannelPress,
  onChannelLongPress,
  isFirstRow,
}: ContentRowProps) {
  if (channels.length === 0) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title={title} channelCount={channels.length} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {channels.map((channel, index) => (
          <View key={`${title}-${channel.id}`} style={styles.cardWrapper}>
            <ChannelCard
              channel={channel}
              channelNumber={channel.channelNumber}
              onPress={() => onChannelPress(channel, index)}
              onLongPress={() => onChannelLongPress?.(channel)}
              hasTVPreferredFocus={isFirstRow && index === 0}
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
  cardWrapper: {
    marginRight: spacing.cardGap,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
  },
});
