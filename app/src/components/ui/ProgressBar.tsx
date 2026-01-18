import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemedColors } from '@/hooks/useThemedColors';
import { borderRadius } from '@/theme';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'primary' | 'mastered' | 'learning' | 'new';
  height?: 'sm' | 'md' | 'lg';
  showBackground?: boolean;
  style?: ViewStyle;
}

const HEIGHT_MAP = {
  sm: 4,
  md: 8,
  lg: 12,
};

export function ProgressBar({
  value,
  variant = 'primary',
  height = 'md',
  showBackground = true,
  style,
}: ProgressBarProps) {
  const { surfaceHover, accent } = useThemedColors();

  const clampedValue = Math.min(100, Math.max(0, value));
  const barHeight = HEIGHT_MAP[height];

  // Get color based on variant
  const getVariantColor = () => {
    switch (variant) {
      case 'mastered':
        return accent.green;
      case 'learning':
        return accent.orange;
      case 'new':
        return accent.red;
      case 'primary':
      default:
        return accent.orange;
    }
  };

  const fillColor = getVariantColor();

  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${clampedValue}%`, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    }),
  }));

  return (
    <View
      style={[
        styles.container,
        {
          height: barHeight,
          backgroundColor: showBackground ? surfaceHover : 'transparent',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: fillColor, height: barHeight },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.full,
  },
});
