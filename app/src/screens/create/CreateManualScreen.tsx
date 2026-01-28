import React, { useState, useRef } from 'react';
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
  Modal,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
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
  clozeIndex: number | null;
  nextClozeNum: number; // Track next cloze number for insertion
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
    { id: '1', front: '', back: '', cardType: 'flashcard', options: ['', '', '', ''], correctOptionIndex: null, clozeIndex: null, nextClozeNum: 1 },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [showClozeInfo, setShowClozeInfo] = useState(false);

  const handleAddCard = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCards([...cards, { id: Date.now().toString(), front: '', back: '', cardType: 'flashcard', options: ['', '', '', ''], correctOptionIndex: null, clozeIndex: null, nextClozeNum: 1 }]);
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

  const handleSetCardType = (id: string, newType: CardType) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setCards(cards.map((c) => {
      if (c.id === id && c.cardType !== newType) {
        return { ...c, cardType: newType, clozeIndex: newType === 'cloze' ? 1 : null };
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

  // Insert a numbered cloze deletion marker
  const handleInsertCloze = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const clozeNum = card.nextClozeNum;
    const clozeMarker = `{{c${clozeNum}::}}`;
    const newText = card.front + clozeMarker;

    setCards(cards.map(c => {
      if (c.id === cardId) {
        return { ...c, front: newText, nextClozeNum: clozeNum + 1 };
      }
      return c;
    }));

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle keyboard shortcut for inserting cloze blank (Ctrl/Cmd + B)
  const handleClozeKeyPress = (cardId: string) => {
    handleInsertCloze(cardId);
  };

  // Count cloze deletions in text
  const countClozeInText = (text: string): number => {
    const matches = text.match(/\{\{c\d+::/g);
    return matches ? matches.length : 0;
  };

  // Get unique cloze numbers from text
  const getClozeNumbers = (text: string): number[] => {
    const matches = text.match(/\{\{c(\d+)::/g);
    if (!matches) return [];
    const numbers = new Set<number>();
    for (const match of matches) {
      const num = parseInt(match.match(/\d+/)?.[0] || '1');
      numbers.add(num);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  };

  // Create cloze card for a specific cloze number
  const createClozeCardData = (text: string, clozeNum: number): { front: string; back: string } => {
    // Extract the answer for the tested cloze
    const answerRegex = new RegExp(`\\{\\{c${clozeNum}::([^}]+)\\}\\}`, 'gi');
    const answerMatch = answerRegex.exec(text);
    const answer = answerMatch ? answerMatch[1] : '';

    // Create front: replace tested cloze with [...], reveal others
    let front = text;
    // Replace the tested cloze with [...]
    front = front.replace(new RegExp(`\\{\\{c${clozeNum}::([^}]+)\\}\\}`, 'gi'), '[...]');
    // Reveal all other clozes (show the answer)
    front = front.replace(/\{\{c\d+::([^}]+)\}\}/gi, '$1');

    return { front, back: answer };
  };

  // Expand cloze card into multiple cards
  const expandClozeCard = (card: CardData): Array<{
    front: string;
    back: string;
    cardType: CardType;
    options: string[] | null;
    clozeIndex: number | null;
    frontImage: null;
    backImage: null;
    explanation: string | null;
  }> => {
    const clozeNumbers = getClozeNumbers(card.front);
    return clozeNumbers.map(clozeNum => {
      const { front, back } = createClozeCardData(card.front, clozeNum);
      return {
        front,
        back: back + (card.back ? '\n\n' + card.back : ''), // Append extra notes if any
        cardType: 'cloze' as CardType,
        options: null,
        clozeIndex: clozeNum,
        frontImage: null,
        backImage: null,
        explanation: null,
      };
    });
  };

  const handleSave = async () => {
    // Validation
    if (!deckTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a deck title.');
      return;
    }

    // Validate cards based on type
    const validCards = cards.filter((c) => {
      if (!c.front.trim()) return false;
      if (c.cardType === 'multiple_choice') {
        const filledOptions = c.options.filter(opt => opt.trim());
        if (filledOptions.length < 2) return false;
        // Check that a correct answer is selected and the option has text
        if (c.correctOptionIndex === null) return false;
        if (!c.options[c.correctOptionIndex]?.trim()) return false;
      } else if (c.cardType === 'cloze') {
        // For cloze, check for Anki-style {{c1::answer}} syntax with filled answers
        const clozePattern = /\{\{c\d+::([^}]+)\}\}/g;
        const matches = c.front.match(clozePattern);
        if (!matches || matches.length === 0) return false;
        // Check each cloze has content (not just {{c1::}})
        const hasEmptyCloze = /\{\{c\d+::\}\}/.test(c.front);
        if (hasEmptyCloze) return false;
      } else {
        // For flashcards, require back text
        if (!c.back.trim()) return false;
      }
      return true;
    });

    if (validCards.length === 0) {
      Alert.alert('No Valid Cards', 'Please add at least one valid card.\n\n• Flashcards: Need question and answer\n• Cloze: Use {{c1::answer}} syntax with text inside\n• Multiple choice: Need 2+ options with correct answer selected');
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

      // Add cards in batch - expand cloze cards into multiple cards
      const cardsToAdd: Array<{
        front: string;
        back: string;
        cardType: CardType;
        options: string[] | null;
        clozeIndex: number | null;
        frontImage: null;
        backImage: null;
        explanation: string | null;
      }> = [];

      for (const card of validCards) {
        if (card.cardType === 'cloze') {
          // Expand cloze card into multiple cards
          const expandedCards = expandClozeCard(card);
          cardsToAdd.push(...expandedCards);
        } else if (card.cardType === 'multiple_choice') {
          const filledOptions = card.options.filter(opt => opt.trim());
          const back = card.correctOptionIndex !== null
            ? card.options[card.correctOptionIndex].trim()
            : '';
          cardsToAdd.push({
            front: card.front.trim(),
            back,
            cardType: card.cardType,
            options: filledOptions,
            clozeIndex: null,
            frontImage: null,
            backImage: null,
            explanation: null,
          });
        } else {
          // Flashcard
          cardsToAdd.push({
            front: card.front.trim(),
            back: card.back.trim(),
            cardType: card.cardType,
            options: null,
            clozeIndex: null,
            frontImage: null,
            backImage: null,
            explanation: null,
          });
        }
      }

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
                  onPress={() => handleSetCardType(card.id, 'flashcard')}
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
                <View style={styles.cardTypeButtonWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.cardTypeButton,
                      { borderColor: border },
                      card.cardType === 'cloze' && { backgroundColor: accent.purple + '20', borderColor: accent.purple },
                    ]}
                    onPress={() => handleSetCardType(card.id, 'cloze')}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={16}
                      color={card.cardType === 'cloze' ? accent.purple : textSecondary}
                    />
                    <Text
                      style={[
                        styles.cardTypeText,
                        { color: card.cardType === 'cloze' ? accent.purple : textSecondary },
                      ]}
                    >
                      Cloze
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.clozeInfoButton, { backgroundColor: accent.purple + '20' }]}
                    onPress={() => setShowClozeInfo(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="help-circle" size={16} color={accent.purple} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[
                    styles.cardTypeButton,
                    { borderColor: border },
                    card.cardType === 'multiple_choice' && { backgroundColor: accent.blue + '20', borderColor: accent.blue },
                  ]}
                  onPress={() => handleSetCardType(card.id, 'multiple_choice')}
                >
                  <Ionicons
                    name="list-outline"
                    size={16}
                    color={card.cardType === 'multiple_choice' ? accent.blue : textSecondary}
                  />
                  <Text
                    style={[
                      styles.cardTypeText,
                      { color: card.cardType === 'multiple_choice' ? accent.blue : textSecondary },
                    ]}
                  >
                    Multi-Choice
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cloze-specific UI */}
              {card.cardType === 'cloze' && (
                <View style={[styles.clozeTipContainer, { backgroundColor: accent.purple + '10', borderColor: accent.purple + '30' }]}>
                  <View style={styles.clozeTipHeader}>
                    <Ionicons name="bulb-outline" size={16} color={accent.purple} />
                    <Text style={[styles.clozeTipTitle, { color: accent.purple }]}>How to create cloze cards</Text>
                  </View>
                  <Text style={[styles.clozeTipText, { color: textSecondary }]}>
                    Use <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: accent.purple }}>{'{{c1::answer}}'}</Text> syntax to mark blanks.{'\n\n'}
                    <Text style={{ fontWeight: '600', color: textPrimary }}>Single blank:</Text> "The {'{{c1::mitochondria}}'} is the powerhouse"{'\n\n'}
                    <Text style={{ fontWeight: '600', color: textPrimary }}>Multiple blanks:</Text> "{'{{c1::Paris}}'} is the capital of {'{{c2::France}}'}"
                  </Text>
                  <Text style={[styles.clozeTipNote, { color: textSecondary }]}>
                    Each numbered blank creates a separate study card.
                  </Text>
                </View>
              )}

              <View style={styles.cardInputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.cardLabel, { color: textSecondary }]}>
                    {card.cardType === 'cloze' ? 'Text with cloze deletions' : 'Front (Question)'}
                  </Text>
                  {card.cardType === 'cloze' && Platform.OS === 'web' && (
                    <Text style={[styles.hotkeyHint, { color: textSecondary }]}>
                      Ctrl+B to insert
                    </Text>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.cardInput,
                    { backgroundColor: surfaceHover, color: textPrimary },
                    card.cardType === 'cloze' && styles.clozeInput,
                  ]}
                  placeholder={card.cardType === 'cloze'
                    ? "e.g., The {{c1::mitochondria}} is the {{c2::powerhouse}} of the cell"
                    : "Enter the question or term"}
                  placeholderTextColor={textSecondary}
                  value={card.front}
                  onChangeText={(text) => handleUpdateCard(card.id, 'front', text)}
                  multiline
                  {...(card.cardType === 'cloze' && Platform.OS === 'web' ? {
                    onKeyPress: (e: any) => {
                      // Handle Ctrl+B or Cmd+B for inserting blank
                      const nativeEvent = e.nativeEvent as any;
                      if ((nativeEvent.ctrlKey || nativeEvent.metaKey) && nativeEvent.key === 'b') {
                        e.preventDefault();
                        handleClozeKeyPress(card.id);
                      }
                    }
                  } : {})}
                />
                {/* Insert cloze buttons */}
                {card.cardType === 'cloze' && (
                  <View style={styles.clozeButtonRow}>
                    <TouchableOpacity
                      style={[styles.insertBlankButton, { backgroundColor: accent.purple + '20' }]}
                      onPress={() => handleInsertCloze(card.id)}
                    >
                      <Ionicons name="add" size={14} color={accent.purple} />
                      <Text style={[styles.insertBlankText, { color: accent.purple }]}>
                        Insert {'{{c' + card.nextClozeNum + '::}}'}{Platform.OS === 'web' ? ' (Ctrl+B)' : ''}
                      </Text>
                    </TouchableOpacity>
                    {countClozeInText(card.front) > 0 && (
                      <View style={[styles.clozeCountBadge, { backgroundColor: accent.purple + '20' }]}>
                        <Text style={[styles.clozeCountText, { color: accent.purple }]}>
                          {countClozeInText(card.front)} cloze{countClozeInText(card.front) !== 1 ? 's' : ''} → {countClozeInText(card.front)} card{countClozeInText(card.front) !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {card.cardType === 'flashcard' && (
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

              {card.cardType === 'cloze' && (
                <View style={styles.cardInputGroup}>
                  <Text style={[styles.cardLabel, { color: textSecondary }]}>Extra Notes (optional)</Text>
                  <TextInput
                    style={[styles.cardInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                    placeholder="Additional context shown on the back of the card"
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

      {/* Cloze Info Modal */}
      <Modal
        visible={showClozeInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClozeInfo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClozeInfo(false)}
        >
          <View style={[styles.clozeInfoModal, { backgroundColor: surface }]}>
            <View style={styles.clozeInfoHeader}>
              <View style={[styles.clozeInfoIconContainer, { backgroundColor: accent.purple + '20' }]}>
                <Ionicons name="school-outline" size={24} color={accent.purple} />
              </View>
              <Text style={[styles.clozeInfoTitle, { color: textPrimary }]}>What is Cloze Deletion?</Text>
              <TouchableOpacity
                onPress={() => setShowClozeInfo(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.clozeInfoText, { color: textSecondary }]}>
              Cloze deletion (fill-in-the-blank) is a powerful learning technique where you hide key words in a sentence and test yourself on recalling them.
            </Text>

            <View style={[styles.clozeInfoExample, { backgroundColor: surfaceHover }]}>
              <Text style={[styles.clozeInfoExampleLabel, { color: accent.purple }]}>Example</Text>
              <Text style={[styles.clozeInfoExampleText, { color: textPrimary }]}>
                "The {'{{c1::mitochondria}}'} is the powerhouse of the cell"
              </Text>
              <Ionicons name="arrow-down" size={16} color={textSecondary} style={{ marginVertical: spacing[2] }} />
              <Text style={[styles.clozeInfoExampleText, { color: textPrimary }]}>
                Study card shows: "The [...] is the powerhouse of the cell"
              </Text>
            </View>

            <View style={styles.clozeInfoBenefits}>
              <Text style={[styles.clozeInfoBenefitsTitle, { color: textPrimary }]}>Why use cloze?</Text>
              <View style={styles.clozeInfoBenefit}>
                <Ionicons name="checkmark-circle" size={18} color={accent.green} />
                <Text style={[styles.clozeInfoBenefitText, { color: textSecondary }]}>
                  Learn facts in context, not isolation
                </Text>
              </View>
              <View style={styles.clozeInfoBenefit}>
                <Ionicons name="checkmark-circle" size={18} color={accent.green} />
                <Text style={[styles.clozeInfoBenefitText, { color: textSecondary }]}>
                  Multiple blanks = multiple cards from one note
                </Text>
              </View>
              <View style={styles.clozeInfoBenefit}>
                <Ionicons name="checkmark-circle" size={18} color={accent.green} />
                <Text style={[styles.clozeInfoBenefitText, { color: textSecondary }]}>
                  Ideal for definitions, lists, and sequences
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.clozeInfoCloseButton, { backgroundColor: accent.purple }]}
              onPress={() => setShowClozeInfo(false)}
            >
              <Text style={styles.clozeInfoCloseButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    gap: spacing[1.5],
    marginBottom: spacing[4],
  },
  cardTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  cardTypeText: {
    fontSize: typography.sizes.xs,
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
  // Cloze-specific styles
  clozeTipContainer: {
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  clozeTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  clozeTipTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  clozeTipText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  clozeTipNote: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    marginTop: spacing[2],
  },
  clozeInput: {
    minHeight: 80,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  clozeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  insertBlankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
    gap: 4,
  },
  insertBlankText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  clozeCountBadge: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  clozeCountText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  hotkeyHint: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
  },
  // Cloze info button and modal
  cardTypeButtonWrapper: {
    flex: 1,
    position: 'relative',
  },
  clozeInfoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  clozeInfoModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    ...shadows.lg,
  },
  clozeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  clozeInfoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  clozeInfoTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  clozeInfoText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  clozeInfoExample: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  clozeInfoExampleLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  clozeInfoExampleText: {
    fontSize: typography.sizes.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  clozeInfoBenefits: {
    marginBottom: spacing[4],
  },
  clozeInfoBenefitsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[2],
  },
  clozeInfoBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1.5],
  },
  clozeInfoBenefitText: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  clozeInfoCloseButton: {
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  clozeInfoCloseButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
