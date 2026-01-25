import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemedColors } from '@/hooks/useThemedColors';
import { borderRadius, spacing, typography, shadows } from '@/theme';
import type { Rating } from '@sage/shared';

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  intervals: {
    again: string;
    hard: string;
    good: string;
    easy: string;
  };
  disabled?: boolean;
  mcWasCorrect?: boolean; // undefined = flashcard, true = MC correct, false = MC incorrect
  showHotkeys?: boolean; // Whether to show hotkey hints
  hotkeyBindings?: {
    again: string;
    hard: string;
    good: string;
    easy: string;
  };
}

function RatingButton({
  label,
  interval,
  color,
  bgColor,
  onPress,
  disabled,
  restrictedDisabled,
  tooltipText,
  hotkey,
}: {
  label: string;
  interval: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  disabled?: boolean;
  restrictedDisabled?: boolean; // Disabled due to wrong MC answer
  tooltipText?: string;
  hotkey?: string; // Hotkey hint to display
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { surface, textPrimary, textSecondary } = useThemedColors();

  const isButtonDisabled = disabled || restrictedDisabled;

  const handlePressIn = () => {
    if (!isButtonDisabled) {
      setIsPressed(true);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const handlePress = () => {
    if (isButtonDisabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => {
      setIsHovered(true);
      if (restrictedDisabled && tooltipText) {
        setShowTooltip(true);
      }
    },
    onMouseLeave: () => {
      setIsHovered(false);
      setShowTooltip(false);
    },
  } : {};

  // Calculate dynamic background based on state
  const dynamicBgColor = isButtonDisabled
    ? bgColor
    : isPressed
      ? color + '45'
      : isHovered
        ? color + '35'
        : bgColor;

  return (
    <View style={styles.buttonWrapper} {...webProps}>
      {/* Tooltip - pointerEvents: 'none' to not intercept clicks */}
      {showTooltip && tooltipText && Platform.OS === 'web' && (
        <View style={[styles.tooltip, { backgroundColor: surface, borderColor: textSecondary + '30' }]} pointerEvents="none">
          <Text style={[styles.tooltipText, { color: textPrimary }]}>{tooltipText}</Text>
          <View style={[styles.tooltipArrow, { borderTopColor: surface }]} />
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: dynamicBgColor },
          isButtonDisabled && styles.buttonDisabled,
          restrictedDisabled && styles.buttonRestricted,
          Platform.OS === 'web' && {
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
          } as any,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isButtonDisabled}
        activeOpacity={0.7}
      >
        {/* Hotkey hint badge - pointerEvents: 'none' to not intercept clicks */}
        {hotkey && Platform.OS === 'web' && (
          <View style={[styles.hotkeyBadge, { backgroundColor: color + '20' }]} pointerEvents="none">
            <Text style={[styles.hotkeyText, { color }]}>{hotkey}</Text>
          </View>
        )}
        <Text style={[styles.buttonLabel, { color }, restrictedDisabled && styles.textRestricted]}>
          {label}
        </Text>
        <Text style={[styles.buttonInterval, { color }, restrictedDisabled && styles.textRestricted]}>
          {interval}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function RatingButtons({ onRate, intervals, disabled, mcWasCorrect, showHotkeys, hotkeyBindings }: RatingButtonsProps) {
  const { surface, textSecondary, accent } = useThemedColors();

  // If mcWasCorrect is false, restrict Good and Easy buttons
  const isIncorrectMc = mcWasCorrect === false;
  const restrictedTooltip = "For incorrect answers, please choose Again or Hard to help reinforce this card";

  // Default hotkey bindings
  const defaultBindings = { again: '1', hard: '2', good: '3', easy: '4' };
  const bindings = hotkeyBindings || defaultBindings;

  // Dynamic rating configurations based on theme
  const ratings = [
    { rating: 1 as Rating, label: 'Again', color: accent.red, bgColor: accent.red + '15', intervalKey: 'again' as const, restricted: false, hotkey: bindings.again },
    { rating: 2 as Rating, label: 'Hard', color: accent.orange, bgColor: accent.orange + '15', intervalKey: 'hard' as const, restricted: false, hotkey: bindings.hard },
    { rating: 3 as Rating, label: 'Good', color: accent.green, bgColor: accent.green + '15', intervalKey: 'good' as const, restricted: isIncorrectMc, hotkey: bindings.good },
    { rating: 4 as Rating, label: 'Easy', color: accent.green, bgColor: accent.green + '25', intervalKey: 'easy' as const, restricted: isIncorrectMc, hotkey: bindings.easy },
  ];

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      <Text style={[styles.title, { color: textSecondary }]}>How well did you know this?</Text>
      <View style={styles.buttonsRow}>
        {ratings.map((config) => (
          <RatingButton
            key={config.rating}
            label={config.label}
            interval={intervals[config.intervalKey]}
            color={config.color}
            bgColor={config.bgColor}
            onPress={() => onRate(config.rating)}
            disabled={disabled}
            restrictedDisabled={config.restricted}
            tooltipText={config.restricted ? restrictedTooltip : undefined}
            hotkey={showHotkeys ? config.hotkey : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    ...shadows.lg,
  },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: spacing[1],
    position: 'relative',
    overflow: 'visible' as const,
  },
  button: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    position: 'relative' as const,
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        overflow: 'visible' as const,
      },
    }),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonRestricted: {
    opacity: 0.4,
  },
  textRestricted: {
    opacity: 0.7,
  },
  buttonLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  buttonInterval: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    opacity: 0.8,
  },
  hotkeyBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    ...Platform.select({
      web: {
        pointerEvents: 'none' as const,
      },
    }),
  },
  hotkeyText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: -40,
    right: -40,
    marginBottom: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    zIndex: 100,
    ...shadows.md,
    ...Platform.select({
      web: {
        pointerEvents: 'none' as const,
      },
    }),
  },
  tooltipText: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: typography.sizes.xs * 1.4,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
