import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import { StudyCard, RatingButtons } from '@/components/study';
import { ProgressBar, GradientButton } from '@/components/ui';
import { useDeckStore, useStudyStore, useAuthStore, getIntervalLabel } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { playCelebrationSound } from '@/services';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Rating } from '@sage/shared';

export function StudyScreen() {
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'Study'>['route']>();
  const { deckId } = route.params;
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, textPrimary, textSecondary, accent, colors } = useThemedColors();

  const { getDeck, getCards } = useDeckStore();
  const { startSession, getCurrentCard, rateCard, nextCard, endSession, getProgress } =
    useStudyStore();
  const { settings } = useAuthStore();

  const deck = getDeck(deckId);
  const cards = getCards(deckId);

  // Keyboard shortcuts settings (web only)
  const keyboardShortcuts = settings.keyboardShortcuts;
  const showHotkeys = Platform.OS === 'web' && keyboardShortcuts?.showHints !== false;
  const shortcutsEnabled = Platform.OS === 'web' && keyboardShortcuts?.enabled !== false;
  const bindings = keyboardShortcuts?.bindings;

  const [isFlipped, setIsFlipped] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [mcAnswerSubmitted, setMcAnswerSubmitted] = useState(false);
  const [mcWasCorrect, setMcWasCorrect] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

  // Responsive values
  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const cardMaxWidth = isDesktop ? 600 : isTablet ? 500 : '100%';

  useEffect(() => {
    if (cards.length > 0) {
      startSession(deckId, cards);
    }
  }, [deckId]);

  // Play celebration sound when session completes
  useEffect(() => {
    if (showComplete && settings?.soundEffects !== false) {
      playCelebrationSound();
    }
  }, [showComplete]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const currentCard = getCurrentCard();
  const progress = getProgress();

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMcAnswerSubmit = (isCorrect: boolean) => {
    setMcAnswerSubmitted(true);
    setMcWasCorrect(isCorrect);
  };

  const handleRate = (rating: Rating) => {
    Haptics.notificationAsync(
      rating >= 3
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );

    rateCard(rating);

    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (rating >= 3 ? 1 : 0),
    }));

    // Check if there are more cards
    const hasMore = nextCard();
    if (!hasMore) {
      setShowComplete(true);
    } else {
      setIsFlipped(false);
      setMcAnswerSubmitted(false);
      setMcWasCorrect(false);
    }
  };

  // Determine if we should show rating buttons
  const isMultipleChoice = currentCard?.card.cardType === 'multiple_choice';
  const showRatingButtons = isMultipleChoice ? mcAnswerSubmitted : isFlipped;

  const handleClose = () => {
    endSession();
    navigation.goBack();
  };

  // Keyboard shortcuts for desktop
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if shortcuts disabled or showing complete screen
      if (!shortcutsEnabled || showComplete) return;

      // Get custom bindings or defaults
      const flipKey = bindings?.flipCard || 'Space';
      const againKey = bindings?.rateAgain || '1';
      const hardKey = bindings?.rateHard || '2';
      const goodKey = bindings?.rateGood || '3';
      const easyKey = bindings?.rateEasy || '4';
      const closeKey = bindings?.closeStudy || 'Escape';

      // Normalize key for comparison
      const key = event.key === ' ' ? 'Space' : event.key;

      // Check if ratings are restricted due to wrong MC answer
      const isIncorrectMc = isMultipleChoice && mcAnswerSubmitted && !mcWasCorrect;

      // Handle flip card (only for non-multiple-choice cards)
      if (!isMultipleChoice && (key === flipKey || (flipKey === 'Space' && key === 'Enter'))) {
        event.preventDefault();
        if (!isFlipped) {
          setIsFlipped(true);
        }
        return;
      }

      // Handle rating keys
      if (showRatingButtons) {
        if (key === againKey) {
          handleRate(1);
          return;
        }
        if (key === hardKey) {
          handleRate(2);
          return;
        }
        if (key === goodKey) {
          if (isIncorrectMc) {
            setToastMessage('For incorrect answers, please choose Again or Hard to help reinforce this card');
            return;
          }
          handleRate(3);
          return;
        }
        if (key === easyKey) {
          if (isIncorrectMc) {
            setToastMessage('For incorrect answers, please choose Again or Hard to help reinforce this card');
            return;
          }
          handleRate(4);
          return;
        }
      }

      // Handle close
      if (key === closeKey) {
        handleClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, showComplete, showRatingButtons, isMultipleChoice, mcAnswerSubmitted, mcWasCorrect, shortcutsEnabled, bindings]);

  const handleContinue = () => {
    // Reset and continue with remaining cards
    setShowComplete(false);
    setSessionStats({ reviewed: 0, correct: 0 });
    if (cards.length > 0) {
      startSession(deckId, cards);
    }
  };

  if (!deck || cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: background }]}>
        <Ionicons name="documents-outline" size={64} color={textSecondary} />
        <Text style={[styles.emptyTitle, { color: textPrimary }]}>No cards to study</Text>
        <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Add some cards to this deck first</Text>
        <GradientButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing[6] }}
        />
      </SafeAreaView>
    );
  }

  if (showComplete) {
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0;

    // Max width for complete screen content
    const completeMaxWidth = isDesktop ? 500 : isTablet ? 450 : '100%';

    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
        {/* Confetti celebration */}
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: screenWidth / 2, y: screenHeight }}
          autoStart={true}
          fadeOut={true}
          fallSpeed={3000}
          explosionSpeed={350}
          colors={[accent.orange, accent.green, '#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6']}
        />

        <Animated.View
          entering={FadeIn.duration(300)}
          style={[
            styles.completeContainer,
            {
              maxWidth: completeMaxWidth,
              alignSelf: 'center',
              width: '100%',
            }
          ]}
        >
          <View style={styles.completeIcon}>
            <Ionicons name="checkmark-circle" size={80} color={accent.green} />
          </View>

          <Text style={[styles.completeTitle, { color: textPrimary }]}>Session Complete!</Text>
          <Text style={[styles.completeSubtitle, { color: textSecondary }]}>
            Great job studying {deck.title}
          </Text>

          <View style={[styles.statsCard, { backgroundColor: surface }]}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accent.orange }]}>{sessionStats.reviewed}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Cards Reviewed</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border.light }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accent.green }]}>
                  {accuracy}%
                </Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Accuracy</Text>
              </View>
            </View>

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: accent.green }]} />
                <Text style={[styles.breakdownText, { color: textSecondary }]}>
                  {sessionStats.correct} correct
                </Text>
              </View>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: accent.red }]} />
                <Text style={[styles.breakdownText, { color: textSecondary }]}>
                  {sessionStats.reviewed - sessionStats.correct} to review
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.completeActions}>
            <GradientButton
              title="Continue Studying"
              onPress={handleContinue}
              size="lg"
              style={{ marginBottom: spacing[3] }}
            />
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: surface, borderColor: accent.orange, borderWidth: 1 }]}
              onPress={handleClose}
            >
              <Text style={[styles.doneButtonText, { color: accent.orange }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!currentCard) {
    return null;
  }

  // Calculate intervals for display
  const intervals = {
    again: '1 min',
    hard: '10 min',
    good: '1 day',
    easy: '4 days',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <View style={[
        styles.contentWrapper,
        {
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
        }
      ]}>
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: surface }]} onPress={handleClose}>
            <Ionicons name="close" size={24} color={textSecondary} />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <ProgressBar value={progress.percentage} height="sm" />
            <Text style={[styles.progressText, { color: textSecondary }]}>
              {progress.current} / {progress.total}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Deck Title */}
        <Text style={[styles.deckTitle, { color: textPrimary }, isDesktop && styles.deckTitleDesktop]}>
          {deck.title}
        </Text>

        {/* Card Container - positions card with fixed layout to prevent shifting */}
        <View style={[
          styles.cardContainer,
          {
            maxWidth: cardMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}>
          {/* Card positioned at top of its container */}
          <View style={isDesktop ? styles.cardAndRatingsGroup : undefined}>
            <StudyCard
              card={currentCard.card}
              isFlipped={isFlipped}
              onFlip={handleFlip}
              onAnswerSubmit={handleMcAnswerSubmit}
              showResult={mcAnswerSubmitted}
              showHotkeys={showHotkeys}
              shortcutsEnabled={shortcutsEnabled}
              hotkeyBindings={bindings ? {
                mcOption1: bindings.mcOption1,
                mcOption2: bindings.mcOption2,
                mcOption3: bindings.mcOption3,
                mcOption4: bindings.mcOption4,
                mcSubmit: bindings.mcSubmit,
              } : undefined}
            />

            {/* Desktop: Fixed height container for ratings to prevent card shift */}
            {isDesktop && (
              <View style={styles.desktopRatingsContainer}>
                {showRatingButtons ? (
                  <Animated.View
                    entering={SlideInDown.duration(300).springify()}
                    style={[styles.ratingsWrapper, { width: cardMaxWidth }]}
                  >
                    <RatingButtons
                      onRate={handleRate}
                      intervals={intervals}
                      mcWasCorrect={isMultipleChoice ? mcWasCorrect : undefined}
                      showHotkeys={showHotkeys}
                      hotkeyBindings={bindings ? {
                        again: bindings.rateAgain,
                        hard: bindings.rateHard,
                        good: bindings.rateGood,
                        easy: bindings.rateEasy,
                      } : undefined}
                    />
                  </Animated.View>
                ) : (
                  /* Tap hint - shows when ratings not visible (only for flashcards) */
                  !isMultipleChoice && (
                    <Animated.View
                      entering={FadeIn.delay(500)}
                      style={styles.tapHintContainer}
                    >
                      <Text style={[styles.tapHint, { color: textSecondary }]}>
                        Click the card to reveal the answer
                      </Text>
                    </Animated.View>
                  )
                )}
              </View>
            )}
          </View>
        </View>

        {/* Bottom container with fixed height to prevent card movement */}
        <View style={[
          styles.bottomContainer,
          {
            maxWidth: cardMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ]}>
          {/* Rating Buttons - at bottom on mobile */}
          {showRatingButtons && !isDesktop && (
            <Animated.View
              entering={SlideInDown.duration(300).springify()}
              style={styles.ratingsWrapper}
            >
              <RatingButtons
                onRate={handleRate}
                intervals={intervals}
                mcWasCorrect={isMultipleChoice ? mcWasCorrect : undefined}
                showHotkeys={showHotkeys}
                hotkeyBindings={bindings ? {
                  again: bindings.rateAgain,
                  hard: bindings.rateHard,
                  good: bindings.rateGood,
                  easy: bindings.rateEasy,
                } : undefined}
              />
            </Animated.View>
          )}

          {/* Tap hint - at bottom on mobile (only for flashcards) */}
          {!isFlipped && !isMultipleChoice && !isDesktop && (
            <Animated.View
              entering={FadeIn.delay(500)}
              style={styles.tapHintContainer}
            >
              <Text style={[styles.tapHint, { color: textSecondary }]}>
                Tap the card to reveal the answer
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Toast notification */}
      {toastMessage && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.toast, { backgroundColor: surface }]}
        >
          <Ionicons name="information-circle-outline" size={20} color={accent.orange} />
          <Text style={[styles.toastText, { color: textPrimary }]}>{toastMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  headerDesktop: {
    paddingVertical: spacing[6],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: spacing[4],
  },
  progressText: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  headerSpacer: {
    width: 40,
  },
  deckTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  deckTitleDesktop: {
    fontSize: typography.sizes['2xl'],
    marginBottom: spacing[6],
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAndRatingsGroup: {
    alignItems: 'center',
    width: '100%',
  },
  desktopRatingsContainer: {
    minHeight: 140,
    marginTop: spacing[4],
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  bottomContainer: {
    minHeight: 140,
    justifyContent: 'flex-start',
    paddingTop: spacing[4],
  },
  ratingsWrapper: {
    paddingHorizontal: spacing[4],
  },
  tapHintContainer: {
    paddingVertical: spacing[6],
    alignItems: 'center',
  },
  tapHint: {
    fontSize: typography.sizes.base,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing[2],
  },
  // Complete screen styles
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  completeIcon: {
    marginBottom: spacing[6],
  },
  completeTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  completeSubtitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing[8],
  },
  statsCard: {
    width: '100%',
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    marginBottom: spacing[8],
    ...shadows.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing[6],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes['4xl'],
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  statDivider: {
    width: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[6],
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing[2],
  },
  breakdownText: {
    fontSize: typography.sizes.sm,
  },
  completeActions: {
    width: '100%',
  },
  doneButton: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  doneButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    bottom: spacing[8],
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[3],
    ...shadows.lg,
    maxWidth: 500,
    alignSelf: 'center',
  },
  toastText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.4,
  },
});
