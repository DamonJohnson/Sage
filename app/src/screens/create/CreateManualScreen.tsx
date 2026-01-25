import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '@/navigation/types';
import * as Haptics from 'expo-haptics';

import { GradientButton } from '@/components/ui';
import { useDeckStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { CardType } from '@sage/shared';

interface CardData {
  id: string;
  front: string;
  back: string;
  cardType: CardType;
  options: string[];
  correctOptionIndex: number | null;
}

export function CreateManualScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addDeck, addCards } = useDeckStore();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [cards, setCards] = useState<CardData[]>([
    { id: '1', front: '', back: '', cardType: 'flashcard', options: ['', '', '', ''], correctOptionIndex: null },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddCard = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCards([...cards, { id: Date.now().toString(), front: '', back: '', cardType: 'flashcard', options: ['', '', '', ''], correctOptionIndex: null }]);
  };

  const handleRemoveCard = (id: string) => {
    if (cards.length <= 1) {
      Alert.alert('Cannot Remove', 'You need at least one card in the deck.');
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCards(cards.filter((c) => c.id !== id));
  };

  const handleUpdateCard = (id: string, field: 'front' | 'back', value: string) => {
    setCards(cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleToggleCardType = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setCards(cards.map((c) => {
      if (c.id === id) {
        const newType = c.cardType === 'flashcard' ? 'multiple_choice' : 'flashcard';
        return { ...c, cardType: newType };
      }
      return c;
    }));
  };

  const handleUpdateOption = (cardId: string, optionIndex: number, value: string) => {
    setCards(cards.map((c) => {
      if (c.id === cardId) {
        const newOptions = [...c.options];
        newOptions[optionIndex] = value;
        return { ...c, options: newOptions };
      }
      return c;
    }));
  };

  const handleSelectCorrectOption = (cardId: string, optionIndex: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setCards(cards.map((c) => {
      if (c.id === cardId) {
        return { ...c, correctOptionIndex: optionIndex };
      }
      return c;
    }));
  };

  const handleSave = async () => {
    // Validation
    if (!deckTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a deck title.');
      return;
    }

    // For multiple choice cards, check that at least 2 options are filled and a correct answer is selected
    const validCards = cards.filter((c) => {
      if (!c.front.trim()) return false;
      if (c.cardType === 'multiple_choice') {
        const filledOptions = c.options.filter(opt => opt.trim());
        if (filledOptions.length < 2) return false;
        // Check that a correct answer is selected and the option has text
        if (c.correctOptionIndex === null) return false;
        if (!c.options[c.correctOptionIndex]?.trim()) return false;
      } else {
        // For flashcards, require back text
        if (!c.back.trim()) return false;
      }
      return true;
    });

    if (validCards.length === 0) {
      Alert.alert('No Valid Cards', 'Please add at least one card with a question. For flashcards, include an answer. For multiple choice, fill at least 2 options and select the correct one.');
      return;
    }

    setIsSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // Create deck
      const deckId = await addDeck({
        userId: 'stub-user-1',
        title: deckTitle.trim(),
        description: deckDescription.trim(),
        isPublic: isPublic,
        cardCount: validCards.length,
        downloadCount: 0,
        ratingSum: 0,
        ratingCount: 0,
        originalAuthorId: null,
        originalAuthorName: null,
        originalAuthorAvatar: null,
        originalDeckId: null,
      });

      if (!deckId) {
        throw new Error('Failed to create deck');
      }

      // Add cards in batch
      const cardsToAdd = validCards.map((card) => {
        const filledOptions = card.cardType === 'multiple_choice'
          ? card.options.filter(opt => opt.trim())
          : null;

        // For multiple choice, the "back" is the correct answer option
        const back = card.cardType === 'multiple_choice' && card.correctOptionIndex !== null
          ? card.options[card.correctOptionIndex].trim()
          : card.back.trim();

        return {
          front: card.front.trim(),
          back,
          cardType: card.cardType,
          options: filledOptions,
        };
      });

      await addCards(deckId, cardsToAdd);

      // Navigate to the newly created deck
      navigation.replace('DeckDetail', { deckId });
    } catch (error) {
      Alert.alert('Error', 'Failed to create deck. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border, paddingTop: insets.top + spacing[2] }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Create Deck</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Deck Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Deck Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: surface, borderColor: border, color: textPrimary }]}
              placeholder="e.g., Spanish Vocabulary"
              placeholderTextColor={textSecondary}
              value={deckTitle}
              onChangeText={setDeckTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textSecondary }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: surface, borderColor: border, color: textPrimary }]}
              placeholder="What is this deck about?"
              placeholderTextColor={textSecondary}
              value={deckDescription}
              onChangeText={setDeckDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Privacy Setting */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.selectionAsync();
              }
              setIsPublic(!isPublic);
            }}
            style={[styles.privacySetting, { backgroundColor: surface, borderColor: border }]}
          >
            <View style={styles.privacyInfo}>
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={20}
                color={isPublic ? accent.green : textSecondary}
              />
              <View style={styles.privacyTextContainer}>
                <Text style={[styles.privacyTitle, { color: textPrimary }]}>
                  {isPublic ? 'Public Deck' : 'Private Deck'}
                </Text>
                <Text style={[styles.privacyDescription, { color: textSecondary }]}>
                  {isPublic
                    ? 'Anyone can find and import this deck'
                    : 'Only you can see this deck'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={(value) => {
                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }
                setIsPublic(value);
              }}
              trackColor={{ false: surfaceHover, true: accent.green + '80' }}
              thumbColor={isPublic ? accent.green : surfaceHover}
            />
          </TouchableOpacity>
        </View>

        {/* Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Cards ({cards.length})</Text>
          </View>

          {cards.map((card, index) => (
            <View key={card.id} style={[styles.cardEditor, { backgroundColor: surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardNumber, { color: textSecondary }]}>Card {index + 1}</Text>
                {cards.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveCard(card.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Card Type Toggle */}
              <View style={styles.cardTypeToggle}>
                <TouchableOpacity
                  style={[
                    styles.cardTypeButton,
                    { borderColor: border },
                    card.cardType === 'flashcard' && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
                  ]}
                  onPress={() => card.cardType !== 'flashcard' && handleToggleCardType(card.id)}
                >
                  <Ionicons
                    name="copy-outline"
                    size={16}
                    color={card.cardType === 'flashcard' ? accent.orange : textSecondary}
                  />
                  <Text
                    style={[
                      styles.cardTypeText,
                      { color: card.cardType === 'flashcard' ? accent.orange : textSecondary },
                    ]}
                  >
                    Flashcard
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cardTypeButton,
                    { borderColor: border },
                    card.cardType === 'multiple_choice' && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
                  ]}
                  onPress={() => card.cardType !== 'multiple_choice' && handleToggleCardType(card.id)}
                >
                  <Ionicons
                    name="list-outline"
                    size={16}
                    color={card.cardType === 'multiple_choice' ? accent.orange : textSecondary}
                  />
                  <Text
                    style={[
                      styles.cardTypeText,
                      { color: card.cardType === 'multiple_choice' ? accent.orange : textSecondary },
                    ]}
                  >
                    Multiple Choice
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardInputGroup}>
                <Text style={[styles.cardLabel, { color: textSecondary }]}>Front (Question)</Text>
                <TextInput
                  style={[styles.cardInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                  placeholder="Enter the question or term"
                  placeholderTextColor={textSecondary}
                  value={card.front}
                  onChangeText={(text) => handleUpdateCard(card.id, 'front', text)}
                  multiline
                />
              </View>

              {card.cardType !== 'multiple_choice' && (
                <View style={styles.cardInputGroup}>
                  <Text style={[styles.cardLabel, { color: textSecondary }]}>Back (Answer)</Text>
                  <TextInput
                    style={[styles.cardInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                    placeholder="Enter the answer or definition"
                    placeholderTextColor={textSecondary}
                    value={card.back}
                    onChangeText={(text) => handleUpdateCard(card.id, 'back', text)}
                    multiline
                  />
                </View>
              )}

              {/* Multiple Choice Options */}
              {card.cardType === 'multiple_choice' && (
                <View style={styles.optionsContainer}>
                  <Text style={[styles.cardLabel, { color: textSecondary }]}>Answer Options (min. 2) - Tap to select correct answer</Text>
                  {card.options.map((option, optIndex) => {
                    const isSelected = card.correctOptionIndex === optIndex;
                    const hasText = option.trim().length > 0;
                    return (
                      <View key={optIndex} style={styles.optionRow}>
                        <TouchableOpacity
                          style={[
                            styles.optionBadge,
                            { backgroundColor: isSelected && hasText ? accent.green : surfaceHover },
                          ]}
                          onPress={() => hasText && handleSelectCorrectOption(card.id, optIndex)}
                          disabled={!hasText}
                        >
                          {isSelected && hasText ? (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          ) : (
                            <Text
                              style={[
                                styles.optionBadgeText,
                                { color: textSecondary },
                              ]}
                            >
                              {String.fromCharCode(65 + optIndex)}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.optionInput,
                            { backgroundColor: surfaceHover, color: textPrimary },
                            isSelected && hasText && { borderColor: accent.green, borderWidth: 1 },
                          ]}
                          placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                          placeholderTextColor={textSecondary}
                          value={option}
                          onChangeText={(text) => handleUpdateOption(card.id, optIndex, text)}
                        />
                      </View>
                    );
                  })}
                  {card.correctOptionIndex === null && (
                    <Text style={[styles.optionHint, { color: accent.orange }]}>
                      Tap the letter badge to mark the correct answer
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.addCardButton, { borderColor: accent.orange + '50', backgroundColor: accent.orange + '10' }]}
            onPress={handleAddCard}
          >
            <Ionicons name="add-circle-outline" size={24} color={accent.orange} />
            <Text style={[styles.addCardText, { color: accent.orange }]}>Add Another Card</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <GradientButton
            title={isSaving ? 'Creating...' : 'Create Deck'}
            onPress={handleSave}
            disabled={isSaving}
            size="lg"
          />
        </View>

        <View style={{ height: spacing[20] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[4],
  },
  inputGroup: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing[2],
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.sizes.base,
  },
  textArea: {
    height: 80,
    paddingTop: spacing[3],
  },
  privacySetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyTextContainer: {
    marginLeft: spacing[3],
    flex: 1,
  },
  privacyTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  privacyDescription: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  cardEditor: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  cardNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  cardInputGroup: {
    marginBottom: spacing[3],
  },
  cardLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    marginBottom: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardInput: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: typography.sizes.base,
    minHeight: 60,
  },
  cardTypeToggle: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  cardTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[1],
  },
  cardTypeText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  optionsContainer: {
    marginTop: spacing[2],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  optionInput: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: typography.sizes.base,
  },
  optionHint: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    marginTop: spacing[1],
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
  },
  addCardText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    marginLeft: spacing[2],
  },
  saveContainer: {
    paddingVertical: spacing[4],
  },
});
