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
  Image,
  Modal,
  KeyboardAvoidingView,
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
  frontImage?: string | null;
  backImage?: string | null;
  cardType?: 'flashcard' | 'cloze' | 'multiple_choice';
  clozeIndex?: number | null;
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingFront, setEditingFront] = useState('');
  const [editingBack, setEditingBack] = useState('');

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const [apkgFile, setApkgFile] = useState<{ uri: string; name: string; file?: File; blob?: Blob } | null>(null);
  const [textFile, setTextFile] = useState<{ uri: string; name: string; file?: File; blob?: Blob } | null>(null);
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

  const handleTextFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? '*/*' : ['text/plain', 'text/csv', 'text/tab-separated-values', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const pickedFile = result.assets[0];
      const fileName = pickedFile.name.toLowerCase();

      // Validate file type
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.tsv') && !fileName.endsWith('.txt')) {
        showError('Invalid File', 'Please select a .csv, .tsv, or .txt file');
        return;
      }

      console.log('Text file picked:', {
        name: pickedFile.name,
        uri: pickedFile.uri,
        size: (pickedFile as any).size,
      });

      // Read file content
      let fileContent = '';

      if (Platform.OS === 'web') {
        const webFile = (pickedFile as any).file as File | undefined;

        if (webFile) {
          fileContent = await webFile.text();
        } else {
          // Fetch from blob URI
          const response = await fetch(pickedFile.uri);
          fileContent = await response.text();
        }
      } else {
        // Native: fetch from URI
        const response = await fetch(pickedFile.uri);
        fileContent = await response.text();
      }

      if (!fileContent.trim()) {
        showError('Empty File', 'The selected file is empty');
        return;
      }

      setTextFile({ uri: pickedFile.uri, name: pickedFile.name });
      setInputValue(fileContent);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error picking text file:', error);
      showError('Error', 'Failed to read file. Please try again.');
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
          setImportedCards(cards.map((card: { front: string; back: string; frontImage?: string | null; backImage?: string | null; cardType?: string; clozeIndex?: number | null }) => ({
            front: card.front,
            back: card.back,
            frontImage: card.frontImage || null,
            backImage: card.backImage || null,
            cardType: (card.cardType as 'flashcard' | 'cloze' | 'multiple_choice') || 'flashcard',
            clozeIndex: card.clozeIndex || null,
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

  const startEditingCard = (index: number) => {
    const card = importedCards[index];
    setEditingIndex(index);
    setEditingFront(card.front);
    setEditingBack(card.back);
  };

  const saveEditedCard = () => {
    if (editingIndex === null) return;
    setImportedCards(prev => prev.map((card, i) =>
      i === editingIndex ? { ...card, front: editingFront, back: editingBack } : card
    ));
    setEditingIndex(null);
    setEditingFront('');
    setEditingBack('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingFront('');
    setEditingBack('');
  };

  const deleteCard = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setImportedCards(prev => prev.filter((_, i) => i !== index));
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
      frontImage: card.frontImage || null,
      backImage: card.backImage || null,
      cardType: card.cardType || 'flashcard',
      clozeIndex: card.clozeIndex || null,
      options: null,
      explanation: null,
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
          <>
            {/* File upload option for CSV/Text */}
            <TouchableOpacity
              style={[styles.fileInput, { backgroundColor: surface, borderColor: textFile ? accent.purple : border, marginBottom: spacing[3] }]}
              onPress={handleTextFilePick}
            >
              <Ionicons name={textFile ? 'document-text' : 'cloud-upload-outline'} size={24} color={textFile ? accent.purple : textSecondary} />
              <Text style={[styles.fileInputText, { color: textFile ? textPrimary : textSecondary }]}>
                {textFile?.name || 'Upload a .csv, .tsv, or .txt file'}
              </Text>
              {textFile && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setTextFile(null);
                    setInputValue('');
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={22} color={textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Divider with "or" */}
            <View style={styles.orDivider}>
              <View style={[styles.orDividerLine, { backgroundColor: border }]} />
              <Text style={[styles.orDividerText, { color: textSecondary }]}>or paste content</Text>
              <View style={[styles.orDividerLine, { backgroundColor: border }]} />
            </View>

            {/* Text input */}
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: surface, color: textPrimary, borderColor: border },
                source === 'csv' && styles.textInputMultiline,
              ]}
              placeholder={selectedSource?.inputPlaceholder}
              placeholderTextColor={textSecondary}
              value={inputValue}
              onChangeText={(text) => {
                setInputValue(text);
                // Clear file reference if user starts typing
                if (textFile && text !== inputValue) {
                  setTextFile(null);
                }
              }}
              multiline={source === 'csv'}
              numberOfLines={source === 'csv' ? 8 : 1}
              textAlignVertical={source === 'csv' ? 'top' : 'center'}
            />
          </>
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
    const clozeCount = importedCards.filter(c => c.cardType === 'cloze').length;
    const flashcardCount = importedCards.filter(c => c.cardType !== 'cloze').length;

    return (
      <View style={styles.previewContainer}>
        {/* Top action bar with save button */}
        <View style={[styles.topActionBar, { backgroundColor: surface, borderBottomColor: border }]}>
          <Text style={[styles.selectedCount, { color: textSecondary }]}>
            {selectedCount} of {importedCards.length} selected
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: accent.orange }]}
            onPress={handleCreateDeck}
          >
            <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: spacing[1] }} />
            <Text style={styles.createButtonText}>Save Deck</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewScrollView} showsVerticalScrollIndicator={true}>
          <View style={[styles.successBanner, { backgroundColor: accent.green + '15' }]}>
            <Ionicons name="checkmark-circle" size={24} color={accent.green} />
            <View>
              <Text style={[styles.successText, { color: accent.green }]}>
                {importedCards.length} cards found!
              </Text>
              {clozeCount > 0 && (
                <Text style={[styles.successSubtext, { color: accent.green }]}>
                  {flashcardCount} flashcards, {clozeCount} cloze deletions
                </Text>
              )}
            </View>
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
            Tap checkbox to select, tap edit to modify
          </Text>

          {importedCards.map((card, index) => (
            <View
              key={index}
              style={[
                styles.cardPreview,
                { backgroundColor: surface, borderColor: card.selected ? accent.orange : border },
              ]}
            >
              <TouchableOpacity style={styles.cardCheckbox} onPress={() => toggleCard(index)}>
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
              </TouchableOpacity>
              <View style={styles.cardPreviewContent}>
                {/* Card type badge */}
                {card.cardType === 'cloze' && (
                  <View style={[styles.cardTypeBadge, { backgroundColor: accent.purple + '20' }]}>
                    <Text style={[styles.cardTypeBadgeText, { color: accent.purple }]}>Cloze</Text>
                  </View>
                )}
                {card.frontImage && (
                  <Image source={{ uri: card.frontImage }} style={styles.cardPreviewImage} resizeMode="contain" />
                )}
                <Text style={[styles.cardFront, { color: textPrimary }]} numberOfLines={3}>
                  {card.front || (card.frontImage ? '[Image]' : '')}
                </Text>
                {card.backImage && (
                  <Image source={{ uri: card.backImage }} style={styles.cardPreviewImageSmall} resizeMode="contain" />
                )}
                <Text style={[styles.cardBack, { color: textSecondary }]} numberOfLines={3}>
                  {card.cardType === 'cloze' ? `Answer: ${card.back}` : card.back || (card.backImage ? '[Image]' : '')}
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.cardActionButton, { backgroundColor: accent.blue + '20' }]}
                  onPress={() => startEditingCard(index)}
                >
                  <Ionicons name="pencil" size={16} color={accent.blue} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cardActionButton, { backgroundColor: accent.red + '20' }]}
                  onPress={() => deleteCard(index)}
                >
                  <Ionicons name="trash-outline" size={16} color={accent.red} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Spacer for bottom */}
          <View style={{ height: spacing[8] }} />
        </ScrollView>

        {/* Edit Card Modal */}
        <Modal
          visible={editingIndex !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={cancelEditing}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={[styles.editModal, { backgroundColor: surface }]}>
              <View style={[styles.editModalHeader, { borderBottomColor: border }]}>
                <Text style={[styles.editModalTitle, { color: textPrimary }]}>Edit Card</Text>
                <TouchableOpacity onPress={cancelEditing}>
                  <Ionicons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.editModalContent}>
                {editingIndex !== null && importedCards[editingIndex]?.frontImage && (
                  <Image
                    source={{ uri: importedCards[editingIndex].frontImage! }}
                    style={styles.editModalImage}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.inputLabel, { color: textSecondary }]}>Front (Question)</Text>
                <TextInput
                  style={[styles.editTextInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                  value={editingFront}
                  onChangeText={setEditingFront}
                  placeholder="Enter the question or front of card"
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={4}
                />

                {editingIndex !== null && importedCards[editingIndex]?.backImage && (
                  <Image
                    source={{ uri: importedCards[editingIndex].backImage! }}
                    style={styles.editModalImage}
                    resizeMode="contain"
                  />
                )}
                <Text style={[styles.inputLabel, { color: textSecondary, marginTop: spacing[4] }]}>Back (Answer)</Text>
                <TextInput
                  style={[styles.editTextInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                  value={editingBack}
                  onChangeText={setEditingBack}
                  placeholder="Enter the answer or back of card"
                  placeholderTextColor={textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </ScrollView>

              <View style={[styles.editModalFooter, { borderTopColor: border }]}>
                <TouchableOpacity
                  style={[styles.editModalButton, { backgroundColor: border }]}
                  onPress={cancelEditing}
                >
                  <Text style={[styles.editModalButtonText, { color: textPrimary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalButton, { backgroundColor: accent.orange }]}
                  onPress={saveEditedCard}
                >
                  <Text style={[styles.editModalButtonText, { color: '#fff' }]}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[3],
  },
  orDividerLine: {
    flex: 1,
    height: 1,
  },
  orDividerText: {
    paddingHorizontal: spacing[3],
    fontSize: typography.sizes.sm,
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
  successSubtext: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
    marginTop: 2,
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
  cardTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing[1],
  },
  cardTypeBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  cardPreviewImage: {
    width: '100%',
    height: 80,
    marginBottom: spacing[2],
    borderRadius: borderRadius.sm,
  },
  cardPreviewImageSmall: {
    width: '100%',
    height: 50,
    marginTop: spacing[1],
    marginBottom: spacing[1],
    borderRadius: borderRadius.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  previewScrollView: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'column',
    gap: spacing[2],
    marginLeft: spacing[2],
  },
  cardActionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModal: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  editModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  editModalContent: {
    padding: spacing[4],
    maxHeight: 400,
  },
  editModalImage: {
    width: '100%',
    height: 120,
    marginBottom: spacing[3],
    borderRadius: borderRadius.md,
  },
  editTextInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    fontSize: typography.sizes.base,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editModalFooter: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderTopWidth: 1,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  editModalButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
