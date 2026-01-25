import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemedColors } from '@/hooks/useThemedColors';
import { improveCard, convertToMultipleChoice } from '@/services/ai';
import { spacing, typography, borderRadius, shadows } from '@/theme';

export interface CardData {
  front: string;
  back: string;
  cardType?: 'flashcard' | 'multiple_choice';
  options?: string[] | null;
  explanation?: string | null;
}

interface EditCardModalProps {
  visible: boolean;
  card: CardData | null;
  onClose: () => void;
  onSave: (card: CardData) => void;
}

const AI_ASSIST_OPTIONS = [
  { label: 'Improve question', instruction: 'Make the question clearer and more specific' },
  { label: 'Improve answer', instruction: 'Make the answer more complete and informative' },
  { label: 'Simplify', instruction: 'Simplify both the question and answer for easier understanding' },
  { label: 'Add example', instruction: 'Add a concrete example to the answer' },
  { label: 'Make concise', instruction: 'Make both question and answer more concise' },
];

export function EditCardModal({ visible, card, onClose, onSave }: EditCardModalProps) {
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [savedFlashcardBack, setSavedFlashcardBack] = useState(''); // Preserve flashcard answer when in MC mode
  const [savedMCOptions, setSavedMCOptions] = useState<string[]>([]); // Preserve MC options when in flashcard mode
  const [savedMCBack, setSavedMCBack] = useState(''); // Preserve MC correct answer
  const [editCardType, setEditCardType] = useState<'flashcard' | 'multiple_choice'>('flashcard');
  const [editOptions, setEditOptions] = useState<string[]>([]);

  const [showAIAssist, setShowAIAssist] = useState(false);
  const [aiCustomInstruction, setAICustomInstruction] = useState('');
  const [isAIImproving, setIsAIImproving] = useState(false);
  const [isConvertingToMC, setIsConvertingToMC] = useState(false);

  // Reset state when card changes
  useEffect(() => {
    if (card) {
      setEditFront(card.front || '');
      setEditBack(card.back || '');
      setEditCardType(card.cardType || 'flashcard');
      setEditOptions(card.options || []);

      // Initialize saved states based on card type
      if (card.cardType === 'flashcard') {
        setSavedFlashcardBack(card.back || '');
        setSavedMCOptions([]);
        setSavedMCBack('');
      } else {
        setSavedFlashcardBack('');
        setSavedMCOptions(card.options || []);
        setSavedMCBack(card.back || '');
      }
    }
  }, [card]);

  const handleClose = () => {
    if (!isAIImproving && !isConvertingToMC) {
      setShowAIAssist(false);
      setAICustomInstruction('');
      onClose();
    }
  };

  const handleSave = () => {
    if (isAIImproving || isConvertingToMC) return;

    onSave({
      front: editFront.trim(),
      back: editBack.trim(),
      cardType: editCardType,
      options: editCardType === 'multiple_choice' ? editOptions : null,
      explanation: card?.explanation || null,
    });

    setShowAIAssist(false);
    setAICustomInstruction('');

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleAIImprove = async (instruction: string) => {
    if (!instruction.trim()) return;

    setIsAIImproving(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const response = await improveCard({
        front: editFront,
        back: editBack,
        instruction: instruction.trim(),
      });

      if (response.success && response.data) {
        setEditFront(response.data.front);
        setEditBack(response.data.back);
        setShowAIAssist(false);
        setAICustomInstruction('');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.error('Error improving card:', err);
    } finally {
      setIsAIImproving(false);
    }
  };

  const handleConvertToMultipleChoice = async () => {
    if (!editFront.trim() || !editBack.trim()) return;

    setIsConvertingToMC(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const response = await convertToMultipleChoice({
        front: editFront.trim(),
        back: editBack.trim(),
      });

      if (response.success && response.data) {
        setEditFront(response.data.front);
        setEditBack(response.data.back);
        setEditCardType('multiple_choice');
        setEditOptions(response.data.options || []);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err) {
      console.error('Error converting to multiple choice:', err);
    } finally {
      setIsConvertingToMC(false);
    }
  };

  const isLoading = isAIImproving || isConvertingToMC;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.modalContent, { backgroundColor: surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: border }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Edit Card</Text>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: surfaceHover }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Ionicons name="close" size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.editLabel, { color: textSecondary }]}>Question</Text>
            <TextInput
              style={[styles.editInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
              value={editFront}
              onChangeText={setEditFront}
              multiline
              numberOfLines={3}
              editable={!isLoading}
            />
            {editCardType === 'flashcard' && (
              <>
                <Text style={[styles.editLabel, { color: textSecondary }]}>Answer</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: background, color: textPrimary, borderColor: border }]}
                  value={editBack}
                  onChangeText={(text) => {
                    setEditBack(text);
                    setSavedFlashcardBack(text); // Keep saved state in sync
                  }}
                  multiline
                  numberOfLines={3}
                  editable={!isLoading}
                />
              </>
            )}

            {/* Card Type Toggle */}
            <Text style={[styles.editLabel, { color: textSecondary }]}>Card Type</Text>
            <View style={styles.cardTypeToggle}>
              <TouchableOpacity
                style={[
                  styles.cardTypeBtn,
                  editCardType === 'flashcard' && { backgroundColor: accent.orange },
                  editCardType !== 'flashcard' && { backgroundColor: surfaceHover },
                ]}
                onPress={() => {
                  if (editCardType === 'multiple_choice') {
                    // Save current MC state before switching
                    setSavedMCOptions(editOptions);
                    setSavedMCBack(editBack);
                    // Restore flashcard answer
                    setEditBack(savedFlashcardBack);
                    setEditCardType('flashcard');
                    setEditOptions([]);
                  }
                }}
                disabled={isLoading}
              >
                <Ionicons
                  name="documents-outline"
                  size={16}
                  color={editCardType === 'flashcard' ? '#fff' : textSecondary}
                />
                <Text
                  style={[
                    styles.cardTypeBtnText,
                    { color: editCardType === 'flashcard' ? '#fff' : textPrimary },
                  ]}
                >
                  Flashcard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cardTypeBtn,
                  editCardType === 'multiple_choice' && { backgroundColor: accent.orange },
                  editCardType !== 'multiple_choice' && { backgroundColor: surfaceHover },
                ]}
                onPress={() => {
                  if (editCardType !== 'multiple_choice') {
                    // Save current flashcard answer before switching
                    setSavedFlashcardBack(editBack);
                    // Check if we have saved MC options to restore
                    if (savedMCOptions.length > 0) {
                      setEditOptions(savedMCOptions);
                      setEditBack(savedMCBack);
                      setEditCardType('multiple_choice');
                    } else {
                      // No saved options, generate new ones
                      handleConvertToMultipleChoice();
                    }
                  }
                }}
                disabled={isLoading}
              >
                {isConvertingToMC ? (
                  <ActivityIndicator size="small" color={accent.purple} />
                ) : (
                  <>
                    <Ionicons
                      name="list-outline"
                      size={16}
                      color={editCardType === 'multiple_choice' ? '#fff' : textSecondary}
                    />
                    <Text
                      style={[
                        styles.cardTypeBtnText,
                        { color: editCardType === 'multiple_choice' ? '#fff' : textPrimary },
                      ]}
                    >
                      Multiple Choice
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Multiple Choice Options */}
            {editCardType === 'multiple_choice' && editOptions.length > 0 && (
              <View style={styles.mcOptionsContainer}>
                <View style={styles.mcOptionsHeader}>
                  <Text style={[styles.editLabel, { color: textSecondary, marginTop: 0 }]}>
                    Options (first is correct)
                  </Text>
                  <TouchableOpacity
                    style={[styles.regenerateBtn, { backgroundColor: accent.purple + '20' }]}
                    onPress={handleConvertToMultipleChoice}
                    disabled={isConvertingToMC}
                  >
                    <Ionicons name="sparkles" size={14} color={accent.purple} />
                    <Text style={[styles.regenerateBtnText, { color: accent.purple }]}>
                      Regenerate
                    </Text>
                  </TouchableOpacity>
                </View>
                {editOptions.map((option, index) => (
                  <View key={index} style={styles.mcOptionRow}>
                    <View
                      style={[
                        styles.mcOptionIndicator,
                        { backgroundColor: index === 0 ? accent.green : surfaceHover },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mcOptionIndicatorText,
                          { color: index === 0 ? '#fff' : textSecondary },
                        ]}
                      >
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>
                    <TextInput
                      style={[
                        styles.mcOptionInput,
                        { backgroundColor: background, color: textPrimary, borderColor: border },
                        index === 0 && { borderColor: accent.green },
                      ]}
                      value={option}
                      onChangeText={(text) => {
                        const newOptions = [...editOptions];
                        newOptions[index] = text;
                        setEditOptions(newOptions);
                      }}
                      placeholder={index === 0 ? 'Correct answer' : `Wrong option ${index}`}
                      placeholderTextColor={textSecondary}
                      editable={!isLoading}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Edit with AI Section */}
            <TouchableOpacity
              style={[
                styles.aiAssistToggle,
                { backgroundColor: showAIAssist ? accent.purple + '20' : surfaceHover },
              ]}
              onPress={() => setShowAIAssist(!showAIAssist)}
              disabled={isAIImproving}
            >
              <View style={styles.aiAssistToggleContent}>
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={showAIAssist ? accent.purple : textSecondary}
                />
                <Text
                  style={[
                    styles.aiAssistToggleText,
                    { color: showAIAssist ? accent.purple : textSecondary },
                  ]}
                >
                  Edit with AI
                </Text>
              </View>
              <Ionicons
                name={showAIAssist ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={showAIAssist ? accent.purple : textSecondary}
              />
            </TouchableOpacity>

            {showAIAssist && (
              <View style={[styles.aiAssistPanel, { backgroundColor: surfaceHover }]}>
                {isAIImproving ? (
                  <View style={styles.aiImprovingContainer}>
                    <ActivityIndicator size="small" color={accent.purple} />
                    <Text style={[styles.aiImprovingText, { color: textSecondary }]}>
                      Improving card...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.aiAssistLabel, { color: textSecondary }]}>
                      Quick Actions
                    </Text>
                    <View style={styles.aiAssistChips}>
                      {AI_ASSIST_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.label}
                          style={[styles.aiAssistChip, { backgroundColor: background, borderColor: accent.purple + '40' }]}
                          onPress={() => handleAIImprove(option.instruction)}
                        >
                          <Text style={[styles.aiAssistChipText, { color: textPrimary }]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={[styles.aiAssistLabel, { color: textSecondary, marginTop: spacing[3] }]}>
                      Custom Instruction
                    </Text>
                    <View style={styles.customInstructionRow}>
                      <TextInput
                        style={[
                          styles.customInstructionInput,
                          { backgroundColor: background, color: textPrimary, borderColor: border },
                        ]}
                        value={aiCustomInstruction}
                        onChangeText={setAICustomInstruction}
                        placeholder="e.g., Add more detail about..."
                        placeholderTextColor={textSecondary}
                        onKeyPress={(e: any) => {
                          if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
                            e.preventDefault();
                            if (aiCustomInstruction.trim()) {
                              handleAIImprove(aiCustomInstruction);
                            }
                          }
                        }}
                      />
                      <TouchableOpacity
                        style={[
                          styles.customInstructionBtn,
                          { backgroundColor: aiCustomInstruction.trim() ? accent.purple : surfaceHover },
                        ]}
                        onPress={() => handleAIImprove(aiCustomInstruction)}
                        disabled={!aiCustomInstruction.trim()}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color={aiCustomInstruction.trim() ? '#fff' : textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: border }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.cancelBtnText, { color: textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accent.orange }]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    height: '92%',
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: spacing[4],
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[3],
    padding: spacing[4],
    paddingTop: 0,
  },
  editLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: spacing[2],
    marginTop: spacing[3],
  },
  editInput: {
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.sizes.sm,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cardTypeToggle: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  cardTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
  },
  cardTypeBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  mcOptionsContainer: {
    marginTop: spacing[3],
  },
  mcOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.md,
  },
  regenerateBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  mcOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  mcOptionIndicator: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mcOptionIndicatorText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  mcOptionInput: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.sizes.sm,
    borderWidth: 1,
  },
  aiAssistToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    marginTop: spacing[3],
  },
  aiAssistToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  aiAssistToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  aiAssistPanel: {
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
  },
  aiAssistLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  aiAssistChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  aiAssistChip: {
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  aiAssistChipText: {
    fontSize: typography.sizes.sm,
  },
  customInstructionRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  customInstructionInput: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    fontSize: typography.sizes.sm,
    borderWidth: 1,
  },
  customInstructionBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiImprovingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  aiImprovingText: {
    fontSize: typography.sizes.sm,
  },
  cancelBtn: {
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  saveBtn: {
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
});
