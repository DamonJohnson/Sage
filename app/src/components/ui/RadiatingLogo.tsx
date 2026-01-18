import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface RadiatingLogoProps {
  accentColor: string;
  size?: 'small' | 'medium' | 'large';
}

function Ring({
  circleSize,
  accentColor,
  delay,
  duration,
}: {
  circleSize: number;
  accentColor: string;
  delay: number;
  duration: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Scale from 1 to 3.5 with smooth easing
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(3.5, { duration, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 0 })
        ),
        -1,
        false
      )
    );

    // Smooth fade: quick fade in, slow fade out across full duration
    // This creates overlap between rings for seamless effect
    const fadeInDuration = duration * 0.1;
    const fadeOutDuration = duration * 0.9;
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: fadeInDuration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: fadeOutDuration, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          borderWidth: 1,
          borderColor: accentColor,
        },
        animatedStyle,
      ]}
    />
  );
}

export function RadiatingLogo({ accentColor, size = 'medium' }: RadiatingLogoProps) {
  const sizeConfig = {
    small: { container: 64, circle: 8 },
    medium: { container: 140, circle: 16 },
    large: { container: 180, circle: 22 },
  };

  const config = sizeConfig[size];
  // Longer duration with more rings for seamless looping
  const duration = 6000;
  const ringDelay = 1500;
  const numRings = Math.ceil(duration / ringDelay);

  return (
    <View
      style={{
        width: config.container,
        height: config.container,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Staggered rings - evenly spaced for continuous effect */}
      {Array.from({ length: numRings }).map((_, i) => (
        <Ring
          key={i}
          circleSize={config.circle}
          accentColor={accentColor}
          delay={ringDelay * i}
          duration={duration}
        />
      ))}

      {/* Static center circle */}
      <View
        style={{
          width: config.circle,
          height: config.circle,
          borderRadius: config.circle / 2,
          backgroundColor: accentColor,
        }}
      />
    </View>
  );
}
