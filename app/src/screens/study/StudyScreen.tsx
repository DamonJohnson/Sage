import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
  TextInput,
  ScrollView,
  ActivityIndicator,
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

// Safe haptics wrapper for web compatibility
const safeHaptics = {
  notificationAsync: (type: Haptics.NotificationFeedbackType) => {
    if (Platform.OS !== 'web') {
      return Haptics.notificationAsync(type);
    }
    return Promise.resolve();
  },
};

import { StudyCard, RatingButtons } from '@/components/study';
import { ProgressBar, GradientButton } from '@/components/ui';
import { useDeckStore, useStudyStore, useAuthStore, getIntervalLabel } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { playCelebrationSound, explainConcept } from '@/services';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Rating } from '@sage/shared';

export function StudyScreen() {
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'Study'>['route']>();
  const { deckId } = route.params;
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, textPrimary, textSecondary, accent, colors } = useThemedColors();

  const { getDeck, getCards, loadCards } = useDeckStore();
  const { startSession, getCurrentCard, rateCard, nextCard, endSession, getProgress } =
    useStudyStore();
  const { settings } = useAuthStore();

  const deck = getDeck(deckId);
  const cards = getCards(deckId);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  // Load cards when screen mounts
  useEffect(() => {
    const fetchCards = async () => {
      setIsLoadingCards(true);
      await loadCards(deckId);
      setIsLoadingCards(false);
    };
    fetchCards();
  }, [deckId]);

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

  // Learn More feature state
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationHistory, setExplanationHistory] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const explanationScrollRef = useRef<ScrollView>(null);

  // Create Cards from concept state
  const [showCreateCardsForm, setShowCreateCardsForm] = useState(false);
  const [createCardsFocus, setCreateCardsFocus] = useState('General overview of this concept');
  const [createCardsCount, setCreateCardsCount] = useState('3');
  const [createCardsAddToExisting, setCreateCardsAddToExisting] = useState(true);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);

  // Responsive values
  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const cardMaxWidth = isDesktop ? 600 : isTablet ? 500 : '100%';

  useEffect(() => {
    if (!isLoadingCards && cards.length > 0) {
      startSession(deckId, cards);
    }
  }, [deckId, isLoadingCards, cards.length]);

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
    console.log('handleRate called with rating:', rating);

    safeHaptics.notificationAsync(
      rating >= 3
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );

    // Fire and forget - don't block on API call
    rateCard(rating).catch((err) => console.error('rateCard error:', err));

    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (rating >= 3 ? 1 : 0),
    }));

    // Check if there are more cards
    const hasMore = nextCard();
    console.log('hasMore cards:', hasMore);
    if (!hasMore) {
      setShowComplete(true);
    } else {
      setIsFlipped(false);
      setMcAnswerSubmitted(false);
      setMcWasCorrect(false);
      // Reset explanation state for new card
      setShowExplanation(false);
      setExplanationHistory([]);
      setFollowUpQuestion('');
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

      // Normalize key for comparison (uppercase for consistency with stored bindings)
      let key = event.key === ' ' ? 'Space' : event.key;
      if (key.length === 1) {
        key = key.toUpperCase();
      }

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

  // Learn More handlers
  const handleLearnMore = async () => {
    if (!currentCard) return;

    setShowExplanation(true);
    setIsLoadingExplanation(true);
    setExplanationHistory([]);

    try {
      const response = await explainConcept({
        question: currentCard.card.front,
        answer: currentCard.card.back,
      });

      if (response.success && response.data) {
        setExplanationHistory([
          { role: 'assistant', content: response.data.explanation },
        ]);
      } else {
        setExplanationHistory([
          { role: 'assistant', content: 'Sorry, I could not generate an explanation at this time. Please try again.' },
        ]);
      }
    } catch (error) {
      console.error('Error getting explanation:', error);
      setExplanationHistory([
        { role: 'assistant', content: 'An error occurred while getting the explanation. Please try again.' },
      ]);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleFollowUpSubmit = async () => {
    if (!followUpQuestion.trim() || !currentCard || isLoadingExplanation) return;

    const userQuestion = followUpQuestion.trim();
    setFollowUpQuestion('');
    setExplanationHistory((prev) => [...prev, { role: 'user', content: userQuestion }]);
    setIsLoadingExplanation(true);

    // Scroll to bottom
    setTimeout(() => {
      explanationScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await explainConcept({
        question: currentCard.card.front,
        answer: currentCard.card.back,
        followUpQuestion: userQuestion,
      });

      if (response.success && response.data) {
        setExplanationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: response.data!.explanation },
        ]);
      } else {
        setExplanationHistory((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I could not answer that question. Please try again.' },
        ]);
      }
    } catch (error) {
      console.error('Error getting follow-up answer:', error);
      setExplanationHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'An error occurred. Please try again.' },
      ]);
    } finally {
      setIsLoadingExplanation(false);
      setTimeout(() => {
        explanationScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleCloseExplanation = () => {
    setShowExplanation(false);
    setExplanationHistory([]);
    setFollowUpQuestion('');
    setShowCreateCardsForm(false);
    setCreateCardsFocus('General overview of this concept');
    setCreateCardsCount('3');
    setCreateCardsAddToExisting(true);
  };

  // Create Cards handlers
  const CREATE_CARDS_FOCUS_CHIPS = [
    'Key definitions and terms',
    'Real-world examples',
    'Common misconceptions',
    'Step-by-step process',
    'Comparisons and contrasts',
  ];

  const handleOpenCreateCardsForm = () => {
    setShowCreateCardsForm(true);
  };

  const handleCreateCardsSubmit = async () => {
    if (!currentCard || isGeneratingCards) return;

    const count = parseInt(createCardsCount, 10) || 3;
    if (count < 1 || count > 20) {
      setToastMessage('Please enter a number between 1 and 20');
      return;
    }

    setIsGeneratingCards(true);

    try {
      // Navigate to AddCardsPreview with the generation params
      (navigation as any).navigate('AddCardsPreview', {
        deckId: createCardsAddToExisting ? deckId : null,
        sourceQuestion: currentCard.card.front,
        sourceAnswer: currentCard.card.back,
        focusArea: createCardsFocus,
        cardCount: count,
        createNewDeck: !createCardsAddToExisting,
        deckTitle: deck?.title || 'New Deck',
      });

      // Close the modal
      handleCloseExplanation();
    } catch (error) {
      console.error('Error navigating to create cards:', error);
      setToastMessage('Failed to create cards. Please try again.');
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // Show loading state while cards are being fetched
  if (isLoadingCards) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: background }]}>
        <Text style={[styles.emptyTitle, { color: textPrimary }]}>Loading cards...</Text>
      </SafeAreaView>
    );
  }

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
                  <>
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
                    {/* Learn More button */}
                    {!showExplanation && (
                      <Animated.View entering={FadeIn.delay(200)}>
                        <TouchableOpacity
                          style={[styles.learnMoreButton, { borderColor: accent.orange }]}
                          onPress={handleLearnMore}
                        >
                          <Ionicons name="bulb-outline" size={18} color={accent.orange} />
                          <Text style={[styles.learnMoreText, { color: accent.orange }]}>Learn More</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                  </>
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
            <>
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
              {/* Learn More button - mobile */}
              {!showExplanation && (
                <Animated.View entering={FadeIn.delay(200)} style={styles.learnMoreContainer}>
                  <TouchableOpacity
                    style={[styles.learnMoreButton, { borderColor: accent.orange }]}
                    onPress={handleLearnMore}
                  >
                    <Ionicons name="bulb-outline" size={18} color={accent.orange} />
                    <Text style={[styles.learnMoreText, { color: accent.orange }]}>Learn More</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </>
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

      {/* Explanation Panel */}
      {showExplanation && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[
            styles.explanationOverlay,
            { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            style={[
              styles.explanationPanel,
              {
                backgroundColor: surface,
                maxWidth: isDesktop ? 700 : isTablet ? 600 : '95%',
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.explanationHeader, { borderBottomColor: colors.border.light }]}>
              <View style={styles.explanationHeaderLeft}>
                <Ionicons name="bulb" size={22} color={accent.orange} />
                <Text style={[styles.explanationTitle, { color: textPrimary }]}>Learn More</Text>
              </View>
              <TouchableOpacity
                style={[styles.closeExplanationButton, { backgroundColor: background }]}
                onPress={handleCloseExplanation}
              >
                <Ionicons name="close" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Card context */}
            <View style={[styles.cardContext, { backgroundColor: background }]}>
              <Text style={[styles.cardContextLabel, { color: textSecondary }]}>Question</Text>
              <Text style={[styles.cardContextText, { color: textPrimary }]} numberOfLines={3}>
                {currentCard?.card.front}
              </Text>
              <View style={[styles.cardContextDivider, { backgroundColor: colors.border.light }]} />
              <Text style={[styles.cardContextLabel, { color: textSecondary }]}>Answer</Text>
              <Text style={[styles.cardContextText, { color: textPrimary }]} numberOfLines={3}>
                {currentCard?.card.back}
              </Text>
            </View>

            {showCreateCardsForm ? (
              /* Create Cards Form */
              <ScrollView
                style={[
                  styles.createCardsFormScroll,
                  Platform.OS === 'web' && {
                    // @ts-ignore - web-specific scrollbar styling
                    scrollbarColor: `${colors.border.light} transparent`,
                    scrollbarWidth: 'thin',
                  },
                ]}
                contentContainerStyle={styles.createCardsFormContent}
                indicatorStyle={background === '#191919' ? 'white' : 'black'}
              >
                <Text style={[styles.createCardsFormTitle, { color: textPrimary }]}>
                  Create Cards from This Concept
                </Text>
                <Text style={[styles.createCardsFormSubtitle, { color: textSecondary }]}>
                  Generate additional flashcards to reinforce your learning
                </Text>

                {/* Focus area */}
                <Text style={[styles.createCardsLabel, { color: textSecondary }]}>What to focus on</Text>
                <TextInput
                  style={[
                    styles.createCardsInput,
                    { backgroundColor: background, color: textPrimary, borderColor: colors.border.light },
                  ]}
                  value={createCardsFocus}
                  onChangeText={setCreateCardsFocus}
                  placeholder="What aspect of this concept?"
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={2}
                />
                <View style={styles.createCardsChips}>
                  {CREATE_CARDS_FOCUS_CHIPS.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={[styles.createCardsChip, { backgroundColor: colors.border.light }]}
                      onPress={() => setCreateCardsFocus(chip)}
                    >
                      <Text style={[styles.createCardsChipText, { color: textPrimary }]}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Card count */}
                <Text style={[styles.createCardsLabel, { color: textSecondary }]}>Number of cards</Text>
                <TextInput
                  style={[
                    styles.createCardsCountInput,
                    { backgroundColor: background, color: textPrimary, borderColor: colors.border.light },
                  ]}
                  value={createCardsCount}
                  onChangeText={setCreateCardsCount}
                  placeholder="3"
                  placeholderTextColor={textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                />

                {/* Add to existing or create new */}
                <Text style={[styles.createCardsLabel, { color: textSecondary }]}>Destination</Text>
                <View style={styles.createCardsToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.createCardsToggle,
                      { borderColor: colors.border.light },
                      createCardsAddToExisting && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
                    ]}
                    onPress={() => setCreateCardsAddToExisting(true)}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={createCardsAddToExisting ? accent.orange : textSecondary}
                    />
                    <Text style={[
                      styles.createCardsToggleText,
                      { color: createCardsAddToExisting ? accent.orange : textPrimary },
                    ]}>
                      Add to "{deck?.title}"
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.createCardsToggle,
                      { borderColor: colors.border.light },
                      !createCardsAddToExisting && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
                    ]}
                    onPress={() => setCreateCardsAddToExisting(false)}
                  >
                    <Ionicons
                      name="folder-outline"
                      size={18}
                      color={!createCardsAddToExisting ? accent.orange : textSecondary}
                    />
                    <Text style={[
                      styles.createCardsToggleText,
                      { color: !createCardsAddToExisting ? accent.orange : textPrimary },
                    ]}>
                      Create new deck
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.createCardsActions}>
                  <TouchableOpacity
                    style={[styles.createCardsBackBtn, { borderColor: colors.border.light }]}
                    onPress={() => setShowCreateCardsForm(false)}
                  >
                    <Text style={[styles.createCardsBackText, { color: textSecondary }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.createCardsSubmitBtn,
                      { backgroundColor: accent.green },
                      isGeneratingCards && { opacity: 0.6 },
                    ]}
                    onPress={handleCreateCardsSubmit}
                    disabled={isGeneratingCards}
                  >
                    {isGeneratingCards ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={styles.createCardsSubmitText}>Generate Cards</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <>
                {/* Conversation */}
                <ScrollView
                  ref={explanationScrollRef}
                  style={[
                    styles.explanationScroll,
                    Platform.OS === 'web' && {
                      // @ts-ignore - web-specific scrollbar styling
                      scrollbarColor: `${colors.border.light} transparent`,
                      scrollbarWidth: 'thin',
                    },
                  ]}
                  contentContainerStyle={styles.explanationContent}
                  showsVerticalScrollIndicator={true}
                  indicatorStyle={background === '#191919' ? 'white' : 'black'}
                >
                  {explanationHistory.map((message, index) => (
                    <View
                      key={index}
                      style={[
                        styles.messageContainer,
                        message.role === 'user' && styles.userMessageContainer,
                      ]}
                    >
                      {message.role === 'user' ? (
                        <View style={[styles.userMessage, { backgroundColor: accent.orange }]}>
                          <Text style={styles.userMessageText}>{message.content}</Text>
                        </View>
                      ) : (
                        <View style={styles.assistantMessage}>
                          <Ionicons name="sparkles" size={16} color={accent.orange} style={styles.messageIcon} />
                          <Text style={[styles.assistantMessageText, { color: textPrimary }]}>
                            {message.content}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {isLoadingExplanation && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={accent.orange} />
                      <Text style={[styles.loadingText, { color: textSecondary }]}>
                        {explanationHistory.length === 0 ? 'Getting explanation...' : 'Thinking...'}
                      </Text>
                    </View>
                  )}

                  {/* Create Cards Button - inside scroll after explanation */}
                  {explanationHistory.length > 0 && !isLoadingExplanation && (
                    <TouchableOpacity
                      style={[styles.createCardsButton, { backgroundColor: accent.orange + '15', borderColor: accent.orange }]}
                      onPress={handleOpenCreateCardsForm}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={accent.orange} />
                      <Text style={[styles.createCardsButtonText, { color: accent.orange }]}>
                        Create Cards on This Concept
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Follow-up input */}
                <View style={[styles.followUpContainer, { borderTopColor: colors.border.light }]}>
                  <TextInput
                    style={[
                      styles.followUpInput,
                      {
                        backgroundColor: background,
                        color: textPrimary,
                        borderColor: colors.border.light,
                      },
                    ]}
                    placeholder="Ask a follow-up question..."
                    placeholderTextColor={textSecondary}
                    value={followUpQuestion}
                    onChangeText={setFollowUpQuestion}
                    onSubmitEditing={handleFollowUpSubmit}
                    onKeyPress={(e: any) => {
                      if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                        e.preventDefault();
                        handleFollowUpSubmit();
                      }
                    }}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    multiline={false}
                    editable={!isLoadingExplanation}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: followUpQuestion.trim() && !isLoadingExplanation
                          ? accent.orange
                          : colors.border.light,
                      },
                    ]}
                    onPress={handleFollowUpSubmit}
                    disabled={!followUpQuestion.trim() || isLoadingExplanation}
                  >
                    <Ionicons
                      name="send"
                      size={18}
                      color={followUpQuestion.trim() && !isLoadingExplanation ? '#fff' : textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
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
  // Learn More styles
  learnMoreContainer: {
    alignItems: 'center',
    marginTop: spacing[3],
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing[2],
    marginTop: spacing[3],
  },
  learnMoreText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  explanationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  explanationPanel: {
    width: '100%',
    maxHeight: '90%',
    minHeight: 500,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    ...shadows.xl,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  explanationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  explanationTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  closeExplanationButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContext: {
    margin: spacing[4],
    marginBottom: 0,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  cardContextLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContextText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.5,
  },
  cardContextDivider: {
    height: 1,
    marginVertical: spacing[3],
  },
  explanationScroll: {
    flex: 1,
    minHeight: 250,
    maxHeight: 450,
  },
  explanationContent: {
    padding: spacing[4],
    gap: spacing[4],
  },
  messageContainer: {
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  userMessage: {
    maxWidth: '85%',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.xl,
    borderBottomRightRadius: spacing[1],
  },
  userMessageText: {
    fontSize: typography.sizes.sm,
    color: '#fff',
    lineHeight: typography.sizes.sm * 1.4,
  },
  assistantMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    maxWidth: '95%',
  },
  messageIcon: {
    marginTop: 2,
  },
  assistantMessageText: {
    flex: 1,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  loadingText: {
    fontSize: typography.sizes.sm,
  },
  followUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
    borderTopWidth: 1,
  },
  followUpInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    fontSize: typography.sizes.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Create Cards Button
  createCardsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing[4],
  },
  createCardsButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  // Create Cards Form
  createCardsFormScroll: {
    flex: 1,
  },
  createCardsFormContent: {
    padding: spacing[4],
  },
  createCardsFormTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  createCardsFormSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[5],
  },
  createCardsLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  createCardsInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.sizes.base,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  createCardsCountInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.sizes.base,
    width: 80,
  },
  createCardsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  createCardsChip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
  },
  createCardsChipText: {
    fontSize: typography.sizes.sm,
  },
  createCardsToggleRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  createCardsToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  createCardsToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  createCardsActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[6],
  },
  createCardsBackBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  createCardsBackText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  createCardsSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
  },
  createCardsSubmitText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
});
