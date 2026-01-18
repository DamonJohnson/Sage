import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
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

type ScreenStep = 'capture' | 'processing' | 'edit' | 'confirm';

interface ExtractedText {
  front: string;
  back: string;
}

export function CreateImageScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();
  const { addCard } = useDeckStore();

  const [step, setStep] = useState<ScreenStep>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<ExtractedText>({ front: '', back: '' });
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const handleCaptureImage = (source: 'camera' | 'gallery') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Simulate image capture (in real app, use expo-image-picker)
    setImageUri('https://via.placeholder.com/400x300/191919/F47A3A?text=Sample+Image');
    setStep('processing');

    // Simulate OCR processing
    setTimeout(() => {
      setExtractedText({
        front: 'What is the capital of France?',
        back: 'Paris is the capital and largest city of France, located on the Seine River.',
      });
      setStep('edit');
    }, 2000);
  };

  const handleSaveCard = () => {
    if (!extractedText.front.trim() || !extractedText.back.trim()) {
      Alert.alert('Error', 'Both front and back of the card are required');
      return;
    }

    // In real app, would prompt to select or create a deck
    // For now, just show confirmation
    setStep('confirm');
  };

  const handleConfirmSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Card Saved!',
      'Your flashcard has been created. Would you like to add another?',
      [
        {
          text: 'Done',
          onPress: () => navigation.goBack(),
        },
        {
          text: 'Add Another',
          onPress: () => {
            setStep('capture');
            setImageUri(null);
            setExtractedText({ front: '', back: '' });
          },
        },
      ]
    );
  };

  const renderCaptureStep = () => (
    <View style={styles.captureContainer}>
      <View style={[styles.previewArea, { backgroundColor: surface, borderColor: border }]}>
        <Ionicons name="image-outline" size={64} color={textSecondary} />
        <Text style={[styles.previewText, { color: textSecondary }]}>
          Take a photo or select from gallery
        </Text>
      </View>

      <View style={styles.captureButtons}>
        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: accent.orange }]}
          onPress={() => handleCaptureImage('camera')}
        >
          <Ionicons name="camera" size={28} color="#fff" />
          <Text style={styles.captureButtonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
          onPress={() => handleCaptureImage('gallery')}
        >
          <Ionicons name="images" size={28} color={accent.orange} />
          <Text style={[styles.captureButtonText, { color: textPrimary }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructionsSection}>
        <Text style={[styles.instructionsTitle, { color: textPrimary }]}>How it works</Text>
        <View style={styles.instructionsList}>
          <InstructionStep
            number="1"
            text="Capture an image of text, notes, or a textbook page"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            accent={accent}
          />
          <InstructionStep
            number="2"
            text="AI extracts the text and identifies key concepts"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            accent={accent}
          />
          <InstructionStep
            number="3"
            text="Review and edit the generated flashcard"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            accent={accent}
          />
          <InstructionStep
            number="4"
            text="Save to your deck and start studying!"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            accent={accent}
          />
        </View>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.processingContainer}>
      {imageUri && (
        <View style={[styles.imagePreview, { borderColor: border }]}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        </View>
      )}

      <View style={styles.processingStatus}>
        <ActivityIndicator size="large" color={accent.orange} />
        <Text style={[styles.processingText, { color: textPrimary }]}>
          Analyzing image...
        </Text>
        <Text style={[styles.processingSubtext, { color: textSecondary }]}>
          Extracting text and generating flashcard
        </Text>
      </View>
    </View>
  );

  const renderEditStep = () => (
    <ScrollView style={styles.editContainer} showsVerticalScrollIndicator={false}>
      {imageUri && (
        <View style={[styles.imagePreviewSmall, { borderColor: border }]}>
          <Image source={{ uri: imageUri }} style={styles.previewImageSmall} resizeMode="cover" />
          <TouchableOpacity
            style={[styles.retakeButton, { backgroundColor: surface }]}
            onPress={() => {
              setStep('capture');
              setImageUri(null);
            }}
          >
            <Ionicons name="refresh" size={16} color={textPrimary} />
            <Text style={[styles.retakeText, { color: textPrimary }]}>Retake</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.extractedBanner, { backgroundColor: accent.green + '15' }]}>
        <Ionicons name="sparkles" size={18} color={accent.green} />
        <Text style={[styles.extractedText, { color: accent.green }]}>
          Text extracted successfully
        </Text>
      </View>

      <View style={styles.cardEditor}>
        <Text style={[styles.editorLabel, { color: textSecondary }]}>Front (Question)</Text>
        <TextInput
          style={[
            styles.editorInput,
            styles.multilineInput,
            { backgroundColor: surface, color: textPrimary, borderColor: border },
          ]}
          value={extractedText.front}
          onChangeText={(text) => setExtractedText(prev => ({ ...prev, front: text }))}
          placeholder="Enter the question or term"
          placeholderTextColor={textSecondary}
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.editorLabel, { color: textSecondary }]}>Back (Answer)</Text>
        <TextInput
          style={[
            styles.editorInput,
            styles.multilineInput,
            { backgroundColor: surface, color: textPrimary, borderColor: border },
          ]}
          value={extractedText.back}
          onChangeText={(text) => setExtractedText(prev => ({ ...prev, back: text }))}
          placeholder="Enter the answer or definition"
          placeholderTextColor={textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.editActions}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: border }]}
          onPress={() => {
            setStep('capture');
            setImageUri(null);
            setExtractedText({ front: '', back: '' });
          }}
        >
          <Text style={[styles.secondaryButtonText, { color: textPrimary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: accent.orange }]}
          onPress={handleSaveCard}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Save Card</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );

  const renderConfirmStep = () => (
    <View style={styles.confirmContainer}>
      <View style={[styles.cardPreview, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.cardSide}>
          <Text style={[styles.cardSideLabel, { color: textSecondary }]}>FRONT</Text>
          <Text style={[styles.cardSideText, { color: textPrimary }]}>{extractedText.front}</Text>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: border }]} />
        <View style={styles.cardSide}>
          <Text style={[styles.cardSideLabel, { color: textSecondary }]}>BACK</Text>
          <Text style={[styles.cardSideText, { color: textPrimary }]}>{extractedText.back}</Text>
        </View>
      </View>

      <Text style={[styles.confirmTitle, { color: textPrimary }]}>
        Card looks good?
      </Text>
      <Text style={[styles.confirmSubtitle, { color: textSecondary }]}>
        This card will be added to your selected deck
      </Text>

      <View style={styles.confirmActions}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: border }]}
          onPress={() => setStep('edit')}
        >
          <Ionicons name="pencil" size={18} color={textPrimary} />
          <Text style={[styles.secondaryButtonText, { color: textPrimary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: accent.orange }]}
          onPress={handleConfirmSave}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Confirm & Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Image to Card</Text>
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
        {step === 'capture' && renderCaptureStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'edit' && renderEditStep()}
        {step === 'confirm' && renderConfirmStep()}
      </View>
    </View>
  );
}

function InstructionStep({
  number,
  text,
  textPrimary,
  textSecondary,
  accent,
}: {
  number: string;
  text: string;
  textPrimary: string;
  textSecondary: string;
  accent: any;
}) {
  return (
    <View style={styles.instructionItem}>
      <View style={[styles.instructionNumber, { backgroundColor: accent.orange + '20' }]}>
        <Text style={[styles.instructionNumberText, { color: accent.orange }]}>{number}</Text>
      </View>
      <Text style={[styles.instructionText, { color: textSecondary }]}>{text}</Text>
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
  captureContainer: {
    flex: 1,
  },
  previewArea: {
    height: 240,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  previewText: {
    fontSize: typography.sizes.base,
    marginTop: spacing[3],
  },
  captureButtons: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  captureButton: {
    flex: 1,
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing[2],
  },
  captureButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  instructionsSection: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[4],
  },
  instructionsList: {
    gap: spacing[3],
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionNumberText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.bold,
  },
  instructionText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '80%',
    height: 200,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing[6],
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  processingStatus: {
    alignItems: 'center',
    gap: spacing[3],
  },
  processingText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  processingSubtext: {
    fontSize: typography.sizes.sm,
  },
  editContainer: {
    flex: 1,
  },
  imagePreviewSmall: {
    height: 120,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing[4],
    position: 'relative',
  },
  previewImageSmall: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  retakeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
  },
  extractedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  extractedText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  cardEditor: {
    marginBottom: spacing[6],
  },
  editorLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
  },
  editorInput: {
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
  editActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing[2],
  },
  secondaryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  confirmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing[10],
  },
  cardPreview: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[5],
    marginBottom: spacing[6],
  },
  cardSide: {
    paddingVertical: spacing[3],
  },
  cardSideLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 1,
    marginBottom: spacing[2],
  },
  cardSideText: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  cardDivider: {
    height: 1,
  },
  confirmTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  confirmSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[6],
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
});
