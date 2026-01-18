import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useDeckStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius } from '@/theme';

type ProcessingStep = 'idle' | 'uploading' | 'extracting' | 'generating' | 'complete';

interface ExtractedCard {
  front: string;
  back: string;
  selected: boolean;
}

export function CreatePDFScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();
  const { addDeck, addCards } = useDeckStore();

  const [step, setStep] = useState<ProcessingStep>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedCards, setExtractedCards] = useState<ExtractedCard[]>([]);
  const [deckTitle, setDeckTitle] = useState('');

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const handleSelectFile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Simulate file selection (in real app, use expo-document-picker)
    setFileName('study-notes.pdf');
    setStep('uploading');

    // Simulate processing
    setTimeout(() => setStep('extracting'), 1000);
    setTimeout(() => setStep('generating'), 2500);
    setTimeout(() => {
      // Mock extracted cards
      const mockCards: ExtractedCard[] = [
        { front: 'What is photosynthesis?', back: 'The process by which plants convert light energy into chemical energy, producing glucose and oxygen from carbon dioxide and water.', selected: true },
        { front: 'What is the mitochondria?', back: 'The powerhouse of the cell; organelles that generate most of the cell\'s ATP through oxidative phosphorylation.', selected: true },
        { front: 'Define osmosis', back: 'The movement of water molecules through a selectively permeable membrane from a region of lower solute concentration to higher concentration.', selected: true },
        { front: 'What is DNA replication?', back: 'The biological process of producing two identical copies of DNA from one original DNA molecule, occurring before cell division.', selected: true },
        { front: 'Explain cellular respiration', back: 'The metabolic process that converts glucose and oxygen into ATP, carbon dioxide, and water, releasing energy for cellular functions.', selected: true },
      ];
      setExtractedCards(mockCards);
      setDeckTitle('Biology Study Notes');
      setStep('complete');
    }, 4000);
  };

  const toggleCard = (index: number) => {
    Haptics.selectionAsync();
    setExtractedCards(prev => prev.map((card, i) =>
      i === index ? { ...card, selected: !card.selected } : card
    ));
  };

  const handleCreateDeck = async () => {
    const selectedCards = extractedCards.filter(c => c.selected);
    if (selectedCards.length === 0) {
      Alert.alert('No Cards Selected', 'Please select at least one card to create a deck.');
      return;
    }

    const deckId = await addDeck({
      userId: 'stub-user-1',
      title: deckTitle || 'Imported from PDF',
      description: `Extracted from ${fileName}`,
      isPublic: false,
      category: 'Education',
      tags: ['pdf-import'],
      cardCount: selectedCards.length,
      downloadCount: 0,
      ratingSum: 0,
      ratingCount: 0,
    });

    if (!deckId) {
      Alert.alert('Error', 'Failed to create deck. Please try again.');
      return;
    }

    const cardsToAdd = selectedCards.map(card => ({
      front: card.front,
      back: card.back,
      cardType: 'flashcard' as const,
      options: null,
    }));

    await addCards(deckId, cardsToAdd);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('DeckDetail', { deckId });
  };

  const renderUploadState = () => (
    <View style={styles.uploadContainer}>
      <TouchableOpacity
        style={[styles.uploadZone, { backgroundColor: surface, borderColor: border }]}
        onPress={handleSelectFile}
        activeOpacity={0.7}
      >
        <View style={[styles.uploadIcon, { backgroundColor: accent.orange + '20' }]}>
          <Ionicons name="document-text-outline" size={48} color={accent.orange} />
        </View>
        <Text style={[styles.uploadTitle, { color: textPrimary }]}>
          Upload a PDF Document
        </Text>
        <Text style={[styles.uploadDescription, { color: textSecondary }]}>
          We'll extract key concepts and create flashcards automatically
        </Text>
        <View style={[styles.uploadButton, { backgroundColor: accent.orange }]}>
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.uploadButtonText}>Select PDF File</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.tipsSection}>
        <Text style={[styles.tipsTitle, { color: textPrimary }]}>Tips for best results</Text>
        <View style={styles.tipsList}>
          <TipItem icon="checkmark-circle" text="Use PDFs with clear text formatting" textSecondary={textSecondary} accent={accent} />
          <TipItem icon="checkmark-circle" text="Study guides and notes work best" textSecondary={textSecondary} accent={accent} />
          <TipItem icon="checkmark-circle" text="Content with Q&A format is ideal" textSecondary={textSecondary} accent={accent} />
          <TipItem icon="close-circle" text="Avoid image-heavy documents" textSecondary={textSecondary} accent={accent} isNegative />
        </View>
      </View>
    </View>
  );

  const renderProcessingState = () => {
    const steps = [
      { key: 'uploading', label: 'Uploading PDF...', icon: 'cloud-upload' },
      { key: 'extracting', label: 'Extracting text...', icon: 'document-text' },
      { key: 'generating', label: 'Generating flashcards...', icon: 'sparkles' },
    ];

    const currentStepIndex = steps.findIndex(s => s.key === step);

    return (
      <View style={styles.processingContainer}>
        <View style={[styles.fileCard, { backgroundColor: surface, borderColor: border }]}>
          <Ionicons name="document-text" size={24} color={accent.orange} />
          <Text style={[styles.fileName, { color: textPrimary }]}>{fileName}</Text>
        </View>

        <View style={styles.stepsContainer}>
          {steps.map((s, index) => {
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;

            return (
              <View key={s.key} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepIcon,
                    {
                      backgroundColor: isComplete ? accent.green + '20' : isActive ? accent.orange + '20' : surfaceHover,
                    },
                  ]}
                >
                  {isComplete ? (
                    <Ionicons name="checkmark" size={20} color={accent.green} />
                  ) : isActive ? (
                    <ActivityIndicator size="small" color={accent.orange} />
                  ) : (
                    <Ionicons name={s.icon as any} size={20} color={textSecondary} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: isActive || isComplete ? textPrimary : textSecondary },
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCompleteState = () => {
    const selectedCount = extractedCards.filter(c => c.selected).length;

    return (
      <View style={styles.completeContainer}>
        <View style={[styles.successBanner, { backgroundColor: accent.green + '15' }]}>
          <Ionicons name="checkmark-circle" size={24} color={accent.green} />
          <Text style={[styles.successText, { color: accent.green }]}>
            {extractedCards.length} flashcards extracted!
          </Text>
        </View>

        <Text style={[styles.reviewTitle, { color: textPrimary }]}>
          Review and select cards
        </Text>
        <Text style={[styles.reviewSubtitle, { color: textSecondary }]}>
          Tap cards to include or exclude them from your deck
        </Text>

        <ScrollView style={styles.cardsScrollView} showsVerticalScrollIndicator={false}>
          {extractedCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.cardPreview,
                { backgroundColor: surface, borderColor: card.selected ? accent.orange : border },
              ]}
              onPress={() => toggleCard(index)}
              activeOpacity={0.7}
            >
              <View style={styles.cardCheckbox}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: card.selected ? accent.orange : 'transparent',
                      borderColor: card.selected ? accent.orange : textSecondary,
                    },
                  ]}
                >
                  {card.selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </View>
              <View style={styles.cardPreviewContent}>
                <Text style={[styles.cardFront, { color: textPrimary }]} numberOfLines={2}>
                  {card.front}
                </Text>
                <Text style={[styles.cardBack, { color: textSecondary }]} numberOfLines={2}>
                  {card.back}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: surface, borderTopColor: border }]}>
          <Text style={[styles.selectedCount, { color: textSecondary }]}>
            {selectedCount} of {extractedCards.length} selected
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: accent.orange }]}
            onPress={handleCreateDeck}
          >
            <Text style={styles.createButtonText}>Create Deck</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: isMobile ? insets.top + spacing[2] : spacing[4],
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>PDF to Flashcards</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View
        style={[
          styles.content,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          },
        ]}
      >
        {step === 'idle' && renderUploadState()}
        {(step === 'uploading' || step === 'extracting' || step === 'generating') && renderProcessingState()}
        {step === 'complete' && renderCompleteState()}
      </View>
    </View>
  );
}

function TipItem({
  icon,
  text,
  textSecondary,
  accent,
  isNegative = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  textSecondary: string;
  accent: any;
  isNegative?: boolean;
}) {
  return (
    <View style={styles.tipItem}>
      <Ionicons name={icon} size={18} color={isNegative ? accent.red : accent.green} />
      <Text style={[styles.tipText, { color: textSecondary }]}>{text}</Text>
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
    paddingVertical: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing[10],
  },
  uploadZone: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: spacing[8],
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  uploadTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  uploadDescription: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  tipsSection: {
    paddingHorizontal: spacing[2],
  },
  tipsTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[3],
  },
  tipsList: {
    gap: spacing[2],
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  tipText: {
    fontSize: typography.sizes.sm,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing[10],
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[8],
    gap: spacing[3],
  },
  fileName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  stepsContainer: {
    gap: spacing[4],
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  completeContainer: {
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  successText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  reviewTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  reviewSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[4],
  },
  cardsScrollView: {
    flex: 1,
  },
  cardPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  cardCheckbox: {
    marginRight: spacing[3],
    paddingTop: spacing[1],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPreviewContent: {
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
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderTopWidth: 1,
    marginHorizontal: -spacing[4],
    paddingHorizontal: spacing[4],
  },
  selectedCount: {
    fontSize: typography.sizes.sm,
  },
  createButton: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
