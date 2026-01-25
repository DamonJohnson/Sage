import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';

// Reusable hover hook for web
function useHoverState() {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};
  return { isHovered, webProps };
}
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

import { useAuthStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { FSRSSettings } from '@sage/shared';

interface ReviewSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const DEFAULT_FSRS: FSRSSettings = {
  requestRetention: 0.9,
  maximumInterval: 365,
  newCardsPerDay: 20,
  reviewsPerDay: 0,
  learningSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
};

const SETTING_INFO: Record<string, { title: string; description: string }> = {
  retention: {
    title: 'Target Retention',
    description: '90% is recommended for most learners. Higher values (95%+) require more reviews but give better recall. Lower values (70-85%) reduce workload but you\'ll forget more cards.',
  },
  maxInterval: {
    title: 'Maximum Interval',
    description: 'The longest time between reviews (in days). The default of 365 days means you\'ll see every card at least once a year. Shorter intervals like 180 days provide more frequent review.',
  },
  newCards: {
    title: 'New Cards Per Day',
    description: 'How many new cards to introduce each day. Start with 10-20 and adjust based on your available study time. Remember: more new cards means more reviews in the future!',
  },
  reviews: {
    title: 'Reviews Per Day',
    description: 'Maximum review cards per day. Set to 0 for unlimited (recommended). Setting a limit helps manage time but may cause cards to pile up.',
  },
  learningSteps: {
    title: 'Learning Steps',
    description: 'When you first learn a new card, how many times should you practice it in that session before moving on? More repetitions help lock it into memory before the next day.',
  },
  graduating: {
    title: 'First Review',
    description: 'After completing the learning steps above, when should you see the card again? 1 day means you\'ll review it tomorrow. This is the starting point for longer intervals.',
  },
  easy: {
    title: 'Easy Interval',
    description: 'When you press "Easy" on a new card, it skips learning steps entirely and uses this interval. 4 days works well for cards you already know.',
  },
};

const LEARNING_STEP_PRESETS = [
  { id: 'quick', label: 'Quick', description: 'Review once per session', steps: [1] },
  { id: 'standard', label: 'Standard', description: 'Review 2x per session', steps: [1, 10] },
  { id: 'thorough', label: 'Thorough', description: 'Review 3x per session', steps: [1, 10, 60] },
];

const getPresetFromSteps = (steps: number[]): string => {
  if (steps.length === 1) return 'quick';
  if (steps.length === 3 && steps[2] === 60) return 'thorough';
  return 'standard';
};

// Preset button with hover
function PresetButton({
  preset,
  isSelected,
  onPress,
  surface,
  surfaceHover,
  border,
  textPrimary,
  textSecondary,
  accent,
}: {
  preset: { id: string; label: string; description: string };
  isSelected: boolean;
  onPress: () => void;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: { orange: string };
}) {
  const { isHovered, webProps } = useHoverState();

  return (
    <TouchableOpacity
      style={[
        styles.presetButton,
        {
          backgroundColor: isSelected ? accent.orange : (isHovered ? surfaceHover : surface),
          borderColor: isSelected ? accent.orange : (isHovered ? accent.orange : border),
        },
        Platform.OS === 'web' && { cursor: 'pointer', transition: 'background-color 150ms ease, border-color 150ms ease' } as any,
      ]}
      onPress={onPress}
      {...webProps}
    >
      <Text
        style={[
          styles.presetLabel,
          { color: isSelected ? '#FFFFFF' : (isHovered ? accent.orange : textPrimary) },
        ]}
      >
        {preset.label}
      </Text>
      <Text
        style={[
          styles.presetDescription,
          { color: isSelected ? 'rgba(255,255,255,0.8)' : textSecondary },
        ]}
      >
        {preset.description}
      </Text>
    </TouchableOpacity>
  );
}

const PLAYFUL_WARNINGS = [
  "Whoa there, underachiever! 😅 Your brain is capable of so much more. How about we aim for 90%?",
  "Setting the bar low, are we? 🤨 C'mon, you didn't download a flashcard app to forget things!",
  "80%? That's like ordering a pizza and throwing away two slices! 🍕 Let's bump that up to 90%.",
  "Your future self is giving you the side-eye right now. 👀 90% is where the magic happens!",
  "Bold strategy, Cotton. Let's see if forgetting 20%+ of everything pays off... or maybe try 90%? 🏆",
];

export function ReviewSettingsModal({ visible, onClose }: ReviewSettingsModalProps) {
  const { settings, updateSettings } = useAuthStore();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  // Get fsrs settings with fallback to defaults
  const fsrsSettings = settings.fsrs ?? DEFAULT_FSRS;

  // Local state for editing
  const [localSettings, setLocalSettings] = useState<FSRSSettings>(fsrsSettings);
  const [selectedPreset, setSelectedPreset] = useState(() => getPresetFromSteps(fsrsSettings.learningSteps));
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);
  const [hasShownLowRetentionWarning, setHasShownLowRetentionWarning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Hover states
  const cancelBtn = useHoverState();
  const saveBtn = useHoverState();
  const fsrsInfoBtn = useHoverState();
  const advancedToggleBtn = useHoverState();
  const resetBtn = useHoverState();

  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer' as const,
    transition: 'background-color 150ms ease, transform 150ms ease',
  } as any : {};

  const toggleInfo = (key: string) => {
    Haptics.selectionAsync();
    setExpandedInfo(expandedInfo === key ? null : key);
  };

  useEffect(() => {
    if (visible) {
      const currentFsrs = settings.fsrs ?? DEFAULT_FSRS;
      setLocalSettings(currentFsrs);
      setSelectedPreset(getPresetFromSteps(currentFsrs.learningSteps));
      setHasShownLowRetentionWarning(false);
      setExpandedInfo(null);
      setShowAdvanced(false);
    }
  }, [visible, settings.fsrs]);

  const handleRetentionChange = (value: number) => {
    updateLocalSetting('requestRetention', value);

    // Show playful warning if dropping below 80% for the first time
    if (value < 0.8 && !hasShownLowRetentionWarning) {
      setHasShownLowRetentionWarning(true);
      const randomWarning = PLAYFUL_WARNINGS[Math.floor(Math.random() * PLAYFUL_WARNINGS.length)];

      Alert.alert(
        "Really? 🤔",
        randomWarning,
        [
          {
            text: "Fine, 90% it is",
            onPress: () => updateLocalSetting('requestRetention', 0.9),
          },
          {
            text: "I like to live dangerously",
            style: 'cancel',
          },
        ]
      );
    }
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({ fsrs: localSettings });
    onClose();
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalSettings(DEFAULT_FSRS);
    setSelectedPreset('standard');
  };

  const updateLocalSetting = <K extends keyof FSRSSettings>(key: K, value: FSRSSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePresetChange = (presetId: string) => {
    Haptics.selectionAsync();
    setSelectedPreset(presetId);
    const preset = LEARNING_STEP_PRESETS.find(p => p.id === presetId);
    if (preset) {
      updateLocalSetting('learningSteps', preset.steps);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.headerButton, webButtonStyle]}
            {...cancelBtn.webProps}
          >
            <Text style={[
              styles.headerButtonText,
              { color: accent.orange },
              cancelBtn.isHovered && { opacity: 0.7 },
            ]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Review Settings</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.headerButton, webButtonStyle]}
            {...saveBtn.webProps}
          >
            <Text style={[
              styles.headerButtonText,
              { color: accent.orange, fontWeight: '600' },
              saveBtn.isHovered && { opacity: 0.7 },
            ]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* FSRS Explanation */}
          <TouchableOpacity
            style={[
              styles.fsrsInfoHeader,
              { backgroundColor: fsrsInfoBtn.isHovered ? surfaceHover : surface },
              webButtonStyle,
            ]}
            onPress={() => toggleInfo('fsrsExplainer')}
            {...fsrsInfoBtn.webProps}
          >
            <View style={styles.fsrsInfoHeaderLeft}>
              <Ionicons name="sparkles" size={20} color={accent.orange} />
              <Text style={[styles.fsrsInfoTitle, { color: textPrimary }]}>How Smart Scheduling Works</Text>
            </View>
            <Ionicons
              name={expandedInfo === 'fsrsExplainer' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>
          {expandedInfo === 'fsrsExplainer' && (
            <View style={[styles.fsrsExplainer, { backgroundColor: surfaceHover }]}>
              <Text style={[styles.fsrsExplainerText, { color: textPrimary }]}>
                Sage uses <Text style={{ fontWeight: '600' }}>FSRS</Text> (Free Spaced Repetition Scheduler), a research-backed algorithm that models how your memory actually works. It tracks two key things:
              </Text>

              <View style={styles.fsrsConceptRow}>
                <View style={[styles.fsrsConceptBadge, { backgroundColor: accent.green + '20' }]}>
                  <Ionicons name="time-outline" size={16} color={accent.green} />
                </View>
                <View style={styles.fsrsConceptText}>
                  <Text style={[styles.fsrsConceptTitle, { color: textPrimary }]}>Memory Stability</Text>
                  <Text style={[styles.fsrsConceptDesc, { color: textSecondary }]}>
                    How long you'll remember something. A card with high stability might not need review for months.
                  </Text>
                </View>
              </View>

              <View style={styles.fsrsConceptRow}>
                <View style={[styles.fsrsConceptBadge, { backgroundColor: accent.orange + '20' }]}>
                  <Ionicons name="analytics-outline" size={16} color={accent.orange} />
                </View>
                <View style={styles.fsrsConceptText}>
                  <Text style={[styles.fsrsConceptTitle, { color: textPrimary }]}>Recall Probability</Text>
                  <Text style={[styles.fsrsConceptDesc, { color: textSecondary }]}>
                    The chance you'll remember a card at any given moment. This naturally decreases over time.
                  </Text>
                </View>
              </View>

              <Text style={[styles.fsrsExplainerText, { color: textPrimary, marginTop: spacing[3] }]}>
                When you rate a card, the algorithm updates its understanding of that card's difficulty and your memory of it. Cards you find easy are shown less often; cards you struggle with are shown more frequently.
              </Text>

              <Text style={[styles.fsrsExplainerText, { color: textSecondary, marginTop: spacing[2], fontStyle: 'italic' }]}>
                The default settings below are optimized for most learners. Feel free to adjust them, but the algorithm works best when you let it adapt to you naturally.
              </Text>
            </View>
          )}

          {/* Request Retention */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Target Retention</Text>
                <TouchableOpacity
                  onPress={() => toggleInfo('retention')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={expandedInfo === 'retention' ? 'information-circle' : 'information-circle-outline'}
                    size={16}
                    color={expandedInfo === 'retention' ? accent.orange : textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionValue, { color: accent.orange }]}>
                {Math.round(localSettings.requestRetention * 100)}%
              </Text>
            </View>
            {expandedInfo === 'retention' && (
              <View style={[styles.infoDropdown, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.infoDropdownText, { color: textSecondary }]}>
                  {SETTING_INFO.retention.description}
                </Text>
              </View>
            )}
            <Slider
              style={styles.slider}
              minimumValue={0.7}
              maximumValue={0.97}
              step={0.01}
              value={localSettings.requestRetention}
              onValueChange={handleRetentionChange}
              minimumTrackTintColor={accent.orange}
              maximumTrackTintColor={surfaceHover}
              thumbTintColor={accent.orange}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: textSecondary }]}>70%</Text>
              <Text style={[styles.sliderLabel, { color: textSecondary }]}>97%</Text>
            </View>
          </View>

          {/* Advanced Settings Toggle */}
          <TouchableOpacity
            style={[
              styles.advancedToggle,
              { backgroundColor: advancedToggleBtn.isHovered ? surfaceHover : surface },
              webButtonStyle,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setShowAdvanced(!showAdvanced);
            }}
            {...advancedToggleBtn.webProps}
          >
            <View style={styles.advancedToggleLeft}>
              <Ionicons name="settings-outline" size={20} color={textSecondary} />
              <Text style={[styles.advancedToggleText, { color: textPrimary }]}>Advanced Review Settings</Text>
            </View>
            <Ionicons
              name={showAdvanced ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={textSecondary}
            />
          </TouchableOpacity>

          {showAdvanced && (
          <>
          {/* Maximum Interval */}
          <View style={styles.settingWrapper}>
            <View style={[styles.settingRow, { backgroundColor: surface }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="calendar-outline" size={20} color={textSecondary} />
                <View style={styles.settingTextContainer}>
                  <View style={styles.settingLabelRow}>
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>Maximum Interval</Text>
                    <TouchableOpacity
                      onPress={() => toggleInfo('maxInterval')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={expandedInfo === 'maxInterval' ? 'information-circle' : 'information-circle-outline'}
                        size={16}
                        color={expandedInfo === 'maxInterval' ? accent.orange : textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>
                    Longest time between reviews (days)
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                value={String(localSettings.maximumInterval)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 1) {
                    updateLocalSetting('maximumInterval', Math.min(num, 365));
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            {expandedInfo === 'maxInterval' && (
              <View style={[styles.infoDropdown, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.infoDropdownText, { color: textSecondary }]}>
                  {SETTING_INFO.maxInterval.description}
                </Text>
              </View>
            )}
          </View>

          {/* New Cards Per Day */}
          <View style={styles.settingWrapper}>
            <View style={[styles.settingRow, { backgroundColor: surface }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="add-circle-outline" size={20} color={textSecondary} />
                <View style={styles.settingTextContainer}>
                  <View style={styles.settingLabelRow}>
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>New Cards / Day</Text>
                    <TouchableOpacity
                      onPress={() => toggleInfo('newCards')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={expandedInfo === 'newCards' ? 'information-circle' : 'information-circle-outline'}
                        size={16}
                        color={expandedInfo === 'newCards' ? accent.orange : textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>
                    New cards to introduce daily
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                value={String(localSettings.newCardsPerDay)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 0) {
                    updateLocalSetting('newCardsPerDay', Math.min(num, 9999));
                  }
                }}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            {expandedInfo === 'newCards' && (
              <View style={[styles.infoDropdown, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.infoDropdownText, { color: textSecondary }]}>
                  {SETTING_INFO.newCards.description}
                </Text>
              </View>
            )}
          </View>

          {/* Reviews Per Day */}
          <View style={styles.settingWrapper}>
            <View style={[styles.settingRow, { backgroundColor: surface }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="refresh-outline" size={20} color={textSecondary} />
                <View style={styles.settingTextContainer}>
                  <View style={styles.settingLabelRow}>
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>Reviews / Day</Text>
                    <TouchableOpacity
                      onPress={() => toggleInfo('reviews')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={expandedInfo === 'reviews' ? 'information-circle' : 'information-circle-outline'}
                        size={16}
                        color={expandedInfo === 'reviews' ? accent.orange : textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>
                    Review limit per day (0 = unlimited)
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                value={String(localSettings.reviewsPerDay)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 0) {
                    updateLocalSetting('reviewsPerDay', Math.min(num, 9999));
                  }
                }}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0"
                placeholderTextColor={textSecondary}
              />
            </View>
            {expandedInfo === 'reviews' && (
              <View style={[styles.infoDropdown, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.infoDropdownText, { color: textSecondary }]}>
                  {SETTING_INFO.reviews.description}
                </Text>
              </View>
            )}
          </View>

          {/* Learning Steps */}
          <View style={styles.settingWrapper}>
            <View style={[styles.learningStepsHeader, { backgroundColor: surface }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="footsteps-outline" size={20} color={textSecondary} />
                <View style={styles.settingTextContainer}>
                  <View style={styles.settingLabelRow}>
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>Learning Steps</Text>
                    <TouchableOpacity
                      onPress={() => toggleInfo('learningSteps')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={expandedInfo === 'learningSteps' ? 'information-circle' : 'information-circle-outline'}
                        size={16}
                        color={expandedInfo === 'learningSteps' ? accent.orange : textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>
                    Repetitions before moving on
                  </Text>
                </View>
              </View>
            </View>
            {expandedInfo === 'learningSteps' && (
              <View style={[styles.infoDropdown, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.infoDropdownText, { color: textSecondary }]}>
                  {SETTING_INFO.learningSteps.description}
                </Text>
              </View>
            )}
            <View style={styles.presetContainer}>
              {LEARNING_STEP_PRESETS.map((preset) => (
                <PresetButton
                  key={preset.id}
                  preset={preset}
                  isSelected={selectedPreset === preset.id}
                  onPress={() => handlePresetChange(preset.id)}
                  surface={surface}
                  surfaceHover={surfaceHover}
                  border={border}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  accent={accent}
                />
              ))}
            </View>
          </View>

          {/* First Review (Graduating Interval) */}
          <View style={styles.settingWrapper}>
            <View style={[styles.settingRow, { backgroundColor: surface }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="calendar-outline" size={20} color={textSecondary} />
                <View style={styles.settingTextContainer}>
                  <View style={styles.settingLabelRow}>
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>First Review</Text>
                    <TouchableOpacity
                      onPress={() => toggleInfo('graduating')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={expandedInfo === 'graduating' ? 'information-circle' : 'information-circle-outline'}
                        size={16}
                        color={expandedInfo === 'graduating' ? accent.orange : textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>
                    Days until first review after learning
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                value={String(localSettings.graduatingInterval)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 1) {
                    updateLocalSetting('graduatingInterval', Math.min(num, 365));
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            {expandedInfo === 'graduating' && (
              <View style={[styles.infoDropdown, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.infoDropdownText, { color: textSecondary }]}>
                  {SETTING_INFO.graduating.description}
                </Text>
              </View>
            )}
          </View>

          {/* Easy Interval */}
          <View style={styles.settingWrapper}>
            <View style={[styles.settingRow, { backgroundColor: surface }]}>
              <View style={styles.settingInfo}>
                <Ionicons name="flash-outline" size={20} color={textSecondary} />
                <View style={styles.settingTextContainer}>
                  <View style={styles.settingLabelRow}>
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>Easy Interval</Text>
                    <TouchableOpacity
                      onPress={() => toggleInfo('easy')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={expandedInfo === 'easy' ? 'information-circle' : 'information-circle-outline'}
                        size={16}
                        color={expandedInfo === 'easy' ? accent.orange : textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>
                    Interval when pressing Easy on new card (days)
                  </Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { backgroundColor: surfaceHover, color: textPrimary }]}
                value={String(localSettings.easyInterval)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 1) {
                    updateLocalSetting('easyInterval', Math.min(num, 365));
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            {expandedInfo === 'easy' && (
              <View style={[styles.infoDropdown, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.infoDropdownText, { color: textSecondary }]}>
                  {SETTING_INFO.easy.description}
                </Text>
              </View>
            )}
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[
              styles.resetButton,
              { backgroundColor: resetBtn.isHovered ? accent.red + '15' : surface },
              webButtonStyle,
            ]}
            onPress={handleReset}
            {...resetBtn.webProps}
          >
            <Ionicons name="refresh" size={20} color={accent.red} />
            <Text style={[styles.resetButtonText, { color: accent.red }]}>Reset to Defaults</Text>
          </TouchableOpacity>
          </>
          )}

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: accent.orange + '15' }]}>
            <Ionicons name="bulb-outline" size={20} color={accent.orange} />
            <Text style={[styles.infoText, { color: textSecondary }]}>
              These settings are based on memory science research. The defaults work well for most people. Only adjust if you have specific needs.
            </Text>
          </View>

          <View style={{ height: spacing[10] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: typography.sizes.base,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  sectionValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
  },
  sliderLabel: {
    fontSize: typography.sizes.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: spacing[3],
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  numberInput: {
    width: 70,
    height: 40,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    textAlign: 'center',
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
  textInput: {
    width: 100,
    height: 40,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    textAlign: 'center',
    fontSize: typography.sizes.base,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    marginTop: spacing[4],
    ...shadows.sm,
  },
  resetButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
    marginLeft: spacing[2],
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    marginTop: spacing[6],
    gap: spacing[3],
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  settingWrapper: {
    marginBottom: spacing[3],
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  infoButton: {
    padding: spacing[1],
  },
  infoDropdown: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  infoDropdownText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  learningStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    ...shadows.sm,
  },
  presetContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  presetButton: {
    flex: 1,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  presetDescription: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  fsrsInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  fsrsInfoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  fsrsInfoTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  fsrsExplainer: {
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    marginBottom: spacing[6],
  },
  fsrsExplainerText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  fsrsConceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing[3],
    gap: spacing[3],
  },
  fsrsConceptBadge: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fsrsConceptText: {
    flex: 1,
  },
  fsrsConceptTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  fsrsConceptDesc: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  advancedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  advancedToggleText: {
    fontSize: typography.sizes.base,
    fontWeight: '500',
  },
});
