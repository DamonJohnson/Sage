import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing, typography, borderRadius, shadows } from '@/theme';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Streamlined Onboarding Modal
 *
 * UX Principles Applied:
 * - Progressive disclosure: Defer technical details (FSRS) to later discovery
 * - Time-to-value: Get users studying within 30 seconds
 * - Hick's Law: Single clear CTA per screen
 * - Active recall primacy: Emphasize "studying" not "browsing"
 */
export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const insets = useSafeAreaInsets();
  const { background, surface, surfaceHover, textPrimary, textSecondary, accent, border } = useThemedColors();
  const { isDesktop, isTablet } = useResponsive();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const slideWidth = isDesktop ? 440 : isTablet ? 400 : SCREEN_WIDTH - spacing[8];

  // Reduced to 2 focused slides - value prop + single action
  const slides = [
    {
      id: 'welcome',
      icon: 'sparkles' as const,
      iconColor: accent.orange,
      iconBg: accent.orange + '20',
      title: 'Learn Anything,\nRemember Forever',
      subtitle: 'Sage schedules your reviews at the perfect time—right before you forget.',
    },
    {
      id: 'start',
      icon: 'rocket' as const,
      iconColor: '#FFFFFF',
      iconBg: accent.orange,
      title: "You're Ready!",
      subtitle: 'Create your first deck or explore community decks to start learning.',
    },
  ];

  const handleNext = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollRef.current?.scrollTo({ x: nextSlide * slideWidth, animated: true });
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onComplete();
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onComplete();
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (slideIndex !== currentSlide && slideIndex >= 0 && slideIndex < slides.length) {
      setCurrentSlide(slideIndex);
    }
  };

  const isLastSlide = currentSlide === slides.length - 1;

  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer' as const,
    transition: 'all 150ms ease',
  } as any : {};

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: background,
              width: slideWidth,
              marginTop: isDesktop ? spacing[10] : insets.top + spacing[4],
              marginBottom: isDesktop ? spacing[10] : insets.bottom + spacing[4],
            },
          ]}
        >
          {/* Skip Button - always visible for user control */}
          <TouchableOpacity
            style={[styles.skipButton, webButtonStyle]}
            onPress={handleSkip}
          >
            <Text style={[styles.skipText, { color: textSecondary }]}>Skip</Text>
          </TouchableOpacity>

          {/* Slides */}
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={Platform.OS !== 'web'}
            onMomentumScrollEnd={handleScroll}
            style={styles.slidesContainer}
            contentContainerStyle={{ width: slideWidth * slides.length }}
          >
            {slides.map((slide, index) => (
              <View key={slide.id} style={[styles.slide, { width: slideWidth }]}>
                <View style={styles.slideContent}>
                  {/* Icon */}
                  <View style={[styles.iconContainer, { backgroundColor: slide.iconBg }]}>
                    <Ionicons name={slide.icon} size={36} color={slide.iconColor} />
                  </View>

                  {/* Title & Subtitle */}
                  <Text style={[styles.title, { color: textPrimary }]}>{slide.title}</Text>
                  <Text style={[styles.subtitle, { color: textSecondary }]}>{slide.subtitle}</Text>

                  {/* Slide-specific content */}
                  {index === 0 && (
                    <View style={styles.featureList}>
                      <FeatureItem
                        icon="flash-outline"
                        text="AI generates flashcards instantly"
                        color={accent.purple}
                      />
                      <FeatureItem
                        icon="time-outline"
                        text="Smart scheduling based on your memory"
                        color={accent.green}
                      />
                      <FeatureItem
                        icon="trending-up-outline"
                        text="Track your progress and streaks"
                        color={accent.orange}
                      />
                    </View>
                  )}

                  {index === 1 && (
                    <View style={[styles.tipBox, { backgroundColor: accent.green + '15' }]}>
                      <Ionicons name="bulb-outline" size={20} color={accent.green} />
                      <Text style={[styles.tipText, { color: textSecondary }]}>
                        Tip: Start with just 10 new cards per day. Consistency beats intensity!
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Bottom Controls */}
          <View style={[styles.controls, { borderTopColor: border }]}>
            {/* Progress dots */}
            <View style={styles.dotsContainer}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentSlide ? accent.orange : surfaceHover,
                      width: index === currentSlide ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Primary CTA - large, centered, clear action */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: accent.orange },
                webButtonStyle,
              ]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isLastSlide ? "Start Learning" : 'Continue'}
              </Text>
              <Ionicons
                name={isLastSlide ? 'arrow-forward' : 'arrow-forward'}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Simple feature item component
function FeatureItem({ icon, text, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.featureText, { color: '#9B9A97' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    maxHeight: '80%',
    ...shadows.xl,
  },
  skipButton: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    zIndex: 10,
    padding: spacing[2],
  },
  skipText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  slidesContainer: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
  },
  slideContent: {
    padding: spacing[6],
    paddingTop: spacing[10],
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing[3],
    lineHeight: 32,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing[2],
  },
  featureList: {
    marginTop: spacing[8],
    gap: spacing[4],
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: 'row',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    marginTop: spacing[8],
    gap: spacing[3],
    width: '100%',
  },
  tipText: {
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  controls: {
    padding: spacing[5],
    borderTopWidth: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
    ...shadows.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
});
