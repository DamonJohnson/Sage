import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface PressableCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  hoverStyle?: ViewStyle;
  disabled?: boolean;
  haptic?: 'light' | 'medium' | 'none';
  scaleOnPress?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/**
 * A card component with smooth hover and press animations
 * Optimized for both web and native platforms
 */
export function PressableCard({
  children,
  onPress,
  style,
  hoverStyle,
  disabled = false,
  haptic = 'light',
  scaleOnPress = true,
}: PressableCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);
  const elevation = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    if (scaleOnPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
    elevation.value = withTiming(1, { duration: 100 });
  }, [scale, elevation, scaleOnPress]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    elevation.value = withTiming(0, { duration: 150 });
  }, [scale, elevation]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;

    if (haptic === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (haptic === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onPress();
  }, [disabled, haptic, onPress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: interpolate(elevation.value, [0, 1], [0.1, 0.15]),
    };
  });

  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const webStyle = Platform.OS === 'web' ? {
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
  } as any : {};

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled}
      style={[
        style,
        animatedStyle,
        webStyle,
        isHovered && hoverStyle,
        disabled && styles.disabled,
      ]}
      {...webProps}
    >
      {children}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
