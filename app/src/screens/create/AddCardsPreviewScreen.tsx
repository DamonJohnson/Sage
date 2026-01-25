import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { GradientButton } from '@/components/ui';
import { EditCardModal, type CardData } from '@/components/cards';
import { useDeckStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import { generateFromConcept, type GeneratedCard } from '@/services/ai';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { RootStackScreenProps } from '@/navigation/types';

interface PreviewCard extends GeneratedCard {
  id: string;
}

export function AddCardsPreviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'AddCardsPreview'>['route']>();
  const {
    deckId,
    sourceQuestion,
    sourceAnswer,
    focusArea,
    cardCount,
    createNewDeck,
    deckTitle: initialDeckTitle,
  } = route.params;

  const { addDeck, addCards, getDeck } = useDeckStore();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent, colors } = useThemedColors();
  const { isDesktop, isTablet } = useResponsive();

  const [isGenerating, setIsGenerating] = useState(true);
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [editingCard, setEditingCard] = useState<PreviewCard | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState(initialDeckTitle || 'New Deck');
  const [error, setError] = useState<string | null>(null);

  const existingDeck = deckId ? getDeck(deckId) : null;
  const containerMaxWidth = isDesktop ? 600 : isTablet ? 500 : '100%';

  // Generate cards on mount
  useEffect(() => {
    generateCards();
  }, []);

  const generateCards = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await generateFromConcept({
        sourceQuestion,
        sourceAnswer,
        focusArea,
        count: cardCount,
      });

      if (response.success && response.data?.cards) {
        const cardsWithIds: PreviewCard[] = response.data.cards.map((card, index) => ({
          ...card,
          id: `preview-${index}-${Date.now()}`,
        }));
        setPreviewCards(cardsWithIds);
      } else {
        setError(response.error || 'Failed to generate cards');
      }
    } catch (err) {
      console.error('Error generating cards:', err);
      setError('An error occurred while generating cards');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditCard = (card: PreviewCard) => {
    setEditingCard(card);
  };

  const handleSaveCardEdit = (updatedCard: CardData) => {
    if (!editingCard) return;

    setPreviewCards((prev) =>
      prev.map((card) =>
        card.id === editingCard.id
          ? {
              ...card,
              front: updatedCard.front,
              back: updatedCard.back,
              cardType: updatedCard.cardType,
              options: updatedCard.options,
            }
          : card
      )
    );
    setEditingCard(null);
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
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (previewCards.length === 0) {
      Alert.alert('Error', 'No cards to save');
      return;
    }

    setIsSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      let targetDeckId = deckId;

      // Create new deck if needed
      if (createNewDeck || !targetDeckId) {
        targetDeckId = await addDeck({
          userId: 'stub-user-1',
          title: newDeckTitle.trim() || 'New Deck',
          description: `Cards about: ${focusArea}`,
          isPublic: false,
          cardCount: previewCards.length,
          downloadCount: 0,
          ratingSum: 0,
          ratingCount: 0,
          originalAuthorId: null,
          originalAuthorName: null,
          originalAuthorAvatar: null,
          originalDeckId: null,
        });

        if (!targetDeckId) {
          Alert.alert('Error', 'Failed to create deck');
          setIsSaving(false);
          return;
        }
      }

      // Add cards to deck
      const cardsToAdd = previewCards.map((card) => ({
        front: card.front,
        back: card.back,
        cardType: card.cardType || 'flashcard',
        options: card.options || null,
        explanation: card.explanation || null,
      }));

      await addCards(targetDeckId, cardsToAdd);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Navigate to deck detail
      navigation.navigate('DeckDetail', { deckId: targetDeckId });
    } catch (err) {
      console.error('Error saving cards:', err);
      Alert.alert('Error', 'Failed to save cards');
    } finally {
      setIsSaving(false);
    }
  };

  if (isGenerating) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={accent.purple} />
        <Text style={[styles.loadingText, { color: textPrimary }]}>Generating cards...</Text>
        <Text style={[styles.loadingSubtext, { color: textSecondary }]}>
          Creating {cardCount} card{cardCount !== 1 ? 's' : ''} about "{focusArea}"
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: background, paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={64} color={accent.red} />
        <Text style={[styles.errorTitle, { color: textPrimary }]}>Generation Failed</Text>
        <Text style={[styles.errorText, { color: textSecondary }]}>{error}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accent.purple }]}
            onPress={generateCards}
          >
            <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: spacing[2] }} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelButtonText, { color: textSecondary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {createNewDeck ? 'New Deck' : 'Add Cards'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { maxWidth: containerMaxWidth, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        <View style={[styles.successBanner, { backgroundColor: accent.green + '15' }]}>
          <Ionicons name="checkmark-circle" size={24} color={accent.green} />
          <Text style={[styles.successText, { color: accent.green }]}>
            {previewCards.length} card{previewCards.length !== 1 ? 's' : ''} generated! Review and edit before saving.
          </Text>
        </View>

        {/* Context */}
        <View style={[styles.contextCard, { backgroundColor: surface }]}>
          <Text style={[styles.contextLabel, { color: textSecondary }]}>Based on</Text>
          <Text style={[styles.contextText, { color: textPrimary }]} numberOfLines={2}>
            {sourceQuestion}
          </Text>
          <Text style={[styles.contextLabel, { color: textSecondary, marginTop: spacing[2] }]}>Focus area</Text>
          <Text style={[styles.contextText, { color: textPrimary }]}>{focusArea}</Text>
        </View>

        {/* New Deck Title (if creating new deck) */}
        {createNewDeck && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>Deck Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
              value={newDeckTitle}
              onChangeText={setNewDeckTitle}
              placeholder="Enter deck title"
              placeholderTextColor={textSecondary}
            />
          </View>
        )}

        {/* Destination Info */}
        {!createNewDeck && existingDeck && (
          <View style={[styles.destinationCard, { backgroundColor: surface }]}>
            <Ionicons name="folder-outline" size={20} color={accent.orange} />
            <Text style={[styles.destinationText, { color: textPrimary }]}>
              Adding to: <Text style={{ fontWeight: '600' }}>{existingDeck.title}</Text>
            </Text>
          </View>
        )}

        {/* Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>
            Cards ({previewCards.length})
          </Text>

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
                <Text style={[styles.previewCardLabel, { color: textSecondary }]}>Question</Text>
                <Text style={[styles.previewCardText, { color: textPrimary }]}>{card.front}</Text>
                <View style={[styles.previewCardDivider, { backgroundColor: border }]} />
                <Text style={[styles.previewCardLabel, { color: textSecondary }]}>Answer</Text>
                <Text style={[styles.previewCardText, { color: textPrimary }]}>{card.back}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <GradientButton
            title={isSaving ? 'Saving...' : `Save ${previewCards.length} Card${previewCards.length !== 1 ? 's' : ''}`}
            onPress={handleSave}
            size="lg"
            disabled={isSaving || previewCards.length === 0}
            icon={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
          />
        </View>

        <View style={{ height: spacing[20] }} />
      </ScrollView>

      {/* Edit Card Modal */}
      <EditCardModal
        visible={editingCard !== null}
        card={editingCard}
        onClose={() => setEditingCard(null)}
        onSave={handleSaveCardEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
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
  loadingText: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginTop: spacing[4],
  },
  loadingSubtext: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginTop: spacing[4],
  },
  errorText: {
    fontSize: typography.sizes.base,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[6],
  },
  retryButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  successText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  contextCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  contextLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  contextText: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.4,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  destinationText: {
    fontSize: typography.sizes.base,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: typography.sizes.base,
    borderWidth: 1,
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
  },
});
