import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { GradientButton, ProgressBar } from '@/components/ui';
import { useDeckStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius } from '@/theme';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Card, CardType } from '@sage/shared';

type EditingCard = {
  id: string;
  front: string;
  back: string;
  cardType: CardType;
  options: string[] | null;
} | null;

export function DeckDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'DeckDetail'>['route']>();
  const { deckId } = route.params;
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const { getDeck, getCards, updateDeck, deleteDeck, addCard, updateCard, deleteCard } = useDeckStore();
  const deck = getDeck(deckId);
  const cards = getCards(deckId);

  // Check if this is a saved/cloned deck from another user
  // Note: Decks in the user's library are always "owned" by them (backend filters by user_id)
  // The distinction is between decks they created vs decks they saved from public
  const isClonedDeck = Boolean(deck?.originalAuthorId && deck?.originalAuthorName);

  const [searchQuery, setSearchQuery] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditDeckModal, setShowEditDeckModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<EditingCard>(null);
  const [deckTitle, setDeckTitle] = useState(deck?.title || '');
  const [deckDescription, setDeckDescription] = useState(deck?.description || '');
  const [deckIsPublic, setDeckIsPublic] = useState(deck?.isPublic || false);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardType, setCardType] = useState<CardType>('flashcard');
  const [cardOptions, setCardOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);

  const containerMaxWidth = isDesktop ? 900 : isTablet ? 700 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  if (!deck) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: background }]}>
        <Text style={{ color: textPrimary }}>Deck not found</Text>
      </View>
    );
  }

  const filteredCards = cards.filter((card) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!card.front.toLowerCase().includes(query) && !card.back.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const masteryPercentage = deck.cardCount > 0
    ? Math.round((deck.masteredCount / deck.cardCount) * 100)
    : 0;

  const handleStartStudy = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate('Study', { deckId });
  };

  const handleEditDeck = () => {
    setShowOptionsMenu(false);
    // Make sure card modal is closed
    setShowCardModal(false);
    setEditingCard(null);
    // Set up deck edit
    setDeckTitle(deck.title);
    setDeckDescription(deck.description);
    setDeckIsPublic(deck.isPublic);
    setShowEditDeckModal(true);
  };

  const handleSaveDeck = async () => {
    if (!deckTitle.trim()) {
      Alert.alert('Error', 'Deck title is required');
      return;
    }
    const success = await updateDeck(deckId, {
      title: deckTitle.trim(),
      description: deckDescription.trim(),
      isPublic: deckIsPublic,
    });
    if (success) {
      setShowEditDeckModal(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      Alert.alert('Error', 'Failed to update deck. Please try again.');
    }
  };

  const handleDeleteDeck = () => {
    setShowOptionsMenu(false);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteDeck = async () => {
    setIsDeleting(true);
    const success = await deleteDeck(deckId);
    setIsDeleting(false);

    if (success) {
      setShowDeleteConfirmModal(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to delete deck. Please try again.');
    }
  };

  const handleAddCard = () => {
    setEditingCard(null);
    setCardFront('');
    setCardBack('');
    setCardType('flashcard');
    setCardOptions(['', '', '', '']);
    setCorrectOptionIndex(null);
    setShowCardModal(true);
  };

  const handleEditCard = (card: Card) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setEditingCard({
      id: card.id,
      front: card.front,
      back: card.back,
      cardType: card.cardType,
      options: card.options,
    });
    setCardFront(card.front);
    setCardBack(card.back);
    setCardType(card.cardType);

    // For multiple choice, load options and find the correct answer index
    if (card.cardType === 'multiple_choice' && card.options) {
      setCardOptions(card.options.length >= 4 ? card.options : [...card.options, ...Array(4 - card.options.length).fill('')]);
      const correctIdx = card.options.findIndex(opt => opt === card.back);
      setCorrectOptionIndex(correctIdx >= 0 ? correctIdx : null);
    } else {
      setCardOptions(['', '', '', '']);
      setCorrectOptionIndex(null);
    }

    setShowCardModal(true);
  };

  const handleSaveCard = async () => {
    if (!cardFront.trim()) {
      Alert.alert('Error', 'The front of the card is required');
      return;
    }

    // Use editingCard's type as source of truth when editing
    const effectiveCardType = editingCard?.cardType ?? cardType;

    // Validate based on card type
    if (effectiveCardType === 'multiple_choice') {
      const filledOptions = cardOptions.filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        Alert.alert('Error', 'Multiple choice cards need at least 2 options');
        return;
      }
      if (correctOptionIndex === null || !cardOptions[correctOptionIndex]?.trim()) {
        Alert.alert('Error', 'Please select a correct answer');
        return;
      }
    } else {
      if (!cardBack.trim()) {
        Alert.alert('Error', 'The back of the card is required');
        return;
      }
    }

    // Build card data
    const filledOptions = effectiveCardType === 'multiple_choice'
      ? cardOptions.filter(opt => opt.trim())
      : null;

    const back = effectiveCardType === 'multiple_choice' && correctOptionIndex !== null
      ? cardOptions[correctOptionIndex].trim()
      : cardBack.trim();

    let success: boolean;
    if (editingCard) {
      success = await updateCard(deckId, editingCard.id, {
        front: cardFront.trim(),
        back,
        cardType: effectiveCardType,
        options: filledOptions,
      });
    } else {
      success = await addCard(deckId, {
        deckId,
        front: cardFront.trim(),
        back,
        cardType: effectiveCardType,
        options: filledOptions,
      });
    }

    if (success) {
      setShowCardModal(false);
      setEditingCard(null);
      setCardFront('');
      setCardBack('');
      setCardType('flashcard');
      setCardOptions(['', '', '', '']);
      setCorrectOptionIndex(null);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      Alert.alert('Error', `Failed to ${editingCard ? 'update' : 'add'} card. Please try again.`);
    }
  };

  const handleDeleteCard = () => {
    if (!editingCard) return;

    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteCard(deckId, editingCard.id);
            if (success) {
              setShowCardModal(false);
              setEditingCard(null);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } else {
              Alert.alert('Error', 'Failed to delete card. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item, index }: { item: Card; index: number }) => (
    <TouchableOpacity
      style={[styles.cardItem, { backgroundColor: surface, borderColor: border }]}
      activeOpacity={0.7}
      onPress={() => handleEditCard(item)}
    >
      <View style={[styles.cardNumber, { backgroundColor: surfaceHover }]}>
        <Text style={[styles.cardNumberText, { color: textSecondary }]}>{index + 1}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardFront, { color: textPrimary }]} numberOfLines={2}>
          {item.front}
        </Text>
        <Text style={[styles.cardBack, { color: textSecondary }]} numberOfLines={2}>
          {item.back}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: isMobile ? insets.top : 0 }]}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
          paddingHorizontal: contentPadding,
        }
      ]}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: surface }]}
          onPress={() => setShowOptionsMenu(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          }
        ]}
      >
        {/* Deck Info */}
        <View style={styles.deckInfo}>
          <Text style={[styles.deckTitle, { color: textPrimary }]}>{deck.title}</Text>
          {deck.description && (
            <Text style={[styles.deckDescription, { color: textSecondary }]}>{deck.description}</Text>
          )}

          {/* Tags */}
          {deck.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {deck.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: accent.orange + '20' }]}>
                  <Text style={[styles.tagText, { color: accent.orange }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Privacy Toggle - only show for user-created decks (not saved public decks) */}
          {!isClonedDeck && (
            <View style={[styles.privacyToggleRow, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.privacyToggleInfo}>
                <Ionicons
                  name={deck.isPublic ? 'globe-outline' : 'lock-closed-outline'}
                  size={20}
                  color={deck.isPublic ? accent.green : textSecondary}
                />
                <View style={styles.privacyToggleText}>
                  <Text style={[styles.privacyToggleLabel, { color: textPrimary }]}>
                    {deck.isPublic ? 'Public Deck' : 'Private Deck'}
                  </Text>
                  <Text style={[styles.privacyToggleHint, { color: textSecondary }]}>
                    {deck.isPublic ? 'Visible in Discover section' : 'Only you can see this deck'}
                  </Text>
                </View>
              </View>
              <Switch
                value={deck.isPublic}
                onValueChange={async (value) => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  const success = await updateDeck(deckId, { isPublic: value });
                  if (!success) {
                    Alert.alert('Error', 'Failed to update privacy setting. Please try again.');
                  }
                }}
                trackColor={{ false: border, true: accent.green + '60' }}
                thumbColor={deck.isPublic ? accent.green : surfaceHover}
              />
            </View>
          )}

          {/* Progress Card */}
          <View style={[styles.progressCard, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: textPrimary }]}>Progress</Text>
              <Text style={[styles.progressPercent, { color: accent.orange }]}>{masteryPercentage}%</Text>
            </View>
            <ProgressBar value={masteryPercentage} height="md" />

            <View style={[styles.statsGrid, { borderTopColor: border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accent.green }]}>
                  {deck.masteredCount}
                </Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Mastered</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accent.orange }]}>
                  {deck.learningCount}
                </Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Learning</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accent.red }]}>
                  {deck.newCount}
                </Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>New</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accent.orange }]}>
                  {deck.dueCount}
                </Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Due</Text>
              </View>
            </View>
          </View>

          {/* Study Button */}
          <GradientButton
            title={deck.dueCount > 0 ? `Study ${deck.dueCount} Due Cards` : 'Study All Cards'}
            onPress={handleStartStudy}
            size="lg"
            icon={<Ionicons name="play" size={20} color="#fff" />}
            style={{ marginTop: spacing[4] }}
          />
        </View>

        {/* Cards Section */}
        <View style={styles.cardsSection}>
          <View style={styles.cardsSectionHeader}>
            <Text style={[styles.cardsSectionTitle, { color: textPrimary }]}>
              Cards ({deck.cardCount})
            </Text>
            <TouchableOpacity onPress={handleAddCard}>
              <Ionicons name="add-circle-outline" size={24} color={accent.orange} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: surface, borderColor: border }]}>
            <Ionicons name="search" size={18} color={textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary }]}
              placeholder="Search cards..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Card List */}
          {filteredCards.map((card, index) => (
            <View key={card.id}>
              {renderCard({ item: card, index })}
            </View>
          ))}

          {filteredCards.length === 0 && (
            <View style={styles.emptyCards}>
              <Ionicons name="documents-outline" size={48} color={textSecondary} />
              <Text style={[styles.emptyCardsText, { color: textSecondary }]}>
                {searchQuery ? 'No cards match your search' : 'No cards in this deck'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={[styles.addFirstCard, { backgroundColor: accent.orange }]}
                  onPress={handleAddCard}
                >
                  <Text style={styles.addFirstCardText}>Add Your First Card</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={[styles.optionsMenu, { backgroundColor: surface }]}>
            {!isClonedDeck && (
              <>
                <TouchableOpacity style={styles.optionItem} onPress={handleEditDeck}>
                  <Ionicons name="create-outline" size={20} color={textPrimary} />
                  <Text style={[styles.optionText, { color: textPrimary }]}>Edit Title & Description</Text>
                </TouchableOpacity>
                <View style={[styles.optionDivider, { backgroundColor: border }]} />
                <TouchableOpacity style={styles.optionItem} onPress={handleDeleteDeck}>
                  <Ionicons name="trash-outline" size={20} color={accent.red} />
                  <Text style={[styles.optionText, { color: accent.red }]}>Delete Deck</Text>
                </TouchableOpacity>
              </>
            )}
            {isClonedDeck && (
              <>
                <View style={styles.optionItem}>
                  <Ionicons name="bookmark" size={20} color={accent.blue} />
                  <Text style={[styles.optionText, { color: textPrimary }]}>Saved from {deck.originalAuthorName}</Text>
                </View>
                <View style={[styles.optionDivider, { backgroundColor: border }]} />
                <TouchableOpacity style={styles.optionItem} onPress={handleDeleteDeck}>
                  <Ionicons name="bookmark-outline" size={20} color={accent.red} />
                  <Text style={[styles.optionText, { color: accent.red }]}>Remove from Library</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteConfirmModal, { backgroundColor: surface }]}>
            {/* Warning Icon */}
            <View style={[styles.deleteIconContainer, { backgroundColor: isClonedDeck ? accent.blue + '15' : accent.red + '15' }]}>
              <Ionicons
                name={isClonedDeck ? 'bookmark-outline' : 'warning'}
                size={40}
                color={isClonedDeck ? accent.blue : accent.red}
              />
            </View>

            <Text style={[styles.deleteConfirmTitle, { color: textPrimary }]}>
              {isClonedDeck ? 'Remove from Library?' : 'Delete Deck?'}
            </Text>
            <Text style={[styles.deleteConfirmMessage, { color: textSecondary }]}>
              {isClonedDeck
                ? `Remove "${deck.title}" from your library? You can save it again from the public decks. Your study progress will be lost.`
                : `Are you sure you want to delete "${deck.title}"? This will permanently remove all ${deck.cardCount} cards. This action cannot be undone.`
              }
            </Text>

            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.cancelButton, { borderColor: border }]}
                onPress={() => setShowDeleteConfirmModal(false)}
                disabled={isDeleting}
              >
                <Text style={[styles.cancelButtonText, { color: textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.confirmDeleteButton, { backgroundColor: isClonedDeck ? accent.blue : accent.red }]}
                onPress={confirmDeleteDeck}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Text style={styles.confirmDeleteButtonText}>{isClonedDeck ? 'Removing...' : 'Deleting...'}</Text>
                ) : (
                  <>
                    <Ionicons name={isClonedDeck ? 'bookmark-outline' : 'trash-outline'} size={18} color="#FFFFFF" />
                    <Text style={styles.confirmDeleteButtonText}>{isClonedDeck ? 'Remove' : 'Delete'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Deck Modal */}
      <Modal
        visible={showEditDeckModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditDeckModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Edit Deck Info</Text>
              <TouchableOpacity onPress={() => setShowEditDeckModal(false)}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: textSecondary }]}>Title</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
              value={deckTitle}
              onChangeText={setDeckTitle}
              placeholder="Deck title"
              placeholderTextColor={textSecondary}
            />

            <Text style={[styles.inputLabel, { color: textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.multilineInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
              value={deckDescription}
              onChangeText={setDeckDescription}
              placeholder="Deck description (optional)"
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={3}
            />

            {/* Privacy Setting */}
            <View style={[styles.privacySetting, { backgroundColor: background, borderColor: border }]}>
              <View style={styles.privacyInfo}>
                <Ionicons
                  name={deckIsPublic ? 'globe-outline' : 'lock-closed-outline'}
                  size={20}
                  color={deckIsPublic ? accent.green : textSecondary}
                />
                <View style={styles.privacyTextContainer}>
                  <Text style={[styles.privacyTitle, { color: textPrimary }]}>
                    {deckIsPublic ? 'Public Deck' : 'Private Deck'}
                  </Text>
                  <Text style={[styles.privacyDescription, { color: textSecondary }]}>
                    {deckIsPublic
                      ? 'Anyone can find and import this deck'
                      : 'Only you can see this deck'}
                  </Text>
                </View>
              </View>
              <Switch
                value={deckIsPublic}
                onValueChange={setDeckIsPublic}
                trackColor={{ false: surfaceHover, true: accent.green + '80' }}
                thumbColor={deckIsPublic ? accent.green : surfaceHover}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accent.orange }]}
              onPress={handleSaveDeck}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Card Edit/Add Modal */}
      <Modal
        visible={showCardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCardModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ScrollView style={[styles.modalContent, { backgroundColor: surface }]} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {editingCard ? 'Edit Card' : 'Add Card'}
              </Text>
              <TouchableOpacity onPress={() => setShowCardModal(false)}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Card Type Toggle */}
            {(() => {
              // Use editingCard's type as source of truth when editing
              const effectiveCardType = editingCard?.cardType ?? cardType;
              const isFlashcard = effectiveCardType === 'flashcard';
              const isMultiChoice = effectiveCardType === 'multiple_choice';

              return (
                <View style={styles.cardTypeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.cardTypeButton,
                      { borderColor: border },
                      isFlashcard && { backgroundColor: accent.orange + '20', borderColor: accent.orange },
                    ]}
                    onPress={() => {
                      setCardType('flashcard');
                      if (editingCard) {
                        setEditingCard({ ...editingCard, cardType: 'flashcard' });
                      }
                    }}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={isFlashcard ? accent.orange : textSecondary}
                    />
                    <Text
                      style={[
                        styles.cardTypeText,
                        { color: isFlashcard ? accent.orange : textSecondary },
                      ]}
                    >
                      Flashcard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.cardTypeButton,
                      { borderColor: border },
                      isMultiChoice && { backgroundColor: accent.purple + '20', borderColor: accent.purple },
                    ]}
                    onPress={() => {
                      setCardType('multiple_choice');
                      if (editingCard) {
                        setEditingCard({ ...editingCard, cardType: 'multiple_choice' });
                      }
                    }}
                  >
                    <Ionicons
                      name="list-outline"
                      size={16}
                      color={isMultiChoice ? accent.purple : textSecondary}
                    />
                    <Text
                      style={[
                        styles.cardTypeText,
                        { color: isMultiChoice ? accent.purple : textSecondary },
                      ]}
                    >
                      Multiple Choice
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            <Text style={[styles.inputLabel, { color: textSecondary }]}>Front (Question)</Text>
            <TextInput
              style={[styles.modalInput, styles.multilineInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
              value={cardFront}
              onChangeText={setCardFront}
              placeholder="Enter the question or term"
              placeholderTextColor={textSecondary}
              multiline
              numberOfLines={3}
            />

            {(() => {
              // Use editingCard's type as source of truth when editing
              const effectiveCardType = editingCard?.cardType ?? cardType;

              if (effectiveCardType === 'flashcard') {
                return (
                  <>
                    <Text style={[styles.inputLabel, { color: textSecondary, marginTop: spacing[4] }]}>Back (Answer)</Text>
                    <TextInput
                      style={[styles.modalInput, styles.multilineInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                      value={cardBack}
                      onChangeText={setCardBack}
                      placeholder="Enter the answer or definition"
                      placeholderTextColor={textSecondary}
                      multiline
                      numberOfLines={3}
                    />
                  </>
                );
              }

              // Multiple choice
              return (
                <>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>
                    Answer Options (min. 2) - Tap to select correct answer
                  </Text>
                  {cardOptions.map((option, idx) => {
                    const isSelected = correctOptionIndex === idx;
                    const hasText = option.trim().length > 0;
                    return (
                      <View key={idx} style={styles.optionRow}>
                        <TouchableOpacity
                          style={[
                            styles.optionBadge,
                            { backgroundColor: isSelected && hasText ? accent.green : surfaceHover },
                          ]}
                          onPress={() => hasText && setCorrectOptionIndex(idx)}
                          disabled={!hasText}
                        >
                          {isSelected && hasText ? (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          ) : (
                            <Text style={[styles.optionBadgeText, { color: textSecondary }]}>
                              {String.fromCharCode(65 + idx)}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.optionInput,
                            { backgroundColor: background, color: textPrimary, borderColor: border },
                            isSelected && hasText && { borderColor: accent.green },
                          ]}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          placeholderTextColor={textSecondary}
                          value={option}
                          onChangeText={(text) => {
                            const newOptions = [...cardOptions];
                            newOptions[idx] = text;
                            setCardOptions(newOptions);
                          }}
                        />
                      </View>
                    );
                  })}
                  {correctOptionIndex === null && (
                    <Text style={[styles.optionHint, { color: accent.orange }]}>
                      Tap the letter badge to mark the correct answer
                    </Text>
                  )}
                </>
              );
            })()}

            <View style={styles.cardModalButtons}>
              {editingCard && (
                <TouchableOpacity
                  style={[styles.deleteCardButton, { borderColor: accent.red }]}
                  onPress={handleDeleteCard}
                >
                  <Ionicons name="trash-outline" size={18} color={accent.red} />
                  <Text style={[styles.deleteCardButtonText, { color: accent.red }]}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: accent.orange, flex: editingCard ? 1 : undefined }]}
                onPress={handleSaveCard}
              >
                <Text style={styles.saveButtonText}>{editingCard ? 'Save' : 'Add Card'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: spacing[8] }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing[20],
  },
  deckInfo: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  deckTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[2],
  },
  deckDescription: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    marginBottom: spacing[3],
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[4],
  },
  tag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  tagText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  privacyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    marginBottom: spacing[4],
  },
  privacyToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyToggleText: {
    marginLeft: spacing[3],
    flex: 1,
  },
  privacyToggleLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  privacyToggleHint: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  progressCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  progressTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  progressPercent: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
  },
  cardsSection: {
    paddingHorizontal: spacing[4],
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  cardsSectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    marginLeft: spacing[2],
    paddingVertical: Platform.OS === 'ios' ? spacing[1] : 0,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
  },
  cardNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  cardNumberText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  cardContent: {
    flex: 1,
  },
  cardFront: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[1],
  },
  cardBack: {
    fontSize: typography.sizes.sm,
  },
  emptyCards: {
    alignItems: 'center',
    paddingVertical: spacing[10],
  },
  emptyCardsText: {
    fontSize: typography.sizes.base,
    marginTop: spacing[3],
  },
  addFirstCard: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
  },
  addFirstCardText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenu: {
    borderRadius: borderRadius.lg,
    padding: spacing[2],
    minWidth: 180,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  optionText: {
    fontSize: typography.sizes.base,
    marginLeft: spacing[3],
    fontWeight: typography.fontWeight.medium,
  },
  optionDivider: {
    height: 1,
    marginHorizontal: spacing[2],
  },
  deleteConfirmModal: {
    width: '90%',
    maxWidth: 340,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  deleteConfirmTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  deleteConfirmMessage: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
  deleteConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  confirmDeleteButton: {
    borderWidth: 0,
  },
  confirmDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing[5],
    paddingBottom: spacing[8],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
  },
  modalInput: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
    fontSize: typography.sizes.base,
    marginBottom: spacing[4],
    borderWidth: 1,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  cardModalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  deleteCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  deleteCardButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing[2],
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
    fontWeight: typography.fontWeight.medium,
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
    fontWeight: typography.fontWeight.semibold,
  },
  optionInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: typography.sizes.base,
    borderWidth: 1,
  },
  optionHint: {
    fontSize: typography.sizes.xs,
    fontStyle: 'italic',
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  privacySetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[4],
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
    fontWeight: typography.fontWeight.medium,
  },
  privacyDescription: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
});
