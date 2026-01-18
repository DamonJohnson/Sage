import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, Text, ViewStyle, TextStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, spacing, typography } from '@/theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ai' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const GRADIENTS = {
  primary: colors.gradients.primary,
  secondary: colors.gradients.secondary,
  ai: colors.gradients.ai,
  success: colors.gradients.success,
};

const SIZES = {
  sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], fontSize: typography.sizes.sm },
  md: { paddingVertical: spacing[3], paddingHorizontal: spacing[6], fontSize: typography.sizes.base },
  lg: { paddingVertical: spacing[4], paddingHorizontal: spacing[8], fontSize: typography.sizes.lg },
};

export function GradientButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle,
  icon,
}: GradientButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [disabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyles = SIZES[size];

  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const webStyle = Platform.OS === 'web' ? {
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'transform 150ms ease, box-shadow 150ms ease',
  } as any : {};

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={[
        styles.container,
        animatedStyle,
        webStyle,
        isHovered && !disabled && styles.hovered,
        style,
      ]}
      {...webProps}
    >
      <LinearGradient
        colors={disabled ? [colors.gray[300], colors.gray[400]] : GRADIENTS[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          {
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
          },
        ]}
      >
        {icon}
        <Text
          style={[
            styles.text,
            { fontSize: sizeStyles.fontSize, marginLeft: icon ? spacing[2] : 0 },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  hovered: {
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
  },
});
