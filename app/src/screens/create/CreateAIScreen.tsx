import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

import { GradientButton } from '@/components/ui';
import { useDeckStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import { generateFromTopic, generateMockCards, type GeneratedCard } from '@/services/ai';

interface PreviewCard extends GeneratedCard {
  id: string;
}

const POPULAR_TOPICS = [
  { emoji: '', label: 'Spanish Basics' },
  { emoji: '', label: 'Biology 101' },
  { emoji: '', label: 'Economics' },
  { emoji: '', label: 'Art History' },
  { emoji: '', label: 'Constitutional Law' },
  { emoji: '', label: 'Psychology' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export function CreateAIScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { addDeck, addCards } = useDeckStore();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [topic, setTopic] = useState('');
  const [cardCount, setCardCount] = useState(15);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isPublic, setIsPublic] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Preview mode state
  const [showPreview, setShowPreview] = useState(false);
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardFront, setEditCardFront] = useState('');
  const [editCardBack, setEditCardBack] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const pulseAnim = useSharedValue(1);

  React.useEffect(() => {
    if (isGenerating) {
      pulseAnim.value = withRepeat(
        withTiming(1.1, { duration: 800 }),
        -1,
        true
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [isGenerating]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const handleTopicSelect = (label: string) => {
    Haptics.selectionAsync();
    setTopic(label);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      return;
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let generatedCards: GeneratedCard[];

    try {
      // Try to call the API
      const response = await generateFromTopic({
        topic: topic.trim(),
        count: cardCount,
        difficulty,
      });

      if (response.success && response.data?.cards) {
        generatedCards = response.data.cards;
      } else {
        // Fallback to mock cards if API fails
        console.log('API unavailable, using mock cards');
        generatedCards = generateMockCards(topic, cardCount, difficulty);
      }
    } catch (error) {
      // Fallback to mock cards on error
      console.log('API error, using mock cards:', error);
      generatedCards = generateMockCards(topic, cardCount, difficulty);
    }

    // Add IDs to cards for editing
    const cardsWithIds: PreviewCard[] = generatedCards.map((card, index) => ({
      ...card,
      id: `preview-${index}-${Date.now()}`,
    }));

    // Set up preview mode
    setPreviewCards(cardsWithIds);
    setDeckTitle(topic);
    setDeckDescription(`AI-generated flashcards about ${topic} (${difficulty} level)`);
    setIsGenerating(false);
    setShowPreview(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveDeck = async () => {
    if (!deckTitle.trim()) {
      Alert.alert('Error', 'Please enter a deck title');
      return;
    }

    if (previewCards.length === 0) {
      Alert.alert('Error', 'Please add at least one card');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Create deck
    const deckId = await addDeck({
      userId: 'stub-user-1',
      title: deckTitle.trim(),
      description: deckDescription.trim(),
      isPublic: isPublic,
      category: null,
      tags: [difficulty, 'ai-generated'],
      cardCount: previewCards.length,
      downloadCount: 0,
      ratingSum: 0,
      ratingCount: 0,
    });

    if (!deckId) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to create deck. Please try again.');
      return;
    }

    // Add cards in batch
    const cardsToAdd = previewCards.map((card) => ({
      front: card.front,
      back: card.back,
      cardType: card.cardType || 'flashcard',
      options: null,
    }));

    await addCards(deckId, cardsToAdd);

    setIsSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Navigate to the newly created deck
    navigation.replace('DeckDetail', { deckId });
  };

  const handleEditCard = (card: PreviewCard) => {
    setEditingCardId(card.id);
    setEditCardFront(card.front);
    setEditCardBack(card.back);
  };

  const handleSaveCardEdit = () => {
    if (!editingCardId) return;

    setPreviewCards((prev) =>
      prev.map((card) =>
        card.id === editingCardId
          ? { ...card, front: editCardFront.trim(), back: editCardBack.trim() }
          : card
      )
    );
    setEditingCardId(null);
    setEditCardFront('');
    setEditCardBack('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to remove this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPreviewCards((prev) => prev.filter((card) => card.id !== cardId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleBackToEdit = () => {
    Alert.alert(
      'Discard Changes?',
      'Going back will discard all generated cards. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setShowPreview(false);
            setPreviewCards([]);
          },
        },
      ]
    );
  };

  // Preview Mode UI
  if (showPreview) {
    return (
      <View style={[styles.container, { backgroundColor: background, paddingTop: insets.top }]}>
        {/* Preview Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: surface }]}
            onPress={handleBackToEdit}
          >
            <Ionicons name="arrow-back" size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Review & Edit</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Banner */}
          <View style={[styles.successBanner, { backgroundColor: accent.green + '15' }]}>
            <Ionicons name="checkmark-circle" size={24} color={accent.green} />
            <Text style={[styles.successText, { color: accent.green }]}>
              {previewCards.length} cards generated! Review and edit before saving.
            </Text>
          </View>

          {/* Deck Info Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>Deck Title</Text>
            <TextInput
              style={[styles.previewInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
              value={deckTitle}
              onChangeText={setDeckTitle}
              placeholder="Enter deck title"
              placeholderTextColor={textSecondary}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.previewInput, styles.previewMultilineInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
              value={deckDescription}
              onChangeText={setDeckDescription}
              placeholder="Enter deck description"
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Privacy Toggle */}
          <View style={[styles.privacySetting, { backgroundColor: surface, marginBottom: spacing[6] }]}>
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
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: surfaceHover, true: accent.green + '80' }}
              thumbColor={isPublic ? accent.green : surfaceHover}
            />
          </View>

          {/* Cards Section */}
          <View style={styles.section}>
            <View style={styles.cardsSectionHeader}>
              <Text style={[styles.sectionLabel, { color: textSecondary }]}>
                Cards ({previewCards.length})
              </Text>
            </View>

            {previewCards.map((card, index) => (
              <View
                key={card.id}
                style={[styles.previewCard, { backgroundColor: surface, borderColor: border }]}
              >
                <View style={styles.previewCardHeader}>
                  <View style={[styles.cardNumber, { backgroundColor: surfaceHover }]}>
                    <Text style={[styles.cardNumberText, { color: textSecondary }]}>{index + 1}</Text>
                  </View>
                  <View style={styles.previewCardActions}>
                    <TouchableOpacity
                      style={[styles.cardActionBtn, { backgroundColor: surfaceHover }]}
                      onPress={() => handleEditCard(card)}
                    >
                      <Ionicons name="create-outline" size={16} color={accent.orange} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardActionBtn, { backgroundColor: surfaceHover }]}
                      onPress={() => handleDeleteCard(card.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={accent.red} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.previewCardContent}>
                  <Text style={[styles.previewCardLabel, { color: textSecondary }]}>Front</Text>
                  <Text style={[styles.previewCardText, { color: textPrimary }]}>{card.front}</Text>
                  <View style={[styles.previewCardDivider, { backgroundColor: border }]} />
                  <Text style={[styles.previewCardLabel, { color: textSecondary }]}>Back</Text>
                  <Text style={[styles.previewCardText, { color: textPrimary }]}>{card.back}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <GradientButton
              title={isSaving ? 'Saving...' : 'Save Deck'}
              onPress={handleSaveDeck}
              size="lg"
              disabled={isSaving || !deckTitle.trim() || previewCards.length === 0}
              icon={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
            />
          </View>

          <View style={{ height: spacing[20] }} />
        </ScrollView>

        {/* Edit Card Modal */}
        <Modal
          visible={editingCardId !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingCardId(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModal, { backgroundColor: surface }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: textPrimary }]}>Edit Card</Text>
                <TouchableOpacity onPress={() => setEditingCardId(null)}>
                  <Ionicons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionLabel, { color: textSecondary }]}>Front (Question)</Text>
              <TextInput
                style={[styles.editModalInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                value={editCardFront}
                onChangeText={setEditCardFront}
                placeholder="Enter the question"
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: spacing[4] }]}>Back (Answer)</Text>
              <TextInput
                style={[styles.editModalInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                value={editCardBack}
                onChangeText={setEditCardBack}
                placeholder="Enter the answer"
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
              />

              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editModalCancelBtn, { borderColor: border }]}
                  onPress={() => setEditingCardId(null)}
                >
                  <Text style={[styles.editModalCancelText, { color: textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalSaveBtn, { backgroundColor: accent.orange }]}
                  onPress={handleSaveCardEdit}
                >
                  <Text style={styles.editModalSaveText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Generation Form UI
  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>AI Generate</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Topic Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>What do you want to learn?</Text>
          <TextInput
            style={[styles.topicInput, { backgroundColor: surface, color: textPrimary }]}
            placeholder="Enter any topic, e.g., 'French Revolution', 'JavaScript Promises'..."
            placeholderTextColor={textSecondary}
            value={topic}
            onChangeText={setTopic}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isGenerating}
          />
        </View>

        {/* Popular Topics */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Popular Topics</Text>
          <View style={styles.topicsGrid}>
            {POPULAR_TOPICS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.topicChip,
                  { backgroundColor: surface, borderColor: border },
                  topic === item.label && { backgroundColor: accent.orange + '15', borderColor: accent.orange },
                ]}
                onPress={() => handleTopicSelect(item.label)}
                disabled={isGenerating}
              >
                <Text style={styles.topicEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.topicLabel,
                    { color: textSecondary },
                    topic === item.label && { color: accent.orange, fontWeight: '500' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Card Count */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>Number of Cards</Text>
            <Text style={[styles.sliderValue, { color: accent.orange }]}>{cardCount}</Text>
          </View>
          <View style={styles.countButtons}>
            {[10, 15, 25, 50].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.countButton,
                  { backgroundColor: surface, borderColor: border },
                  cardCount === count && { backgroundColor: accent.orange, borderColor: accent.orange },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCardCount(count);
                }}
                disabled={isGenerating}
              >
                <Text
                  style={[
                    styles.countButtonText,
                    { color: textSecondary },
                    cardCount === count && { color: '#FFFFFF' },
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Difficulty Level</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.difficultyButton,
                  { backgroundColor: surface, borderColor: border },
                  difficulty === option.value && { backgroundColor: accent.orange, borderColor: accent.orange },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDifficulty(option.value as typeof difficulty);
                }}
                disabled={isGenerating}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    { color: textSecondary },
                    difficulty === option.value && { color: '#FFFFFF' },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy Setting */}
        <View style={styles.section}>
          <View style={[styles.privacySetting, { backgroundColor: surface }]}>
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
                Haptics.selectionAsync();
                setIsPublic(value);
              }}
              trackColor={{ false: surfaceHover, true: accent.green + '80' }}
              thumbColor={isPublic ? accent.green : surfaceHover}
              disabled={isGenerating}
            />
          </View>
        </View>

        {/* Generate Button */}
        <View style={styles.generateContainer}>
          {isGenerating ? (
            <Animated.View style={[styles.generatingContainer, { backgroundColor: surface }, pulseStyle]}>
              <View style={[styles.generatingIcon, { backgroundColor: accent.orange + '20' }]}>
                <Ionicons name="sparkles" size={32} color={accent.orange} />
              </View>
              <Text style={[styles.generatingTitle, { color: textPrimary }]}>Generating your flashcards...</Text>
              <Text style={[styles.generatingSubtitle, { color: textSecondary }]}>
                Our AI is creating {cardCount} cards about {topic}
              </Text>
            </Animated.View>
          ) : (
            <GradientButton
              title="Generate Flashcards"
              onPress={handleGenerate}
              variant="ai"
              size="lg"
              disabled={!topic.trim()}
              icon={<Ionicons name="sparkles" size={20} color="#FFFFFF" />}
            />
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: surfaceHover }]}>
          <Ionicons name="information-circle-outline" size={20} color={textSecondary} />
          <Text style={[styles.infoText, { color: textSecondary }]}>
            AI-generated cards use OpenAI to create high-quality flashcards. You can edit or add to the generated deck after creation.
          </Text>
        </View>

        <View style={{ height: spacing[20] }} />
      </ScrollView>
    </View>
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
    paddingVertical: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
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
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topicInput: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    fontSize: typography.sizes.lg,
    minHeight: 100,
    ...shadows.sm,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    marginBottom: spacing[2],
    borderWidth: 1,
  },
  topicEmoji: {
    fontSize: 16,
    marginRight: spacing[1],
  },
  topicLabel: {
    fontSize: typography.sizes.sm,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sliderValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  countButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  countButton: {
    flex: 1,
    paddingVertical: spacing[3],
    marginHorizontal: spacing[1],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  countButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  difficultyRow: {
    flexDirection: 'row',
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: spacing[3],
    marginHorizontal: spacing[1],
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  difficultyText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  privacySetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    ...shadows.sm,
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
  generateContainer: {
    marginBottom: spacing[6],
  },
  generatingContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    borderRadius: borderRadius['2xl'],
    ...shadows.md,
  },
  generatingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  generatingTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  generatingSubtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
    lineHeight: 20,
  },
  // Preview mode styles
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[6],
    gap: spacing[3],
  },
  successText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  previewInput: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: typography.sizes.base,
    borderWidth: 1,
  },
  previewMultilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  previewCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  previewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
  },
  cardNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNumberText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  previewCardActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCardContent: {
    padding: spacing[4],
    paddingTop: 0,
  },
  previewCardLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  previewCardText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  previewCardDivider: {
    height: 1,
    marginVertical: spacing[3],
  },
  saveButtonContainer: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModal: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[6],
    maxHeight: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  editModalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
  },
  editModalInput: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: typography.sizes.base,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[6],
  },
  editModalCancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  editModalCancelText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  editModalSaveBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  editModalSaveText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
});
