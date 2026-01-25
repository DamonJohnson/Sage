import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius } from '@/theme';

// Safe haptics wrapper for web compatibility
const safeHaptics = {
  selectionAsync: () => {
    if (Platform.OS !== 'web') {
      return Haptics.selectionAsync();
    }
    return Promise.resolve();
  },
};

export interface OptionItem<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface OptionButtonGridProps<T extends string> {
  options: OptionItem<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
  /** 'row' puts all options in one row, 'wrap' allows wrapping to multiple rows */
  layout?: 'row' | 'wrap';
  /** Whether to show icons (requires icon property on options) */
  showIcons?: boolean;
  /** Button size */
  size?: 'sm' | 'md';
}

export function OptionButtonGrid<T extends string>({
  options,
  selectedValue,
  onSelect,
  disabled = false,
  layout = 'row',
  showIcons = false,
  size = 'md',
}: OptionButtonGridProps<T>) {
  const { background, surface, border, textPrimary, textSecondary, accent } = useThemedColors();

  const handleSelect = (value: T) => {
    safeHaptics.selectionAsync();
    onSelect(value);
  };

  const buttonPadding = size === 'sm' ? spacing[2] : spacing[3];
  const fontSize = size === 'sm' ? typography.sizes.xs : typography.sizes.sm;

  return (
    <View style={[styles.container, layout === 'wrap' && styles.containerWrap]}>
      {options.map((option) => {
        const isSelected = selectedValue === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.button,
              {
                backgroundColor: surface,
                borderColor: border,
                paddingVertical: buttonPadding,
              },
              isSelected && {
                backgroundColor: accent.orange,
                borderColor: accent.orange,
              },
              showIcons && styles.buttonWithIcon,
            ]}
            onPress={() => handleSelect(option.value)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            {showIcons && option.icon && (
              <Ionicons
                name={option.icon}
                size={size === 'sm' ? 16 : 20}
                color={isSelected ? '#fff' : textSecondary}
              />
            )}
            <Text
              style={[
                styles.buttonText,
                { color: textSecondary, fontSize },
                isSelected && { color: '#FFFFFF' },
                showIcons && styles.buttonTextWithIcon,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  containerWrap: {
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  button: {
    flex: 1,
    marginHorizontal: spacing[1],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonWithIcon: {
    flexDirection: 'column',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextWithIcon: {
    fontWeight: '500',
  },
});
