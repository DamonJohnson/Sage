import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { RadiatingLogo } from '@/components/ui';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LandingScreenProps {
  onSignUp: () => void;
  onSignIn: () => void;
}

// Card creation methods - the core value proposition
const CARD_CREATION_METHODS = [
  {
    icon: 'sparkles-outline' as const,
    title: 'AI Generation',
    description: 'Enter any topic and let AI create comprehensive flashcard decks for you instantly.',
  },
  {
    icon: 'document-text-outline' as const,
    title: 'PDF Scanning',
    description: 'Upload your study materials and automatically extract key concepts into cards.',
  },
  {
    icon: 'image-outline' as const,
    title: 'Image to Cards',
    description: 'Take photos of textbooks, notes, or whiteboards and convert them to flashcards.',
  },
  {
    icon: 'cloud-download-outline' as const,
    title: 'Direct Import',
    description: 'Import existing decks from .apkg files (Anki) or create from plain text.',
  },
];

// Card types supported
const CARD_TYPES = [
  {
    icon: 'swap-horizontal-outline' as const,
    title: 'Classic Flashcards',
    description: 'Front-and-back cards for recall, definitions, and concepts.',
  },
  {
    icon: 'checkbox-outline' as const,
    title: 'Multiple Choice',
    description: 'Quiz-style cards to test recognition and understanding.',
  },
];

// How it works steps
const STEPS = [
  {
    number: '1',
    title: 'Create Your Decks',
    description: 'Scan PDFs, generate cards with AI, directly import files, build cards manually or save decks created by other amazing community members.',
  },
  {
    number: '2',
    title: 'Study Smarter',
    description: 'Our algorithm schedules reviews at the optimal time for retention.',
  },
  {
    number: '3',
    title: 'Track Mastery',
    description: 'Watch your progress with streaks, stats, and mastery levels.',
  },
];

// Community features
const COMMUNITY_FEATURES = [
  {
    icon: 'people-outline' as const,
    text: 'Follow friends and see what they are studying',
  },
  {
    icon: 'share-social-outline' as const,
    text: 'Share decks privately or publicly',
  },
  {
    icon: 'globe-outline' as const,
    text: 'Browse and download community-created decks',
  },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function LandingScreen({ onSignUp, onSignIn }: LandingScreenProps) {
  const insets = useSafeAreaInsets();
  const { background, surface, surfaceHover, textPrimary, textSecondary, accent, border } = useThemedColors();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { isDark } = useTheme();

  // Hero takes full viewport height
  const heroHeight = SCREEN_HEIGHT - insets.top - insets.bottom;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;


  // Interactive card state
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Demo flashcard content
  const demoCard = {
    question: 'The secret to remembering anything?',
    answer: 'Timing.',
    detail: 'Review it right before you forget. Sage tells you when.',
  };

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

  }, []);

  const handleCardFlip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Toggle flip
    Animated.spring(flipAnim, {
      toValue: isCardFlipped ? 0 : 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
    setIsCardFlipped(!isCardFlipped);
  };

  // Flip animation interpolations
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });


  const handleSignUp = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSignUp();
  };

  const handleSignIn = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSignIn();
  };

  // Responsive layout values
  const containerMaxWidth = isDesktop ? 1200 : isTablet ? 900 : '100%';
  const heroContentWidth = isDesktop ? '50%' : '100%';
  const featureColumns = isDesktop ? 4 : isTablet ? 2 : 1;
  const stepColumns = isDesktop ? 3 : isTablet ? 3 : 1;


  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer' as const,
    transition: 'transform 200ms ease, box-shadow 200ms ease',
  } : {};

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ============================================
          HERO SECTION
          Primary conversion zone - make first impression count
          ============================================ */}
      <View style={[styles.heroSection, { paddingTop: insets.top + spacing[4], height: heroHeight }]}>
        {/* Dynamic gradient background */}
        <LinearGradient
          colors={isDark
            ? ['rgba(255, 127, 102, 0.15)', 'rgba(255, 127, 102, 0.05)', 'transparent']
            : ['rgba(255, 127, 102, 0.2)', 'rgba(255, 127, 102, 0.08)', 'transparent']
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Navigation bar */}
        <View style={[styles.nav, { maxWidth: containerMaxWidth }]}>
          <View style={styles.logoContainer}>
            <RadiatingLogo accentColor={accent.orange} size="medium" />
            <Text style={[styles.logoText, { color: textPrimary }]}>Sage</Text>
          </View>
          <View style={styles.navActions}>
            <TouchableOpacity
              style={[styles.navSignIn, webButtonStyle]}
              onPress={handleSignIn}
            >
              <Text style={[styles.navSignInText, { color: textPrimary }]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navSignUp, { backgroundColor: accent.orange }, webButtonStyle]}
              onPress={handleSignUp}
            >
              <Text style={styles.navSignUpText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero content */}
        <Animated.View
          style={[
            styles.heroContent,
            { maxWidth: containerMaxWidth },
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <View style={[styles.heroTextContainer, { width: heroContentWidth }]}>
            {/* Main headline */}
            <Text style={[styles.heroTitle, { color: textPrimary }, isDesktop && styles.heroTitleDesktop]}>
              Study{' '}
              <Text style={{ color: accent.orange }}>Your Way</Text>
            </Text>

            {/* Subheadline */}
            <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
              Sage adapts to how you learn using data driven space repetition learning techniques.
            </Text>

            {/* CTA buttons */}
            <View style={styles.heroCTAContainer}>
              <TouchableOpacity
                style={[styles.primaryCTA, { backgroundColor: accent.orange }, webButtonStyle]}
                onPress={handleSignUp}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryCTAText}>Get Started Free</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryCTA, { borderColor: border }, webButtonStyle]}
                onPress={handleSignIn}
              >
                <Text style={[styles.secondaryCTAText, { color: textPrimary }]}>
                  I already have an account
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero visual - flashcard sitting on deck */}
          {(isDesktop || isTablet) && (
            <View style={styles.heroVisual}>
              <View style={styles.deckWrapper}>
                {/* Deck stack behind - asymmetrically scattered cards */}
                <View
                  style={[
                    styles.deckCard,
                    styles.deckCardStack,
                    {
                      backgroundColor: surface,
                      borderColor: border,
                      top: 35,
                      left: 25,
                      transform: [{ rotate: '-8deg' }],
                      zIndex: 1,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.deckCard,
                    styles.deckCardStack,
                    {
                      backgroundColor: surface,
                      borderColor: border,
                      top: 18,
                      left: -15,
                      transform: [{ rotate: '5deg' }],
                      zIndex: 2,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.deckCard,
                    styles.deckCardStack,
                    {
                      backgroundColor: surface,
                      borderColor: border,
                      top: 25,
                      left: 40,
                      transform: [{ rotate: '3deg' }],
                      zIndex: 3,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.deckCard,
                    styles.deckCardStack,
                    {
                      backgroundColor: surface,
                      borderColor: border,
                      top: 12,
                      left: 8,
                      transform: [{ rotate: '-1.5deg' }],
                      zIndex: 4,
                    },
                  ]}
                />

                {/* Main flippable card sitting on top of deck */}
                <TouchableOpacity
                  style={[styles.activeCardContainer, Platform.OS === 'web' && { cursor: 'pointer' as any }]}
                  onPress={handleCardFlip}
                  activeOpacity={0.95}
                >
                {/* Front of card (Question) */}
                <Animated.View
                  style={[
                    styles.deckCard,
                    styles.deckCardActive,
                    {
                      backgroundColor: surface,
                      borderColor: accent.orange,
                      transform: [
                        { perspective: 1000 },
                        { rotateY: frontInterpolate },
                      ],
                      opacity: frontOpacity,
                    },
                  ]}
                >
                  <Text style={[styles.deckCardQuestion, { color: textPrimary }]}>
                    {demoCard.question}
                  </Text>
                  <View style={styles.tapHint}>
                    <Ionicons name="hand-left-outline" size={14} color={textSecondary} />
                    <Text style={[styles.tapHintText, { color: textSecondary }]}>Tap to reveal</Text>
                  </View>
                </Animated.View>

                {/* Back of card (Answer) */}
                <Animated.View
                  style={[
                    styles.deckCard,
                    styles.deckCardActive,
                    styles.deckCardBack,
                    {
                      backgroundColor: surface,
                      borderColor: accent.orange,
                      transform: [
                        { perspective: 1000 },
                        { rotateY: backInterpolate },
                      ],
                      opacity: backOpacity,
                    },
                  ]}
                >
                  <Text style={[styles.deckCardAnswer, { color: accent.orange }]}>
                    {demoCard.answer}
                  </Text>
                  <Text style={[styles.deckCardDetail, { color: textSecondary }]}>
                    {demoCard.detail}
                  </Text>
                  <View style={styles.tapHint}>
                    <Ionicons name="sync-outline" size={14} color={textSecondary} />
                    <Text style={[styles.tapHintText, { color: textSecondary }]}>Tap to flip back</Text>
                  </View>
                </Animated.View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      {/* ============================================
          CARD CREATION SECTION
          Highlight the multiple ways to create cards
          ============================================ */}
      <View style={[styles.section, { backgroundColor: surface }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>CARD CREATION</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Multiple ways to build your decks
          </Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Whether you want AI to do the work or prefer manual control, Sage has you covered.
          </Text>

          <View style={[
            styles.featureGrid,
            { flexDirection: featureColumns > 1 ? 'row' : 'column' }
          ]}>
            {CARD_CREATION_METHODS.map((method, index) => (
              <View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    width: featureColumns > 1 ? `${100 / featureColumns - 2}%` : '100%',
                    backgroundColor: background,
                    borderColor: border,
                  }
                ]}
              >
                <View style={[styles.featureIconContainer, { backgroundColor: accent.orange + '15' }]}>
                  <Ionicons name={method.icon} size={24} color={accent.orange} />
                </View>
                <Text style={[styles.featureTitle, { color: textPrimary }]}>{method.title}</Text>
                <Text style={[styles.featureDescription, { color: textSecondary }]}>
                  {method.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ============================================
          HOW IT WORKS SECTION
          Reduce friction by showing simplicity
          ============================================ */}
      <View style={[styles.section, { backgroundColor: background }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>HOW IT WORKS</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Start learning in minutes
          </Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Getting started is simple. No complex setup, just effective learning.
          </Text>

          <View style={[
            styles.stepsContainer,
            { flexDirection: stepColumns > 1 ? 'row' : 'column' }
          ]}>
            {STEPS.map((step, index) => (
              <View
                key={index}
                style={[
                  styles.stepCard,
                  { width: stepColumns > 1 ? `${100 / stepColumns - 2}%` : '100%' }
                ]}
              >
                <View style={[styles.stepNumber, { backgroundColor: accent.orange }]}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                {index < STEPS.length - 1 && stepColumns > 1 && (
                  <View style={[styles.stepConnector, { backgroundColor: accent.orange + '30' }]} />
                )}
                <Text style={[styles.stepTitle, { color: textPrimary }]}>{step.title}</Text>
                <Text style={[styles.stepDescription, { color: textSecondary }]}>
                  {step.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ============================================
          CARD TYPES SECTION
          Show supported card formats
          ============================================ */}
      <View style={[styles.section, { backgroundColor: surface }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>CARD TYPES</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Study using the right format
          </Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Different material benefits from different approaches.
          </Text>

          <View style={[
            styles.cardTypesGrid,
            { flexDirection: isDesktop || isTablet ? 'row' : 'column' }
          ]}>
            {CARD_TYPES.map((cardType, index) => (
              <View
                key={index}
                style={[
                  styles.cardTypeCard,
                  {
                    width: isDesktop || isTablet ? '48%' : '100%',
                    backgroundColor: background,
                    borderColor: border,
                  }
                ]}
              >
                <View style={[styles.cardTypeIconContainer, { backgroundColor: accent.orange + '15' }]}>
                  <Ionicons name={cardType.icon} size={32} color={accent.orange} />
                </View>
                <Text style={[styles.cardTypeTitle, { color: textPrimary }]}>
                  {cardType.title}
                </Text>
                <Text style={[styles.cardTypeDescription, { color: textSecondary }]}>
                  {cardType.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ============================================
          COMMUNITY SECTION
          Social learning features
          ============================================ */}
      <View style={[styles.section, { backgroundColor: background }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>COMMUNITY</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Learn alongside others
          </Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Discover new material, share what you create, and study with people you trust.
          </Text>

          <View style={styles.communityFeatures}>
            {COMMUNITY_FEATURES.map((feature, index) => (
              <View key={index} style={styles.communityFeatureRow}>
                <View style={[styles.communityFeatureIcon, { backgroundColor: accent.orange + '15' }]}>
                  <Ionicons name={feature.icon} size={20} color={accent.orange} />
                </View>
                <Text style={[styles.communityFeatureText, { color: textPrimary }]}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ============================================
          FINAL CTA SECTION
          Last chance to convert
          ============================================ */}
      <View style={[styles.finalCTASection, { backgroundColor: surface }]}>
        <LinearGradient
          colors={[accent.orange, '#E85D2B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.finalCTAGradient, { maxWidth: isDesktop ? 900 : '100%' }]}
        >
          <Text style={styles.finalCTATitle}>
            Create decks from your own material and study on a schedule that works for you.
          </Text>

          <TouchableOpacity
            style={[styles.finalCTAButton, webButtonStyle]}
            onPress={handleSignUp}
            activeOpacity={0.9}
          >
            <Text style={[styles.finalCTAButtonText, { color: accent.orange }]}>
              Get Started for Free
            </Text>
            <Ionicons name="arrow-forward" size={20} color={accent.orange} />
          </TouchableOpacity>

          <Text style={styles.finalCTANote}>
            No credit card required
          </Text>
        </LinearGradient>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
        <View style={[styles.footerContent, { maxWidth: containerMaxWidth }]}>
          <View style={styles.footerLogo}>
            <RadiatingLogo accentColor={accent.orange} size="small" />
            <Text style={[styles.footerLogoText, { color: textPrimary }]}>Sage</Text>
          </View>
          <Text style={[styles.footerCopyright, { color: textSecondary }]}>
            © 2025 Sage. All rights reserved.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section - responsive to viewport
  heroSection: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[4],
    overflow: 'hidden',
    position: 'relative',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  navSignIn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  navSignInText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  navSignUp: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
  },
  navSignUpText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    alignSelf: 'center',
    width: '100%',
    flex: 1,
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: spacing[4],
    maxWidth: 550,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 44,
    marginBottom: spacing[4],
  },
  heroTitleDesktop: {
    fontSize: 52,
    lineHeight: 62,
  },
  heroSubtitle: {
    fontSize: typography.sizes.lg,
    lineHeight: 28,
    marginBottom: spacing[8],
    maxWidth: 500,
  },
  heroCTAContainer: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
    alignSelf: 'flex-start',
    ...shadows.lg,
  },
  primaryCTAText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  secondaryCTA: {
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[4],
  },
  secondaryCTAText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  // Hero Visual - Card on Deck
  heroVisual: {
    width: '42%',
    height: '100%',
    position: 'relative',
    marginRight: spacing[12],
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckWrapper: {
    position: 'relative',
    width: 320,
    height: 320,
  },
  activeCardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 20,
  },
  deckCard: {
    width: 320,
    borderRadius: borderRadius['2xl'],
    borderWidth: 2,
    padding: spacing[6],
  },
  deckCardStack: {
    position: 'absolute',
    height: 280,
    ...shadows.sm,
  },
  deckCardActive: {
    minHeight: 280,
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xl,
  },
  deckCardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardCounter: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
  },
  cardCounterText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  deckCardIconLarge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  deckCardQuestion: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: spacing[4],
  },
  deckCardAnswer: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  deckCardDetail: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: 'auto',
    paddingTop: spacing[3],
    opacity: 0.6,
  },
  tapHintText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },

  // Sections
  section: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[6],
  },
  sectionContent: {
    alignSelf: 'center',
    width: '100%',
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  sectionSubtitle: {
    fontSize: typography.sizes.lg,
    textAlign: 'center',
    marginBottom: spacing[12],
    maxWidth: 600,
    alignSelf: 'center',
    lineHeight: 26,
  },

  // Features Grid
  featureGrid: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[5],
  },
  featureCard: {
    padding: spacing[7],
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    marginBottom: spacing[4],
    ...shadows.md,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  featureTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  featureDescription: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },

  // Steps
  stepsContainer: {
    justifyContent: 'space-between',
    gap: spacing[8],
  },
  stepCard: {
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: spacing[4],
  },
  stepNumber: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
    zIndex: 1,
    ...shadows.lg,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: typography.sizes['2xl'],
    fontWeight: '800',
  },
  stepConnector: {
    position: 'absolute',
    height: 3,
    width: '80%',
    top: 32,
    left: '60%',
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },

  // Card Types
  cardTypesGrid: {
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  cardTypeCard: {
    padding: spacing[8],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  cardTypeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  cardTypeTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  cardTypeDescription: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 300,
  },

  // Community
  communityFeatures: {
    alignItems: 'center',
    gap: spacing[4],
  },
  communityFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    maxWidth: 400,
    width: '100%',
  },
  communityFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityFeatureText: {
    fontSize: typography.sizes.base,
    flex: 1,
    lineHeight: 22,
  },

  // Final CTA
  finalCTASection: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
  },
  finalCTAGradient: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius['2xl'],
    ...shadows.xl,
  },
  finalCTATitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing[6],
    maxWidth: 500,
    lineHeight: 28,
  },
  finalCTASubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: typography.sizes.lg,
    textAlign: 'center',
    marginBottom: spacing[8],
    maxWidth: 500,
  },
  finalCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
    ...shadows.md,
  },
  finalCTAButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  finalCTANote: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: typography.sizes.sm,
    marginTop: spacing[4],
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[6],
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  footerLogoText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  footerCopyright: {
    fontSize: typography.sizes.sm,
  },
});
