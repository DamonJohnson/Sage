import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';

import { useDeckStore } from '@/store';
import { importApkgFile, importTextContent } from '@/services';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';

type ImportSource = 'csv' | 'apkg' | null;
type ImportStep = 'select' | 'input' | 'processing' | 'preview' | 'complete';

interface ImportedCard {
  front: string;
  back: string;
  selected: boolean;
}

type CreateImportParams = {
  mode?: 'anki' | 'text';
};

export function CreateImportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ CreateImport: CreateImportParams }, 'CreateImport'>>();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();
  const { addDeck, addCards } = useDeckStore();

  // Get mode from route params (anki or text)
  const initialMode = route.params?.mode;

  const [source, setSource] = useState<ImportSource>(
    initialMode === 'anki' ? 'apkg' : initialMode === 'text' ? 'csv' : null
  );
  const [step, setStep] = useState<ImportStep>(initialMode ? 'input' : 'select');
  const [inputValue, setInputValue] = useState('');
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [importedCards, setImportedCards] = useState<ImportedCard[]>([]);

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const [apkgFile, setApkgFile] = useState<{ uri: string; name: string; file?: File; blob?: Blob } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Show error in both UI and alert
  const showError = (title: string, message: string) => {
    console.error(`${title}: ${message}`);
    setErrorMessage(message);
    if (Platform.OS !== 'web') {
      Alert.alert(title, message);
    }
  };

  const IMPORT_SOURCES = [
    {
      id: 'apkg' as const,
      title: 'Anki (APKG)',
      description: 'Import decks from Anki desktop or mobile',
      icon: 'albums-outline' as const,
      gradient: ['#3B82F6', '#2563EB'],
      inputLabel: 'Select APKG File',
      inputPlaceholder: 'Choose an .apkg file from your device...',
      isFile: true,
    },
    {
      id: 'csv' as const,
      title: 'CSV / Text',
      description: 'AI will interpret your data and create flashcards',
      icon: 'sparkles-outline' as const,
      gradient: ['#9333EA', '#7C3AED'],
      inputLabel: 'Paste Your Content',
      inputPlaceholder: 'Paste notes, study material, CSV, or any text - AI will create flashcards from it...',
      isFile: false,
    },
  ];

  const selectedSource = IMPORT_SOURCES.find(s => s.id === source);

  const handleSourceSelect = (sourceId: ImportSource) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSource(sourceId);
    setStep('input');
  };

  const handleApkgFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? '*/*' : 'application/zip',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const pickedFile = result.assets[0];
      if (!pickedFile.name.toLowerCase().endsWith('.apkg')) {
        showError('Invalid File', 'Please select an .apkg file');
        return;
      }

      console.log('DocumentPicker result:', {
        name: pickedFile.name,
        uri: pickedFile.uri,
        mimeType: (pickedFile as any).mimeType,
        size: (pickedFile as any).size,
        hasFile: !!(pickedFile as any).file,
      });

      if (Platform.OS === 'web') {
        // On web, try to get the File object directly
        const webFile = (pickedFile as any).file as File | undefined;

        if (webFile) {
          console.log('Got File object from DocumentPicker:', webFile.name, webFile.size);
          setApkgFile({ uri: pickedFile.uri, name: pickedFile.name, file: webFile });
        } else {
          // Fallback: fetch the blob from the URI immediately to preserve the data
          console.log('No File object, fetching from blob URI...');
          try {
            const response = await fetch(pickedFile.uri);
            const blob = await response.blob();
            console.log('Got blob from URI:', blob.size, blob.type);
            setApkgFile({ uri: pickedFile.uri, name: pickedFile.name, blob: blob });
          } catch (fetchError) {
            console.error('Failed to fetch blob from URI:', fetchError);
            showError('Error', 'Failed to read file. Please try again.');
            return;
          }
        }
      } else {
        setApkgFile({ uri: pickedFile.uri, name: pickedFile.name });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setInputValue(pickedFile.name);
    } catch (error) {
      console.error('Error picking file:', error);
      showError('Error', 'Failed to pick file. Please try again.');
    }
  };

  const handleImport = async () => {
    // Clear any previous errors
    setErrorMessage(null);

    // Validate input based on source type
    if (source === 'apkg' && !apkgFile) {
      showError('Error', 'Please select an APKG file');
      return;
    }
    if (!inputValue.trim() && selectedSource?.isFile === false) {
      showError('Error', `Please enter the ${selectedSource?.inputLabel.toLowerCase()}`);
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setStep('processing');

    // Handle APKG import via backend
    if (source === 'apkg' && apkgFile) {
      console.log('Starting APKG import:', apkgFile.name, 'hasFile:', !!apkgFile.file, 'hasBlob:', !!apkgFile.blob);
      try {
        // Pass the file or blob for web uploads
        const webFileOrBlob = apkgFile.file || (apkgFile.blob ? new File([apkgFile.blob], apkgFile.name, { type: 'application/zip' }) : undefined);
        console.log('webFileOrBlob:', webFileOrBlob ? `${webFileOrBlob.name} (${webFileOrBlob.size} bytes)` : 'undefined');
        const response = await importApkgFile(apkgFile.uri, apkgFile.name, webFileOrBlob);
        console.log('APKG import result:', response);
        if (response.success && response.data) {
          const { deckName, cards } = response.data;
          if (!cards || cards.length === 0) {
            showError('Import Failed', 'No cards found in the APKG file');
            setStep('input');
            return;
          }
          setDeckTitle(deckName || 'Imported Deck');
          setImportedCards(cards.map((card: { front: string; back: string }) => ({
            front: card.front,
            back: card.back,
            selected: true,
          })));
          setStep('preview');
        } else {
          showError('Import Failed', response.error || 'Failed to parse APKG file');
          setStep('input');
        }
      } catch (error) {
        console.error('APKG import error:', error);
        showError('Error', `Failed to import APKG file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setStep('input');
      }
      return;
    }

    // Handle CSV/Text import via backend with AI
    if (source === 'csv') {
      try {
        const response = await importTextContent(inputValue);
        if (response.success && response.data) {
          const { deckName, cards } = response.data;
          // Use user-provided title if available, otherwise use AI-suggested name
          if (!deckTitle.trim()) {
            setDeckTitle(deckName || 'Imported Deck');
          }
          // Use user-provided description if available
          if (!deckDescription.trim()) {
            setDeckDescription(`Imported from text (${cards.length} cards)`);
          }
          setImportedCards(cards.map((card: { front: string; back: string }) => ({
            front: card.front,
            back: card.back,
            selected: true,
          })));
          setStep('preview');
        } else {
          showError('Import Failed', response.error || 'Failed to parse content');
          setStep('input');
        }
      } catch (error) {
        console.error('Text import error:', error);
        showError('Error', 'Failed to import content. Please try again.');
        setStep('input');
      }
      return;
    }
  };

  const toggleCard = (index: number) => {
    Haptics.selectionAsync();
    setImportedCards(prev => prev.map((card, i) =>
      i === index ? { ...card, selected: !card.selected } : card
    ));
  };

  const handleCreateDeck = async () => {
    const selectedCards = importedCards.filter(c => c.selected);
    if (selectedCards.length === 0) {
      showError('No Cards Selected', 'Please select at least one card to import.');
      return;
    }

    if (!deckTitle.trim()) {
      showError('Missing Title', 'Please enter a deck title.');
      return;
    }

    const deckId = await addDeck({
      userId: 'stub-user-1',
      title: deckTitle.trim(),
      description: deckDescription.trim() || `Imported from ${selectedSource?.title || 'external source'}`,
      isPublic: false,
      cardCount: selectedCards.length,
      downloadCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      originalAuthorId: null,
      originalAuthorName: null,
      originalAuthorAvatar: null,
      originalDeckId: null,
    });

    if (!deckId) {
      showError('Error', 'Failed to create deck. Please try again.');
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

  const renderSourceSelection = () => (
    <View style={styles.sourcesContainer}>
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>Choose Import Source</Text>
      <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
        Import flashcards from other apps or formats
      </Text>

      {IMPORT_SOURCES.map((sourceOption) => (
        <TouchableOpacity
          key={sourceOption.id}
          style={styles.sourceCard}
          onPress={() => handleSourceSelect(sourceOption.id)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={sourceOption.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sourceGradient}
          >
            <View style={styles.sourceIcon}>
              <Ionicons name={sourceOption.icon} size={28} color="#fff" />
            </View>
            <View style={styles.sourceContent}>
              <Text style={styles.sourceTitle}>{sourceOption.title}</Text>
              <Text style={styles.sourceDescription}>{sourceOption.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      ))}

      <View style={styles.infoSection}>
        <View style={[styles.infoCard, { backgroundColor: surfaceHover }]}>
          <Ionicons name="information-circle-outline" size={20} color={textSecondary} />
          <Text style={[styles.infoText, { color: textSecondary }]}>
            Imported cards will be copied to your library. You can edit them after import.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderInputStep = () => (
    <View style={styles.inputContainer}>
      {/* Only show "Back to sources" if we didn't come with a direct mode */}
      {!initialMode && (
        <TouchableOpacity
          style={[styles.backLink, { backgroundColor: surfaceHover }]}
          onPress={() => {
            setStep('select');
            setSource(null);
            setInputValue('');
          }}
        >
          <Ionicons name="arrow-back" size={18} color={textPrimary} />
          <Text style={[styles.backLinkText, { color: textPrimary }]}>Back to sources</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.sourceHeader, { backgroundColor: surface }]}>
        <View
          style={[
            styles.sourceIconSmall,
            { backgroundColor: selectedSource?.gradient[0] + '20' }
          ]}
        >
          <Ionicons
            name={selectedSource?.icon || 'document-outline'}
            size={24}
            color={selectedSource?.gradient[0]}
          />
        </View>
        <View>
          <Text style={[styles.sourceHeaderTitle, { color: textPrimary }]}>
            Import from {selectedSource?.title}
          </Text>
          <Text style={[styles.sourceHeaderSubtitle, { color: textSecondary }]}>
            {selectedSource?.description}
          </Text>
        </View>
      </View>

      {/* Deck Title and Description for text import */}
      {source === 'csv' && (
        <>
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: textSecondary }]}>
              Deck Title (optional)
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
              placeholder="AI will suggest a title if left blank"
              placeholderTextColor={textSecondary}
              value={deckTitle}
              onChangeText={setDeckTitle}
            />
          </View>

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: textSecondary }]}>
              Description (optional)
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
              placeholder="Brief description of the deck"
              placeholderTextColor={textSecondary}
              value={deckDescription}
              onChangeText={setDeckDescription}
            />
          </View>
        </>
      )}

      <View style={styles.inputSection}>
        <Text style={[styles.inputLabel, { color: textSecondary }]}>
          {selectedSource?.inputLabel}
        </Text>
        {selectedSource?.isFile ? (
          <TouchableOpacity
            style={[styles.fileInput, { backgroundColor: surface, borderColor: apkgFile ? accent.orange : border }]}
            onPress={handleApkgFilePick}
          >
            <Ionicons name={apkgFile ? 'document' : 'folder-outline'} size={24} color={apkgFile ? accent.orange : textSecondary} />
            <Text style={[styles.fileInputText, { color: apkgFile ? textPrimary : textSecondary }]}>
              {apkgFile?.name || selectedSource.inputPlaceholder}
            </Text>
            {apkgFile && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setApkgFile(null);
                  setInputValue('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color={textSecondary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: surface, color: textPrimary, borderColor: border },
              source === 'csv' && styles.textInputMultiline,
            ]}
            placeholder={selectedSource?.inputPlaceholder}
            placeholderTextColor={textSecondary}
            value={inputValue}
            onChangeText={setInputValue}
            multiline={source === 'csv'}
            numberOfLines={source === 'csv' ? 8 : 1}
            textAlignVertical={source === 'csv' ? 'top' : 'center'}
          />
        )}
      </View>

      {errorMessage && (
        <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#DC2626' }]}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <Ionicons name="close" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.importButton,
          { backgroundColor: accent.orange },
          ((!inputValue && !selectedSource?.isFile) || (source === 'apkg' && !apkgFile)) && { opacity: 0.5 }
        ]}
        onPress={handleImport}
        disabled={(!inputValue && !selectedSource?.isFile) || (source === 'apkg' && !apkgFile)}
      >
        <Ionicons name="cloud-download-outline" size={20} color="#fff" />
        <Text style={styles.importButtonText}>Import Cards</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <View style={[styles.processingCard, { backgroundColor: surface }]}>
        <ActivityIndicator size="large" color={accent.orange} />
        <Text style={[styles.processingTitle, { color: textPrimary }]}>
          Importing from {selectedSource?.title}...
        </Text>
        <Text style={[styles.processingSubtitle, { color: textSecondary }]}>
          Extracting and processing flashcards
        </Text>
      </View>
    </View>
  );

  const renderPreview = () => {
    const selectedCount = importedCards.filter(c => c.selected).length;

    return (
      <View style={styles.previewContainer}>
        <View style={[styles.successBanner, { backgroundColor: accent.green + '15' }]}>
          <Ionicons name="checkmark-circle" size={24} color={accent.green} />
          <Text style={[styles.successText, { color: accent.green }]}>
            {importedCards.length} cards found!
          </Text>
        </View>

        <View style={styles.deckTitleSection}>
          <Text style={[styles.inputLabel, { color: textSecondary }]}>Deck Title</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
            value={deckTitle}
            onChangeText={setDeckTitle}
            placeholder="Enter deck title"
            placeholderTextColor={textSecondary}
          />
        </View>

        <View style={styles.deckTitleSection}>
          <Text style={[styles.inputLabel, { color: textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: surface, color: textPrimary, borderColor: border }]}
            value={deckDescription}
            onChangeText={setDeckDescription}
            placeholder="Brief description of the deck"
            placeholderTextColor={textSecondary}
          />
        </View>

        <Text style={[styles.previewTitle, { color: textPrimary }]}>Preview Cards</Text>
        <Text style={[styles.previewSubtitle, { color: textSecondary }]}>
          Tap to include or exclude cards
        </Text>

        <ScrollView style={styles.cardsScrollView} showsVerticalScrollIndicator={false}>
          {importedCards.map((card, index) => (
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
            {selectedCount} of {importedCards.length} selected
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
          style={[styles.headerBackButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {initialMode === 'anki' ? 'Import from Anki' : initialMode === 'text' ? 'Import Text / CSV' : 'Import Flashcards'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={[
          styles.content,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }
        ]}
        contentContainerStyle={{ paddingHorizontal: contentPadding }}
        showsVerticalScrollIndicator={false}
      >
        {step === 'select' && renderSourceSelection()}
        {step === 'input' && renderInputStep()}
        {step === 'processing' && renderProcessing()}
        {step === 'preview' && renderPreview()}

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
    paddingVertical: spacing[3],
  },
  headerBackButton: {
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
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  sourcesContainer: {
    paddingTop: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing[6],
  },
  sourceCard: {
    marginBottom: spacing[4],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sourceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
  },
  sourceIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  sourceContent: {
    flex: 1,
  },
  sourceTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    color: '#fff',
    marginBottom: spacing[1],
  },
  sourceDescription: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  infoSection: {
    marginTop: spacing[4],
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing[4],
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
    lineHeight: 20,
  },
  inputContainer: {
    paddingTop: spacing[4],
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    marginBottom: spacing[4],
  },
  backLinkText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  sourceIconSmall: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  sourceHeaderTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  sourceHeaderSubtitle: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  inputSection: {
    marginBottom: spacing[6],
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
  },
  textInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    fontSize: typography.sizes.base,
  },
  textInputMultiline: {
    minHeight: 160,
    paddingTop: spacing[4],
  },
  fileInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing[4],
  },
  fileInputText: {
    fontSize: typography.sizes.base,
    marginLeft: spacing[3],
  },
  formatHint: {
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  formatHintTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[2],
  },
  formatHintText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  errorText: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
  },
  importButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing[2],
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing[20],
  },
  processingCard: {
    alignItems: 'center',
    padding: spacing[8],
    borderRadius: borderRadius['2xl'],
    ...shadows.md,
  },
  processingTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing[4],
  },
  processingSubtitle: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
  },
  previewContainer: {
    flex: 1,
    paddingTop: spacing[4],
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  successText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing[2],
  },
  deckTitleSection: {
    marginBottom: spacing[6],
  },
  previewTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  previewSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[4],
  },
  cardsScrollView: {
    flex: 1,
    marginBottom: spacing[20],
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderTopWidth: 1,
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
