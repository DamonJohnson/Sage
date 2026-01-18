import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemedColors } from '@/hooks/useThemedColors';
import { borderRadius, spacing, typography } from '@/theme';
import type { FSRSState } from '@sage/shared';

interface StatusBadgeProps {
  status: FSRSState | 'due';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function StatusBadge({ status, size = 'sm', style }: StatusBadgeProps) {
  const { accent } = useThemedColors();

  const getStatusConfig = () => {
    switch (status) {
      case 'new':
        return { label: 'New', bg: accent.red + '20', text: accent.red };
      case 'learning':
      case 'review':
      case 'relearning':
        return { label: status === 'learning' ? 'Learning' : status === 'review' ? 'Review' : 'Relearning', bg: accent.orange + '20', text: accent.orange };
      case 'due':
        return { label: 'Due', bg: accent.orange + '20', text: accent.orange };
      default:
        return { label: 'Unknown', bg: accent.orange + '20', text: accent.orange };
    }
  };

  const config = getStatusConfig();
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          paddingVertical: isSmall ? spacing[0.5] : spacing[1],
          paddingHorizontal: isSmall ? spacing[2] : spacing[3],
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSmall ? typography.sizes.xs : typography.sizes.sm,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
