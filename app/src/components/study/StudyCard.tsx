import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Dimensions, Platform, Image, Modal } from 'react-native';

// Reusable hover hook for web
function useHoverState() {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};
  return { isHovered, webProps };
}
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemedColors } from '@/hooks/useThemedColors';
import { borderRadius, spacing, typography, shadows } from '@/theme';
import type { Card } from '@sage/shared';

interface StudyCardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  // Multiple choice specific
  onAnswerSubmit?: (isCorrect: boolean) => void;
  showResult?: boolean;
  // Hotkey hints (web only)
  showHotkeys?: boolean;
  shortcutsEnabled?: boolean;
  hotkeyBindings?: {
    mcOption1: string;
    mcOption2: string;
    mcOption3: string;
    mcOption4: string;
    mcSubmit: string;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - spacing[8], 500);
const CARD_HEIGHT = CARD_WIDTH * 0.7;

// Multiple choice option button with hover
function McOptionButton({
  option,
  index,
  correctAnswer,
  selectedOption,
  hasSubmitted,
  onSelect,
  surface,
  surfaceHover,
  border,
  textPrimary,
  textSecondary,
  accent,
  hotkey,
}: {
  option: string;
  index: number;
  correctAnswer: string;
  selectedOption: string | null;
  hasSubmitted: boolean;
  onSelect: (option: string) => void;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: { orange: string; green: string; red: string; blue: string; purple: string };
  hotkey?: string;
}) {
  const { isHovered, webProps } = useHoverState();
  const isSelected = selectedOption === option;
  const isCorrectAnswer = option === correctAnswer;
  const showCorrect = hasSubmitted && isCorrectAnswer;
  const showWrong = hasSubmitted && isSelected && !isCorrectAnswer;

  return (
    <TouchableOpacity
      style={[
        styles.mcOptionItem,
        { backgroundColor: surface, borderColor: isHovered && !hasSubmitted ? accent.orange : border },
        isSelected && !hasSubmitted && { borderColor: accent.orange, borderWidth: 2 },
        showCorrect && { backgroundColor: accent.green + '15', borderColor: accent.green, borderWidth: 2 },
        showWrong && { backgroundColor: accent.red + '15', borderColor: accent.red, borderWidth: 2 },
        Platform.OS === 'web' && { cursor: hasSubmitted ? 'default' : 'pointer', transition: 'border-color 150ms ease, background-color 150ms ease' } as any,
      ]}
      onPress={() => onSelect(option)}
      disabled={hasSubmitted}
      activeOpacity={0.7}
      {...webProps}
    >
      <View style={[
        styles.mcOptionLetter,
        { backgroundColor: isHovered && !isSelected && !hasSubmitted ? accent.orange + '30' : surfaceHover },
        isSelected && !hasSubmitted && { backgroundColor: accent.orange },
        showCorrect && { backgroundColor: accent.green },
        showWrong && { backgroundColor: accent.red },
      ]}>
        <Text style={[
          styles.mcOptionLetterText,
          { color: textSecondary },
          (isSelected || showCorrect || showWrong) && { color: '#FFFFFF' },
        ]}>
          {String.fromCharCode(65 + index)}
        </Text>
      </View>
      <Text style={[styles.mcOptionText, { color: textPrimary }]}>{option}</Text>
      {/* Hotkey badge */}
      {hotkey && Platform.OS === 'web' && !hasSubmitted && (
        <View style={[styles.mcHotkeyBadge, { backgroundColor: surfaceHover }]}>
          <Text style={[styles.mcHotkeyText, { color: textSecondary }]}>{hotkey}</Text>
        </View>
      )}
      {showCorrect && (
        <Ionicons name="checkmark-circle" size={22} color={accent.green} />
      )}
      {showWrong && (
        <Ionicons name="close-circle" size={22} color={accent.red} />
      )}
    </TouchableOpacity>
  );
}

// Submit button with hover
function McSubmitButton({
  selectedOption,
  onPress,
  surfaceHover,
  textSecondary,
  accent,
  hotkey,
}: {
  selectedOption: string | null;
  onPress: () => void;
  surfaceHover: string;
  textSecondary: string;
  accent: { orange: string };
  hotkey?: string;
}) {
  const { isHovered, webProps } = useHoverState();
  const hasSelection = !!selectedOption;

  return (
    <TouchableOpacity
      style={[
        styles.mcSubmitButton,
        { backgroundColor: hasSelection ? accent.orange : surfaceHover },
        hasSelection && isHovered && { opacity: 0.9, transform: [{ scale: 1.02 }] },
        Platform.OS === 'web' && { cursor: hasSelection ? 'pointer' : 'default', transition: 'transform 150ms ease, opacity 150ms ease' } as any,
      ]}
      onPress={onPress}
      disabled={!hasSelection}
      activeOpacity={0.8}
      {...webProps}
    >
      <Text style={[
        styles.mcSubmitText,
        { color: hasSelection ? '#FFFFFF' : textSecondary },
      ]}>
        Submit Answer
      </Text>
      {hotkey && Platform.OS === 'web' && (
        <View style={[styles.mcSubmitHotkeyBadge, { backgroundColor: hasSelection ? 'rgba(255,255,255,0.2)' : surfaceHover }]}>
          <Text style={[styles.mcHotkeyText, { color: hasSelection ? '#FFFFFF' : textSecondary }]}>{hotkey}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function StudyCard({ card, isFlipped, onFlip, onAnswerSubmit, showResult, showHotkeys, shortcutsEnabled = true, hotkeyBindings }: StudyCardProps) {
  const rotation = useSharedValue(0);
  const { surface, surfaceHover, border, textPrimary, textSecondary, accent, background } = useThemedColors();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const isMultipleChoice = card.cardType === 'multiple_choice' && card.options;

  // Reset state when card changes
  useEffect(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
  }, [card.id]);

  useEffect(() => {
    // Only animate flip for non-multiple-choice cards
    if (!isMultipleChoice) {
      rotation.value = withTiming(isFlipped ? 180 : 0, {
        duration: 500,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
    }
  }, [isFlipped, isMultipleChoice]);

  // Keyboard shortcuts for MC (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || !isMultipleChoice || !shortcutsEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (hasSubmitted) return;

      // Normalize key for comparison (uppercase for consistency with stored bindings)
      let key = event.key;
      if (key.length === 1) {
        key = key.toUpperCase();
      }

      // Get bindings
      const option1Key = hotkeyBindings?.mcOption1 || '1';
      const option2Key = hotkeyBindings?.mcOption2 || '2';
      const option3Key = hotkeyBindings?.mcOption3 || '3';
      const option4Key = hotkeyBindings?.mcOption4 || '4';
      const submitKey = hotkeyBindings?.mcSubmit || 'Enter';

      const options = card.options || [];

      // Handle option selection
      if (key === option1Key && options.length > 0) {
        setSelectedOption(options[0]);
        return;
      }
      if (key === option2Key && options.length > 1) {
        setSelectedOption(options[1]);
        return;
      }
      if (key === option3Key && options.length > 2) {
        setSelectedOption(options[2]);
        return;
      }
      if (key === option4Key && options.length > 3) {
        setSelectedOption(options[3]);
        return;
      }

      // Handle submit
      if (key === submitKey && selectedOption) {
        event.preventDefault();
        const isCorrect = selectedOption === card.back;
        Haptics.notificationAsync(
          isCorrect
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error
        );
        setHasSubmitted(true);
        onAnswerSubmit?.(isCorrect);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMultipleChoice, shortcutsEnabled, hasSubmitted, selectedOption, card, hotkeyBindings, onAnswerSubmit]);

  const handlePress = () => {
    // Don't flip for multiple choice cards
    if (isMultipleChoice) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onFlip();
  };

  const handleOptionSelect = (option: string) => {
    if (hasSubmitted) return;
    Haptics.selectionAsync();
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || hasSubmitted) return;

    const isCorrect = selectedOption === card.back;
    Haptics.notificationAsync(
      isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error
    );

    setHasSubmitted(true);
    onAnswerSubmit?.(isCorrect);
  };

  const handleImagePress = (imageUri: string) => {
    setZoomedImage(imageUri);
  };

  const closeImageZoom = () => {
    setZoomedImage(null);
  };

  // Image zoom modal
  const renderImageZoomModal = () => (
    <Modal
      visible={!!zoomedImage}
      transparent
      animationType="fade"
      onRequestClose={closeImageZoom}
    >
      <Pressable style={styles.zoomModalOverlay} onPress={closeImageZoom}>
        <View style={styles.zoomModalContent}>
          {zoomedImage && (
            <Image
              source={{ uri: zoomedImage }}
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity style={styles.zoomCloseButton} onPress={closeImageZoom}>
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  // Front card animation (question side)
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    const opacity = interpolate(rotation.value, [0, 89, 90, 180], [1, 1, 0, 0]);

    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` },
      ],
      opacity,
      zIndex: rotation.value < 90 ? 2 : 0,
    };
  });

  // Back card animation (answer side)
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    const opacity = interpolate(rotation.value, [0, 89, 90, 180], [0, 0, 1, 1]);

    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` },
      ],
      opacity,
      zIndex: rotation.value >= 90 ? 2 : 0,
    };
  });

  // For multiple-choice cards, render a different UI
  if (isMultipleChoice && card.options) {
    const isCorrect = selectedOption === card.back;

    return (
      <View style={styles.mcContainer}>
        {/* Question Card */}
        <View style={[styles.mcCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.cardLabel, { backgroundColor: surfaceHover }]}>
            <Text style={[styles.cardLabelText, { color: textSecondary }]}>Multiple Choice</Text>
          </View>
          <View style={styles.mcQuestionContent}>
            {card.frontImage && (
              <TouchableOpacity onPress={() => handleImagePress(card.frontImage!)} activeOpacity={0.8} style={styles.mcImageContainer}>
                <Image
                  source={{ uri: card.frontImage }}
                  style={styles.mcQuestionImage}
                  resizeMode="contain"
                />
                <View style={styles.zoomHint}>
                  <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
            <Text style={[styles.mcQuestionText, { color: textPrimary }]}>{card.front}</Text>
          </View>
        </View>
        {renderImageZoomModal()}

        {/* Options */}
        <View style={styles.mcOptionsContainer}>
          {card.options.map((option, index) => {
            // Get hotkey for this option
            const optionKeys = ['mcOption1', 'mcOption2', 'mcOption3', 'mcOption4'] as const;
            const hotkey = showHotkeys && hotkeyBindings && index < 4
              ? hotkeyBindings[optionKeys[index]]
              : undefined;

            return (
              <McOptionButton
                key={index}
                option={option}
                index={index}
                correctAnswer={card.back}
                selectedOption={selectedOption}
                hasSubmitted={hasSubmitted}
                onSelect={handleOptionSelect}
                surface={surface}
                surfaceHover={surfaceHover}
                border={border}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                accent={accent}
                hotkey={hotkey}
              />
            );
          })}
        </View>

        {/* Submit Button or Result */}
        {!hasSubmitted ? (
          <McSubmitButton
            selectedOption={selectedOption}
            onPress={handleSubmitAnswer}
            surfaceHover={surfaceHover}
            textSecondary={textSecondary}
            accent={accent}
            hotkey={showHotkeys && hotkeyBindings ? hotkeyBindings.mcSubmit : undefined}
          />
        ) : (
          <View style={[
            styles.mcResultBanner,
            { backgroundColor: isCorrect ? accent.green + '15' : accent.red + '15' },
          ]}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={isCorrect ? accent.green : accent.red}
            />
            <Text style={[
              styles.mcResultText,
              { color: isCorrect ? accent.green : accent.red },
            ]}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Standard flashcard UI with flip animation
  return (
    <Pressable onPress={handlePress} style={styles.container}>
      {/* Front of card (Question) */}
      <Animated.View
        style={[
          styles.card,
          styles.cardFront,
          { backgroundColor: surface, borderColor: border },
          frontAnimatedStyle,
        ]}
      >
        <View style={[styles.cardLabel, { backgroundColor: surfaceHover }]}>
          <Text style={[styles.cardLabelText, { color: textSecondary }]}>Question</Text>
        </View>
        <View style={styles.cardContent}>
          {card.frontImage && (
            <TouchableOpacity onPress={() => handleImagePress(card.frontImage!)} activeOpacity={0.8} style={styles.imageContainer}>
              <Image
                source={{ uri: card.frontImage }}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
          <Text style={[styles.cardText, { color: textPrimary }, card.frontImage ? { fontSize: typography.sizes.lg } : undefined]}>
            {card.front}
          </Text>
        </View>
        {renderImageZoomModal()}
        <View style={styles.flipHint}>
          <Ionicons name="refresh-outline" size={16} color={textSecondary} />
          <Text style={[styles.flipHintText, { color: textSecondary }]}>Tap to reveal answer</Text>
        </View>
      </Animated.View>

      {/* Back of card (Answer) */}
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          { backgroundColor: accent.orange + '15', borderColor: accent.orange + '40' },
          backAnimatedStyle,
        ]}
      >
        <View style={[styles.cardLabel, { backgroundColor: accent.orange + '20' }]}>
          <Text style={[styles.cardLabelText, { color: accent.orange }]}>Answer</Text>
        </View>
        <View style={styles.cardContent}>
          {card.backImage && (
            <TouchableOpacity onPress={() => handleImagePress(card.backImage!)} activeOpacity={0.8} style={styles.imageContainer}>
              <Image
                source={{ uri: card.backImage }}
                style={styles.cardImage}
                resizeMode="contain"
              />
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
          <Text style={[styles.cardText, { color: textPrimary }, card.backImage ? { fontSize: typography.sizes.lg } : undefined]}>
            {card.back}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
    ...Platform.select({
      web: {
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      },
    }),
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    justifyContent: 'space-between',
    borderWidth: 1,
    ...Platform.select({
      web: {
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
      } as any,
      default: {
        backfaceVisibility: 'hidden',
      },
    }),
  },
  cardFront: {},
  cardBack: {},
  cardLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  cardLabelText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  cardText: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    lineHeight: 36,
  },
  imageContainer: {
    width: '100%',
    marginBottom: spacing[3],
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  flipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  flipHintText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[1],
  },
  // Multiple Choice styles
  mcContainer: {
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  mcCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    borderWidth: 1,
    marginBottom: spacing[4],
    ...shadows.md,
  },
  mcQuestionContent: {
    paddingVertical: spacing[4],
  },
  mcImageContainer: {
    width: '100%',
    marginBottom: spacing[3],
  },
  mcQuestionImage: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.md,
  },
  mcQuestionText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    lineHeight: 30,
  },
  mcOptionsContainer: {
    gap: spacing[3],
  },
  mcOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    borderWidth: 1,
    ...shadows.sm,
  },
  mcOptionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  mcOptionLetterText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  mcOptionText: {
    flex: 1,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  mcSubmitButton: {
    marginTop: spacing[5],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  mcSubmitText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  mcResultBanner: {
    marginTop: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  mcResultText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  mcHotkeyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing[2],
  },
  mcHotkeyText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  mcSubmitHotkeyBadge: {
    position: 'absolute',
    right: spacing[4],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  // Image zoom modal styles
  zoomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    width: '95%',
    height: '85%',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: spacing[2],
  },
  zoomHint: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
    padding: spacing[1],
  },
});
