import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Image,
  Switch,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { GradientButton } from '@/components/ui';
import { OcclusionEditor } from '@/components/create/OcclusionEditor';
import { useDeckStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { OcclusionShape, ImageOcclusionData, OcclusionRevealMode } from '@sage/shared';

// Image bounds within container (accounting for resizeMode: contain)
interface ImageBounds {
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
}

// Calculate actual rendered image bounds within a container using resizeMode: contain
function calculateImageBounds(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ImageBounds {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return { offsetX: 0, offsetY: 0, renderedWidth: containerWidth, renderedHeight: containerHeight };
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageWidth / imageHeight;

  let renderedWidth: number;
  let renderedHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (imageAspect > containerAspect) {
    // Image is wider than container - letterbox top/bottom
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / imageAspect;
    offsetX = 0;
    offsetY = (containerHeight - renderedHeight) / 2;
  } else {
    // Image is taller than container - letterbox left/right
    renderedHeight = containerHeight;
    renderedWidth = containerHeight * imageAspect;
    offsetX = (containerWidth - renderedWidth) / 2;
    offsetY = 0;
  }

  return { offsetX, offsetY, renderedWidth, renderedHeight };
}

type EditorMode = 'select' | 'edit' | 'preview';

interface ImageSet {
  id: string;
  uri: string;
  base64?: string;
  occlusions: OcclusionShape[];
}

interface PreviewCard {
  id: string;
  occlusion: OcclusionShape;
  imageOcclusionData: ImageOcclusionData;
  imageSetId: string;
}

const generateDeckName = (): string => {
  const adjectives = ['Anatomy', 'Visual', 'Diagram', 'Study', 'Learning'];
  const nouns = ['Cards', 'Set', 'Deck', 'Collection', 'Notes'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${randomAdj} ${randomNoun} - ${timestamp}`;
};

export function CreateOcclusionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const existingDeckId = route.params?.deckId as string | undefined;
  const { addDeck, addCards, getDeck } = useDeckStore();
  const existingDeck = existingDeckId ? getDeck(existingDeckId) : null;
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  // State
  const [mode, setMode] = useState<EditorMode>('select');
  const [imageSets, setImageSets] = useState<ImageSet[]>([]);
  const [activeImageSetId, setActiveImageSetId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('#D96830');
  const [deckTitle, setDeckTitle] = useState(existingDeck?.title || '');
  const [deckDescription, setDeckDescription] = useState(existingDeck?.description || '');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showRevealedInPreview, setShowRevealedInPreview] = useState(false);
  const [previewContainerSize, setPreviewContainerSize] = useState({ width: 300, height: 225 });
  const [previewImageDimensions, setPreviewImageDimensions] = useState({ width: 0, height: 0 });
  const [previewImageBounds, setPreviewImageBounds] = useState<ImageBounds>({ offsetX: 0, offsetY: 0, renderedWidth: 300, renderedHeight: 225 });
  const [revealMode, setRevealMode] = useState<OcclusionRevealMode>('one_at_a_time');

  // Derived state - current active image set
  const activeImageSet = imageSets.find(s => s.id === activeImageSetId) || null;
  const selectedImage = activeImageSet ? { uri: activeImageSet.uri, base64: activeImageSet.base64 } : null;
  const occlusions = activeImageSet?.occlusions || [];

  // Helper to update occlusions for the active image set
  const setOcclusions = useCallback((newOcclusions: OcclusionShape[]) => {
    if (!activeImageSetId) return;
    setImageSets(prev => prev.map(s =>
      s.id === activeImageSetId ? { ...s, occlusions: newOcclusions } : s
    ));
  }, [activeImageSetId]);

  // Total occlusion count across all images
  const totalOcclusionCount = imageSets.reduce((sum, s) => sum + s.occlusions.length, 0);

  // Load image dimensions when active image changes
  useEffect(() => {
    if (activeImageSet?.uri && Platform.OS === 'web') {
      const img = new window.Image();
      img.onload = () => {
        setPreviewImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = activeImageSet.uri;
    }
  }, [activeImageSet?.uri]);

  // Update image bounds when container or image dimensions change
  useEffect(() => {
    if (previewContainerSize.width && previewContainerSize.height && previewImageDimensions.width && previewImageDimensions.height) {
      const bounds = calculateImageBounds(
        previewContainerSize.width,
        previewContainerSize.height,
        previewImageDimensions.width,
        previewImageDimensions.height
      );
      setPreviewImageBounds(bounds);
    }
  }, [previewContainerSize, previewImageDimensions]);

  // Generate cards from all image sets based on reveal mode
  useEffect(() => {
    const allCards: PreviewCard[] = [];

    imageSets.forEach((imageSet) => {
      if (imageSet.occlusions.length === 0 || !imageSet.base64) return;

      const imageDataUri = `data:image/jpeg;base64,${imageSet.base64}`;

      if (revealMode === 'all_at_once') {
        // All at once: create 1 card per image that reveals all occlusions together
        allCards.push({
          id: `preview-all-${imageSet.id}`,
          occlusion: imageSet.occlusions[0],
          imageSetId: imageSet.id,
          imageOcclusionData: {
            sourceImage: imageDataUri,
            allOcclusions: imageSet.occlusions,
            revealedOcclusionIds: imageSet.occlusions.map(o => o.id),
            revealMode: 'all_at_once',
            occlusionColor: selectedColor,
          },
        });
      } else {
        // One at a time: create N cards per image, each revealing one occlusion
        imageSet.occlusions.forEach((occ, index) => {
          allCards.push({
            id: `preview-${imageSet.id}-${index}`,
            occlusion: occ,
            imageSetId: imageSet.id,
            imageOcclusionData: {
              sourceImage: imageDataUri,
              allOcclusions: imageSet.occlusions,
              revealedOcclusionId: occ.id,
              revealMode: 'one_at_a_time',
              occlusionColor: selectedColor,
            },
          });
        });
      }
    });

    setPreviewCards(allCards);
  }, [imageSets, selectedColor, revealMode]);

  // Handle image selection - adds to image sets
  const handleSelectImage = async (source: 'camera' | 'gallery', addToExisting = false) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      let result;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets[0]) return;

      const newImageSet: ImageSet = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        uri: result.assets[0].uri,
        base64: result.assets[0].base64 || undefined,
        occlusions: [],
      };

      if (addToExisting) {
        // Add to existing image sets
        setImageSets(prev => [...prev, newImageSet]);
      } else {
        // Replace all image sets (starting fresh)
        setImageSets([newImageSet]);
      }

      setActiveImageSetId(newImageSet.id);
      setMode('edit');

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  // Handle going to preview
  const handleGoToPreview = () => {
    if (totalOcclusionCount === 0) {
      Alert.alert('No Occlusions', 'Please draw at least one occlusion on your image(s).');
      return;
    }

    // Auto-generate deck name if empty
    if (!deckTitle.trim()) {
      setDeckTitle(generateDeckName());
    }

    setPreviewIndex(0);
    setShowRevealedInPreview(false);
    setMode('preview');

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  // Handle saving the deck
  const handleSaveDeck = async () => {
    if (previewCards.length === 0) {
      Alert.alert('Error', 'Please add at least one occlusion');
      return;
    }

    const finalDeckTitle = deckTitle.trim() || generateDeckName();

    setIsSaving(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Create cards from occlusions
      const cardsToAdd = previewCards.map((card, index) => ({
        front: card.occlusion.label || `Occlusion ${index + 1}`,
        back: card.occlusion.label || `Revealed area ${index + 1}`,
        cardType: 'image_occlusion' as const,
        options: null,
        explanation: null,
        frontImage: card.imageOcclusionData.sourceImage ?? null,
        backImage: null,
        clozeIndex: null,
        imageOcclusion: card.imageOcclusionData,
      }));

      let targetDeckId: string | null = existingDeckId || null;

      if (!existingDeckId) {
        targetDeckId = await addDeck({
          userId: 'stub-user-1',
          title: finalDeckTitle,
          description: deckDescription.trim() || `Image occlusion deck with ${previewCards.length} cards`,
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

      navigation.navigate('DeckDetail', { deckId: targetDeckId as string });
    } catch (error) {
      console.error('Save error:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save deck. Please try again.');
    }
  };

  // Render occlusion overlay for preview - uses image bounds for proper positioning
  const renderOcclusionOverlay = useCallback((card: PreviewCard, showRevealed: boolean) => {
    const { allOcclusions, revealedOcclusionId, revealedOcclusionIds, revealMode: cardRevealMode } = card.imageOcclusionData;

    // Determine if an occlusion should be revealed
    const isOcclusionRevealed = (occId: string): boolean => {
      if (!showRevealed) return false;

      if (cardRevealMode === 'all_at_once') {
        return true; // All revealed together
      }

      // One at a time mode
      if (revealedOcclusionIds && revealedOcclusionIds.length > 0) {
        return revealedOcclusionIds.includes(occId);
      }
      return occId === revealedOcclusionId;
    };

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {(allOcclusions || []).map((occ, index) => {
          const isRevealed = isOcclusionRevealed(occ.id);

          if (isRevealed) return null; // Don't render the revealed occlusion

          // Use image bounds for proper positioning (accounts for letterboxing)
          const style: ViewStyle = {
            position: 'absolute',
            left: previewImageBounds.offsetX + (occ.x / 100) * previewImageBounds.renderedWidth,
            top: previewImageBounds.offsetY + (occ.y / 100) * previewImageBounds.renderedHeight,
            width: (occ.width / 100) * previewImageBounds.renderedWidth,
            height: (occ.height / 100) * previewImageBounds.renderedHeight,
            backgroundColor: occ.color,
            borderRadius: occ.type === 'ellipse' ? 1000 : borderRadius.sm,
            justifyContent: 'center',
            alignItems: 'center',
          };

          // Show number badge on current card's occlusion (one at a time mode)
          const showNumber = !showRevealed && cardRevealMode !== 'all_at_once' && occ.id === revealedOcclusionId;

          return (
            <View key={occ.id} style={style}>
              {showNumber && (
                <Text style={styles.occlusionNumber}>?</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  }, [previewImageBounds]);

  // Handle preview container layout
  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPreviewContainerSize({ width, height });
  };

  // Image Selection Mode
  if (mode === 'select') {
    return (
      <View style={[styles.container, { backgroundColor: background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: surface }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            {existingDeck ? `Add to: ${existingDeck.title}` : 'Image Occlusion'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: accent.purple + '15', borderColor: accent.purple + '30' }]}>
            <View style={styles.infoHeader}>
              <Ionicons name="eye-off-outline" size={20} color={accent.purple} />
              <Text style={[styles.infoTitle, { color: textPrimary }]}>Image Occlusion</Text>
            </View>
            <Text style={[styles.infoText, { color: textSecondary }]}>
              Upload an image and draw masks over areas you want to study. Each occlusion becomes a card where you guess what's hidden.
            </Text>
            <View style={[styles.infoDivider, { backgroundColor: accent.purple + '20' }]} />
            <Text style={[styles.infoTip, { color: textSecondary }]}>
              Perfect for anatomy diagrams, maps, charts, and any labeled images.
            </Text>
          </View>

          {/* Upload Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Select an image</Text>
            <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
              Choose a diagram, chart, or any image with details to memorize
            </Text>

            <TouchableOpacity
              style={[styles.uploadZone, { backgroundColor: surface, borderColor: border }]}
              onPress={() => handleSelectImage('gallery')}
              activeOpacity={0.7}
            >
              <View style={styles.uploadZoneContent}>
                <View style={[styles.uploadIcon, { backgroundColor: accent.orange + '20' }]}>
                  <Ionicons name="image-outline" size={32} color={accent.orange} />
                </View>
                <Text style={[styles.uploadTitle, { color: textPrimary }]}>
                  Select Image
                </Text>
                <Text style={[styles.uploadDescription, { color: textSecondary }]}>
                  Tap to choose from your gallery
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.imageSourceButtons}>
              <TouchableOpacity
                style={[styles.imageSourceBtn, { backgroundColor: surface, borderColor: border }]}
                onPress={() => handleSelectImage('camera')}
              >
                <Ionicons name="camera-outline" size={20} color={accent.orange} />
                <Text style={[styles.imageSourceBtnText, { color: textPrimary }]}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.imageSourceBtn, { backgroundColor: surface, borderColor: border }]}
                onPress={() => handleSelectImage('gallery')}
              >
                <Ionicons name="images-outline" size={20} color={accent.orange} />
                <Text style={[styles.imageSourceBtnText, { color: textPrimary }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: spacing[20] }} />
        </ScrollView>
      </View>
    );
  }

  // Editor Mode
  if (mode === 'edit') {
    return (
      <View style={[styles.container, { backgroundColor: background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: surface }]}
            onPress={() => {
              if (totalOcclusionCount > 0) {
                Alert.alert(
                  'Discard Changes?',
                  'Going back will discard all your occlusions.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => {
                      setImageSets([]);
                      setActiveImageSetId(null);
                      setMode('select');
                    }},
                  ]
                );
              } else {
                setImageSets([]);
                setActiveImageSetId(null);
                setMode('select');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Draw Occlusions</Text>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: totalOcclusionCount > 0 ? accent.orange : surfaceHover },
            ]}
            onPress={handleGoToPreview}
            disabled={totalOcclusionCount === 0}
          >
            <Text
              style={[
                styles.nextButtonText,
                { color: totalOcclusionCount > 0 ? '#FFFFFF' : textSecondary },
              ]}
            >
              Next
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={totalOcclusionCount > 0 ? '#FFFFFF' : textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Image tabs for multi-image support */}
        {imageSets.length > 0 && (
          <View style={[styles.imageTabsContainer, { backgroundColor: surface, borderColor: border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageTabs}>
              {imageSets.map((imageSet, index) => (
                <TouchableOpacity
                  key={imageSet.id}
                  style={[
                    styles.imageTab,
                    { borderColor: imageSet.id === activeImageSetId ? accent.orange : border },
                    imageSet.id === activeImageSetId && { borderWidth: 2 },
                  ]}
                  onPress={() => setActiveImageSetId(imageSet.id)}
                >
                  <Image source={{ uri: imageSet.uri }} style={styles.imageTabThumb} resizeMode="cover" />
                  <View style={[styles.imageTabBadge, { backgroundColor: accent.orange }]}>
                    <Text style={styles.imageTabBadgeText}>{imageSet.occlusions.length}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {/* Add another image button */}
              <TouchableOpacity
                style={[styles.addImageTab, { backgroundColor: surfaceHover, borderColor: border }]}
                onPress={() => handleSelectImage('gallery', true)}
              >
                <Ionicons name="add" size={24} color={textSecondary} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        <View style={styles.editorContainer}>
          {selectedImage && (
            <OcclusionEditor
              imageUri={selectedImage.uri}
              imageBase64={selectedImage.base64}
              occlusions={occlusions}
              onOcclusionsChange={setOcclusions}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              enableAiLabeling={true}
            />
          )}
        </View>
      </View>
    );
  }

  // Preview Mode
  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => setMode('edit')}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Preview & Save</Text>
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
            {previewCards.length} {previewCards.length === 1 ? 'card' : 'cards'} from {totalOcclusionCount} occlusions
            {imageSets.length > 1 ? ` across ${imageSets.length} images` : ''}.
          </Text>
        </View>

        {/* Deck Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Deck Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
            value={deckTitle}
            onChangeText={setDeckTitle}
            placeholder="Enter deck title (or leave blank for auto-name)"
            placeholderTextColor={textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.multilineInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
            value={deckDescription}
            onChangeText={setDeckDescription}
            placeholder="Enter deck description"
            placeholderTextColor={textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Image Summary (for multi-image) */}
        {imageSets.length > 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: textSecondary }]}>Images ({imageSets.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewImageList}>
              {imageSets.map((imageSet, index) => (
                <View key={imageSet.id} style={[styles.previewImageThumb, { borderColor: border }]}>
                  <Image source={{ uri: imageSet.uri }} style={styles.previewImageThumbImg} resizeMode="cover" />
                  <View style={[styles.previewImageThumbBadge, { backgroundColor: accent.orange }]}>
                    <Text style={styles.previewImageThumbBadgeText}>{imageSet.occlusions.length}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reveal Mode Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>Reveal Mode</Text>
          <View style={styles.revealModeOptions}>
            <TouchableOpacity
              style={[
                styles.revealModeOption,
                { backgroundColor: surface, borderColor: revealMode === 'one_at_a_time' ? accent.orange : border },
                revealMode === 'one_at_a_time' && { borderWidth: 2 },
              ]}
              onPress={() => setRevealMode('one_at_a_time')}
            >
              <View style={styles.revealModeHeader}>
                <View style={[styles.revealModeRadio, { borderColor: revealMode === 'one_at_a_time' ? accent.orange : border }]}>
                  {revealMode === 'one_at_a_time' && (
                    <View style={[styles.revealModeRadioInner, { backgroundColor: accent.orange }]} />
                  )}
                </View>
                <Text style={[styles.revealModeTitle, { color: textPrimary }]}>One at a Time</Text>
              </View>
              <Text style={[styles.revealModeDesc, { color: textSecondary }]}>
                Creates {totalOcclusionCount} cards - each reveals one area
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.revealModeOption,
                { backgroundColor: surface, borderColor: revealMode === 'all_at_once' ? accent.orange : border },
                revealMode === 'all_at_once' && { borderWidth: 2 },
              ]}
              onPress={() => setRevealMode('all_at_once')}
            >
              <View style={styles.revealModeHeader}>
                <View style={[styles.revealModeRadio, { borderColor: revealMode === 'all_at_once' ? accent.orange : border }]}>
                  {revealMode === 'all_at_once' && (
                    <View style={[styles.revealModeRadioInner, { backgroundColor: accent.orange }]} />
                  )}
                </View>
                <Text style={[styles.revealModeTitle, { color: textPrimary }]}>All at Once</Text>
              </View>
              <Text style={[styles.revealModeDesc, { color: textSecondary }]}>
                Creates {imageSets.length} {imageSets.length === 1 ? 'card' : 'cards'} - test all {totalOcclusionCount} areas together
              </Text>
            </TouchableOpacity>
          </View>
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
            disabled={isSaving || previewCards.length === 0}
            icon={<Ionicons name="checkmark" size={20} color="#FFFFFF" />}
          />
        </View>

        {/* Card Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: textSecondary }]}>
            Card Preview ({previewIndex + 1}/{previewCards.length})
          </Text>

          {previewCards.length > 0 && (
            <View style={[styles.previewCard, { backgroundColor: surface, borderColor: border }]}>
              {/* Card image with occlusions */}
              <View style={styles.previewImageContainer} onLayout={handlePreviewLayout}>
                <Image
                  source={{ uri: previewCards[previewIndex].imageOcclusionData.sourceImage }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                {renderOcclusionOverlay(previewCards[previewIndex], showRevealedInPreview)}
              </View>

              {/* Reveal toggle */}
              <TouchableOpacity
                style={[
                  styles.revealButton,
                  { backgroundColor: showRevealedInPreview ? accent.green + '20' : surfaceHover },
                ]}
                onPress={() => setShowRevealedInPreview(!showRevealedInPreview)}
              >
                <Ionicons
                  name={showRevealedInPreview ? 'eye' : 'eye-off'}
                  size={18}
                  color={showRevealedInPreview ? accent.green : textSecondary}
                />
                <Text
                  style={[
                    styles.revealButtonText,
                    { color: showRevealedInPreview ? accent.green : textSecondary },
                  ]}
                >
                  {showRevealedInPreview ? 'Answer Shown' : 'Tap to Reveal'}
                </Text>
              </TouchableOpacity>

              {/* Label */}
              {previewCards[previewIndex].occlusion.label && (
                <View style={[styles.labelBadge, { backgroundColor: surfaceHover }]}>
                  <Ionicons name="text-outline" size={14} color={textSecondary} />
                  <Text style={[styles.labelBadgeText, { color: textPrimary }]}>
                    {previewCards[previewIndex].occlusion.label}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Navigation */}
          {previewCards.length > 1 && (
            <View style={styles.previewNav}>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: surface, borderColor: border }]}
                onPress={() => {
                  setPreviewIndex(Math.max(0, previewIndex - 1));
                  setShowRevealedInPreview(false);
                }}
                disabled={previewIndex === 0}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={previewIndex === 0 ? textSecondary : textPrimary}
                />
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.cardDots}
                contentContainerStyle={styles.cardDotsContent}
              >
                {previewCards.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.cardDot,
                      { backgroundColor: index === previewIndex ? accent.orange : surfaceHover },
                    ]}
                    onPress={() => {
                      setPreviewIndex(index);
                      setShowRevealedInPreview(false);
                    }}
                  />
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: surface, borderColor: border }]}
                onPress={() => {
                  setPreviewIndex(Math.min(previewCards.length - 1, previewIndex + 1));
                  setShowRevealedInPreview(false);
                }}
                disabled={previewIndex === previewCards.length - 1}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={previewIndex === previewCards.length - 1 ? textSecondary : textPrimary}
                />
              </TouchableOpacity>
            </View>
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
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  nextButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[3],
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  infoTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  infoText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    marginVertical: spacing[3],
  },
  infoTip: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
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
  uploadDescription: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  imageSourceButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  imageSourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
  imageSourceBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  input: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    fontSize: typography.sizes.base,
    borderWidth: 1,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  saveButtonContainer: {
    marginBottom: spacing[6],
  },
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
  previewCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  previewImageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: spacing[3],
    marginHorizontal: spacing[3],
    marginVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  revealButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginHorizontal: spacing[3],
    marginBottom: spacing[3],
    borderRadius: borderRadius.md,
  },
  labelBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  previewNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardDots: {
    flex: 1,
    maxWidth: 200,
  },
  cardDotsContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  occlusionNumber: {
    color: '#FFFFFF',
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  revealModeOptions: {
    gap: spacing[3],
  },
  revealModeOption: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  revealModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[1],
  },
  revealModeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealModeRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  revealModeTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  revealModeDesc: {
    fontSize: typography.sizes.sm,
    marginLeft: 32,
  },
  imageTabsContainer: {
    borderBottomWidth: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  imageTabs: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  imageTab: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  imageTabThumb: {
    width: '100%',
    height: '100%',
  },
  imageTabBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    minWidth: 16,
    alignItems: 'center',
  },
  imageTabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  addImageTab: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageList: {
    flexDirection: 'row',
  },
  previewImageThumb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginRight: spacing[2],
  },
  previewImageThumbImg: {
    width: '100%',
    height: '100%',
  },
  previewImageThumbBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 18,
    alignItems: 'center',
  },
  previewImageThumbBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
