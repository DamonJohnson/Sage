import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

import { GradientButton } from '@/components/ui';
import { EditCardModal, type CardData } from '@/components/cards';
import { useDeckStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import { generateFromPDF, refineCards, type GeneratedCard } from '@/services/ai';

interface PreviewCard extends GeneratedCard {
  id: string;
}

const GENERATION_PHASES = [
  'Uploading PDF...',
  'Extracting text...',
  'Creating cards...',
  'Polishing results...',
];

const QUICK_INSTRUCTIONS = [
  { label: 'Key Definitions', instruction: 'Focus on key definitions and terminology' },
  { label: 'Main Concepts', instruction: 'Extract the main concepts and ideas' },
];

const REFINE_QUICK_OPTIONS = [
  { label: 'Simplify', instruction: 'Simplify all cards - use simpler language' },
  { label: 'Add examples', instruction: 'Add practical examples to all answers' },
  { label: 'More detail', instruction: 'Add more detail and context to all answers' },
  { label: 'Make harder', instruction: 'Make questions more challenging and specific' },
];

export function CreatePDFScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const existingDeckId = route.params?.deckId as string | undefined;
  const { addDeck, addCards, getDeck } = useDeckStore();
  const existingDeck = existingDeckId ? getDeck(existingDeckId) : null;
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();
  const responsiveInfo = useResponsive();

  // PDF state
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; webFile?: File } | null>(null);
  const [multipleChoiceRatio, setMultipleChoiceRatio] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState(0);

  // Custom instructions state
  const [customInstructions, setCustomInstructions] = useState('');

  // Preview mode state
  const [showPreview, setShowPreview] = useState(false);
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [editingCard, setEditingCard] = useState<PreviewCard | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Refine deck modal state
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineInstructions, setRefineInstructions] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Discard modal state
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Animation values
  const spinAnim = useSharedValue(0);

  // Generation phase cycling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      setGenerationPhase(0);
      interval = setInterval(() => {
        setGenerationPhase((prev) => (prev + 1) % GENERATION_PHASES.length);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  // Animation for generating state
  useEffect(() => {
    if (isGenerating) {
      spinAnim.value = withRepeat(
        withTiming(360, { duration: 1200 }),
        -1,
        false
      );
    } else {
      spinAnim.value = 0;
    }
  }, [isGenerating]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinAnim.value}deg` }],
  }));

  // Handle file selection using expo-document-picker (works on both web and native)
  const handleSelectFile = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (file) {
        // For web, fetch the file to get a File object for FormData
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const webFile = new File([blob], file.name, { type: 'application/pdf' });
            setSelectedFile({ name: file.name, uri: file.uri, webFile });
          } catch (e) {
            setSelectedFile({ name: file.name, uri: file.uri });
          }
        } else {
          setSelectedFile({ name: file.name, uri: file.uri });
        }
      }
    } catch (error) {
      console.error('PDF selection error:', error);
      Alert.alert('Error', 'Failed to select the PDF file.');
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const response = await generateFromPDF({
        fileUri: selectedFile.uri,
        fileName: selectedFile.name,
        mimeType: 'application/pdf',
        customInstructions: customInstructions.trim() || undefined,
        multipleChoiceRatio,
      }, selectedFile.webFile);

      if (response.success && response.data?.cards) {
        const cardsWithIds: PreviewCard[] = response.data.cards.map((card, index) => ({
          ...card,
          id: `preview-${index}-${Date.now()}`,
        }));

        setPreviewCards(cardsWithIds);
        // Only set deck title from filename if user hasn't entered one
        if (!deckTitle.trim()) {
          setDeckTitle(selectedFile.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
        }
        setDeckDescription(`Cards from ${selectedFile.name}`);
        setShowPreview(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to generate cards from PDF');
      }
    } catch (error) {
      console.error('Generation error:', error);
      Alert.alert('Error', 'Failed to generate cards. Please try again.');
    }

    setIsGenerating(false);
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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const cardsToAdd = previewCards.map((card) => ({
      front: card.front,
      back: card.back,
      cardType: card.cardType || 'flashcard',
      options: card.options || null,
      explanation: card.explanation || null,
    }));

    let targetDeckId = existingDeckId;

    if (!existingDeckId) {
      targetDeckId = await addDeck({
        userId: 'stub-user-1',
        title: deckTitle.trim(),
        description: deckDescription.trim(),
        isPublic: isPublic,
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
        setIsSaving(false);
        Alert.alert('Error', 'Failed to create deck. Please try again.');
        return;
      }
    }

    await addCards(targetDeckId!, cardsToAdd);

    setIsSaving(false);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    navigation.navigate('DeckDetail', { deckId: targetDeckId });
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

  const handleBackToEdit = () => {
    setShowDiscardModal(true);
  };

  const confirmDiscard = () => {
    setShowDiscardModal(false);
    setShowPreview(false);
    setPreviewCards([]);
  };

  const handleRefineDeck = async (instructions: string) => {
    if (!instructions.trim() || previewCards.length === 0) return;

    setIsRefining(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const response = await refineCards({
        cards: previewCards.map(c => ({ front: c.front, back: c.back })),
        instructions: instructions.trim(),
      });

      if (response.success && response.data?.cards) {
        const refinedCardsWithIds: PreviewCard[] = response.data.cards.map((card, index) => ({
          ...card,
          id: previewCards[index]?.id || `refined-${index}-${Date.now()}`,
        }));
        setPreviewCards(refinedCardsWithIds);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Error', response.error || 'Failed to refine cards');
      }
    } catch (error) {
      console.error('Refine error:', error);
      Alert.alert('Error', 'Failed to refine cards. Please try again.');
    }

    setIsRefining(false);
    setShowRefineModal(false);
    setRefineInstructions('');
  };

  const handleQuickInstruction = (instruction: string) => {
    setCustomInstructions(instruction);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
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

          {/* Refine with AI Button */}
          <TouchableOpacity
            style={[styles.refineButton, { backgroundColor: accent.purple + '15', borderColor: accent.purple }]}
            onPress={() => setShowRefineModal(true)}
            disabled={isRefining}
          >
            <Ionicons name="sparkles" size={18} color={accent.purple} />
            <Text style={[styles.refineButtonText, { color: accent.purple }]}>
              Refine with AI
            </Text>
          </TouchableOpacity>

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
                  {card.cardType === 'multiple_choice' && (
                    <View style={[styles.cardTypeBadge, { backgroundColor: accent.blue + '20' }]}>
                      <Ionicons name="list-outline" size={12} color={accent.blue} />
                      <Text style={[styles.cardTypeBadgeText, { color: accent.blue }]}>Multiple Choice</Text>
                    </View>
                  )}
                  <Text style={[styles.previewCardLabel, { color: textSecondary }]}>Question</Text>
                  <Text style={[styles.previewCardText, { color: textPrimary }]}>{card.front}</Text>
                  <View style={[styles.previewCardDivider, { backgroundColor: border }]} />
                  <Text style={[styles.previewCardLabel, { color: textSecondary }]}>Answer</Text>
                  <Text style={[styles.previewCardText, { color: textPrimary }]}>{card.back}</Text>
                </View>
              </View>
            ))}
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

        {/* Refine Deck Modal */}
        <Modal
          visible={showRefineModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRefineModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModal, { backgroundColor: surface }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: textPrimary }]}>Refine Deck with AI</Text>
                <TouchableOpacity onPress={() => setShowRefineModal(false)}>
                  <Ionicons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalDescription, { color: textSecondary }]}>
                Modify all {previewCards.length} cards based on your instructions
              </Text>

              <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: spacing[4] }]}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {REFINE_QUICK_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    style={[styles.quickActionChip, { backgroundColor: surfaceHover, borderColor: border }]}
                    onPress={() => handleRefineDeck(option.instruction)}
                    disabled={isRefining}
                  >
                    <Text style={[styles.quickActionText, { color: textPrimary }]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: spacing[4] }]}>
                Custom Instructions
              </Text>
              <TextInput
                style={[styles.editModalInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                value={refineInstructions}
                onChangeText={setRefineInstructions}
                placeholder="e.g., Add more examples to answers..."
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
              />

              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editModalCancelBtn, { borderColor: border }]}
                  onPress={() => setShowRefineModal(false)}
                >
                  <Text style={[styles.editModalCancelText, { color: textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalSaveBtn, { backgroundColor: accent.purple, opacity: isRefining || !refineInstructions.trim() ? 0.5 : 1 }]}
                  onPress={() => handleRefineDeck(refineInstructions)}
                  disabled={isRefining || !refineInstructions.trim()}
                >
                  {isRefining ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#fff" />
                      <Text style={styles.editModalSaveText}>Refine Cards</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Discard Confirmation Modal */}
        <Modal
          visible={showDiscardModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDiscardModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.discardModal, { backgroundColor: surface }]}>
              <View style={styles.discardModalIcon}>
                <Ionicons name="warning-outline" size={40} color={accent.orange} />
              </View>
              <Text style={[styles.discardModalTitle, { color: textPrimary }]}>Discard Changes?</Text>
              <Text style={[styles.discardModalText, { color: textSecondary }]}>
                Going back will discard all {previewCards.length} generated cards. This action cannot be undone.
              </Text>
              <View style={styles.discardModalButtons}>
                <TouchableOpacity
                  style={[styles.discardCancelBtn, { borderColor: border }]}
                  onPress={() => setShowDiscardModal(false)}
                >
                  <Text style={[styles.discardCancelText, { color: textSecondary }]}>Keep Editing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.discardConfirmBtn, { backgroundColor: accent.red }]}
                  onPress={confirmDiscard}
                >
                  <Text style={styles.discardConfirmText}>Discard</Text>
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {existingDeck ? `Add to: ${existingDeck.title}` : 'Create Deck from PDF'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* PDF Upload Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Upload your PDF</Text>
          <TouchableOpacity
            style={[
              styles.uploadZone,
              { backgroundColor: surface, borderColor: selectedFile ? accent.orange : border },
              Platform.OS === 'web' && { cursor: isGenerating ? 'not-allowed' : 'pointer' } as any,
            ]}
            onPress={handleSelectFile}
            activeOpacity={0.7}
            disabled={isGenerating}
          >
            <View style={styles.uploadZoneContent}>
              {selectedFile ? (
                <>
                  <View style={[styles.uploadIcon, { backgroundColor: accent.green + '20' }]}>
                    <Ionicons name="document-text" size={32} color={accent.green} />
                  </View>
                  <Text style={[styles.uploadFileName, { color: textPrimary }]}>{selectedFile.name}</Text>
                  <Text style={[styles.uploadDescription, { color: textSecondary }]}>
                    {Platform.OS === 'web' ? 'Click' : 'Tap'} to change file
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.uploadIcon, { backgroundColor: accent.orange + '20' }]}>
                    <Ionicons name="cloud-upload-outline" size={32} color={accent.orange} />
                  </View>
                  <Text style={[styles.uploadTitle, { color: textPrimary }]}>
                    Select PDF File
                  </Text>
                  <Text style={[styles.uploadDescription, { color: textSecondary }]}>
                    We'll extract key concepts and create cards
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Deck Name */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Deck Name</Text>
          <TextInput
            style={[styles.deckNameInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
            value={deckTitle}
            onChangeText={setDeckTitle}
            placeholder={selectedFile ? selectedFile.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') : 'Enter deck name'}
            placeholderTextColor={textSecondary}
            editable={!isGenerating}
          />
        </View>

        {/* AI Info Card */}
        <View style={[styles.aiInfoCard, { backgroundColor: accent.purple + '10', borderColor: accent.purple + '30' }]}>
          <View style={styles.aiInfoHeader}>
            <Ionicons name="sparkles" size={18} color={accent.purple} />
            <Text style={[styles.aiInfoTitle, { color: textPrimary }]}>Smart Card Generation</Text>
          </View>
          <Text style={[styles.aiInfoText, { color: textSecondary }]}>
            Card count and difficulty are automatically optimised based on your PDF content.
          </Text>
          <View style={[styles.aiInfoDivider, { backgroundColor: accent.purple + '20' }]} />
          <Text style={[styles.aiInfoTip, { color: textSecondary }]}>
            To generate more cards: use "Refine with AI", or add cards to the deck with any of our card creation methods.
          </Text>
        </View>

        {/* Card Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Card Type</Text>
          <View style={styles.cardTypeGrid}>
            <TouchableOpacity
              style={[
                styles.cardTypeOption,
                { backgroundColor: surface, borderColor: border },
                multipleChoiceRatio === 0 && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setMultipleChoiceRatio(0);
              }}
              disabled={isGenerating}
            >
              <Ionicons
                name="documents-outline"
                size={20}
                color={multipleChoiceRatio === 0 ? accent.orange : textSecondary}
              />
              <Text
                style={[
                  styles.cardTypeOptionText,
                  { color: textSecondary },
                  multipleChoiceRatio === 0 && { color: accent.orange },
                ]}
              >
                Flashcards Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cardTypeOption,
                { backgroundColor: surface, borderColor: border },
                multipleChoiceRatio === 0.5 && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setMultipleChoiceRatio(0.5);
              }}
              disabled={isGenerating}
            >
              <Ionicons
                name="grid-outline"
                size={20}
                color={multipleChoiceRatio === 0.5 ? accent.orange : textSecondary}
              />
              <Text
                style={[
                  styles.cardTypeOptionText,
                  { color: textSecondary },
                  multipleChoiceRatio === 0.5 && { color: accent.orange },
                ]}
              >
                Mixed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.cardTypeOption,
                { backgroundColor: surface, borderColor: border },
                multipleChoiceRatio === 1 && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setMultipleChoiceRatio(1);
              }}
              disabled={isGenerating}
            >
              <Ionicons
                name="list-outline"
                size={20}
                color={multipleChoiceRatio === 1 ? accent.orange : textSecondary}
              />
              <Text
                style={[
                  styles.cardTypeOptionText,
                  { color: textSecondary },
                  multipleChoiceRatio === 1 && { color: accent.orange },
                ]}
              >
                Multiple Choice
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Instructions */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Custom Instructions (optional)</Text>
          <TextInput
            style={[styles.customInstructionsInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
            value={customInstructions}
            onChangeText={setCustomInstructions}
            placeholder="e.g., Focus on key terms, include examples..."
            placeholderTextColor={textSecondary}
            multiline
            numberOfLines={2}
            maxLength={500}
            editable={!isGenerating}
          />
          <View style={styles.quickInstructionsRow}>
            {QUICK_INSTRUCTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickInstructionChip, { backgroundColor: surfaceHover, borderColor: border }]}
                onPress={() => handleQuickInstruction(item.instruction)}
                disabled={isGenerating}
              >
                <Text style={[styles.quickInstructionText, { color: textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy Setting */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!isGenerating) {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setIsPublic(!isPublic);
              }
            }}
            style={[styles.privacySetting, { backgroundColor: surface }]}
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
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setIsPublic(value);
              }}
              trackColor={{ false: surfaceHover, true: accent.green + '80' }}
              thumbColor={isPublic ? accent.green : surfaceHover}
              disabled={isGenerating}
            />
          </TouchableOpacity>
        </View>

        {/* Generate Button */}
        <View style={styles.generateContainer}>
          {isGenerating ? (
            <View style={[styles.generatingButton, { backgroundColor: accent.purple }]}>
              <View style={styles.spinnerWrapper}>
                <Animated.View style={[styles.spinnerSmall, spinStyle]}>
                  <View style={[styles.spinnerRingSmall, { borderColor: '#fff' }]} />
                </Animated.View>
              </View>
              <View style={styles.generatingTextWrapper}>
                <Text style={styles.generatingButtonText}>
                  {GENERATION_PHASES[generationPhase]}
                </Text>
              </View>
            </View>
          ) : (
            <GradientButton
              title="Generate Cards"
              onPress={handleGenerate}
              variant="ai"
              size="lg"
              disabled={!selectedFile}
              icon={<Ionicons name="sparkles" size={20} color="#FFFFFF" />}
            />
          )}
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
  // Upload zone
  uploadZone: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  uploadZoneContent: {
    padding: spacing[6],
    alignItems: 'center',
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  uploadTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  uploadFileName: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  uploadDescription: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  // Deck name input
  deckNameInput: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: typography.sizes.base,
    borderWidth: 1,
  },
  // AI info card
  aiInfoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
  },
  aiInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  aiInfoTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  aiInfoText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  aiInfoDivider: {
    height: 1,
    marginVertical: spacing[3],
  },
  aiInfoTip: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  // Card type
  cardTypeGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  cardTypeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[1.5],
  },
  cardTypeOptionText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Custom instructions
  customInstructionsInput: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.sizes.sm,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  quickInstructionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  quickInstructionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  quickInstructionText: {
    fontSize: typography.sizes.sm,
  },
  // Privacy setting
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
  // Generate button
  generateContainer: {
    marginBottom: spacing[6],
  },
  generatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
  },
  spinnerWrapper: {
    width: 24,
    marginRight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatingTextWrapper: {
    minWidth: 150,
  },
  generatingButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  spinnerSmall: {
    width: 20,
    height: 20,
  },
  spinnerRingSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  // Preview styles
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
  cardTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
    gap: spacing[1],
  },
  cardTypeBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  saveButtonContainer: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  refineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[6],
  },
  refineButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  editModal: {
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    maxHeight: '90%',
    width: '100%',
    maxWidth: 500,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  editModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  editModalInput: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  editModalCancelBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  editModalCancelText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  editModalSaveBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  editModalSaveText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[2],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  quickActionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  // Discard modal
  discardModal: {
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    maxWidth: 340,
    width: '100%',
    alignItems: 'center',
  },
  discardModalIcon: {
    marginBottom: spacing[4],
  },
  discardModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  discardModalText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[6],
  },
  discardModalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
  discardCancelBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  discardCancelText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  discardConfirmBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  discardConfirmText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});
