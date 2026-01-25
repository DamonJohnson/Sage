import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTheme } from '@/contexts/ThemeContext';
import { deleteAccount } from '@/services';
import { ReviewSettingsModal, ShortcutKeyEditor } from '@/components/settings';
import { Footer } from '@/components/layout';
import type { KeyboardBindings } from '@sage/shared';
import { spacing, typography, borderRadius, shadows } from '@/theme';

// Reusable hover hook
function useHoverState() {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};
  return { isHovered, webProps };
}

// Theme button with hover
function ThemeButton({
  theme,
  isSelected,
  onPress,
  surfaceHover,
  textSecondary,
  accent,
}: {
  theme: 'light' | 'dark' | 'system';
  isSelected: boolean;
  onPress: () => void;
  surfaceHover: string;
  textSecondary: string;
  accent: { orange: string };
}) {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  return (
    <TouchableOpacity
      style={[
        styles.themeButton,
        {
          backgroundColor: isSelected ? accent.orange : (isHovered ? accent.orange + '30' : surfaceHover),
        },
        Platform.OS === 'web' && { cursor: 'pointer', transition: 'background-color 150ms ease' } as any,
      ]}
      onPress={onPress}
      {...webProps}
    >
      <Text
        style={[
          styles.themeButtonText,
          { color: isSelected ? '#FFFFFF' : (isHovered ? accent.orange : textSecondary) },
          isSelected && { fontWeight: '500' },
        ]}
      >
        {theme.charAt(0).toUpperCase() + theme.slice(1)}
      </Text>
    </TouchableOpacity>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, settings, updateSettings, signOut, isLoading } = useAuthStore();
  const { themeSetting, setTheme } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReviewSettings, setShowReviewSettings] = useState(false);

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await signOut();
  };

  const handleDeleteAccount = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your decks, cards, and study progress will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await deleteAccount();
      if (response.success) {
        await signOut();
        Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      } else {
        Alert.alert('Error', response.error || 'Failed to delete account. Please try again.');
      }
    } catch (error) {
      // If backend fails, still sign out locally
      await signOut();
      Alert.alert('Account Deleted', 'Your local data has been cleared.');
    } finally {
      setIsDeleting(false);
    }
  };
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  // Hover states
  const backBtn = useHoverState();
  const reviewSettingsBtn = useHoverState();
  const keyboardShortcutsBtn = useHoverState();
  const exportDataBtn = useHoverState();
  const signOutBtn = useHoverState();
  const deleteAccountBtn = useHoverState();
  const privacyPolicyBtn = useHoverState();
  const termsBtn = useHoverState();
  const contactBtn = useHoverState();
  const bugReportBtn = useHoverState();

  // Keyboard shortcuts settings (web only)
  const keyboardShortcuts = settings.keyboardShortcuts || {
    enabled: true,
    showHints: true,
    bindings: {
      flipCard: 'Space',
      rateAgain: '1',
      rateHard: '2',
      rateGood: '3',
      rateEasy: '4',
      closeStudy: 'Escape',
      mcOption1: '1',
      mcOption2: '2',
      mcOption3: '3',
      mcOption4: '4',
      mcSubmit: 'Enter',
    },
  };

  const DEFAULT_BINDINGS: KeyboardBindings = {
    flipCard: 'Space',
    rateAgain: '1',
    rateHard: '2',
    rateGood: '3',
    rateEasy: '4',
    closeStudy: 'Escape',
    mcOption1: '1',
    mcOption2: '2',
    mcOption3: '3',
    mcOption4: '4',
    mcSubmit: 'Enter',
  };

  const handleKeyboardShortcutsToggle = (key: 'enabled' | 'showHints', value: boolean) => {
    Haptics.selectionAsync();
    updateSettings({
      keyboardShortcuts: {
        ...keyboardShortcuts,
        [key]: value,
      },
    });
  };

  const handleKeyBindingChange = (bindingKey: keyof KeyboardBindings, newKey: string) => {
    Haptics.selectionAsync();
    updateSettings({
      keyboardShortcuts: {
        ...keyboardShortcuts,
        bindings: {
          ...keyboardShortcuts.bindings,
          [bindingKey]: newKey,
        },
      },
    });
  };

  const handleResetShortcuts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings({
      keyboardShortcuts: {
        ...keyboardShortcuts,
        bindings: DEFAULT_BINDINGS,
      },
    });
  };

  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer' as const,
    transition: 'background-color 150ms ease',
  } as any : {};

  // Responsive values
  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    Haptics.selectionAsync();
    updateSettings({ [key]: value });
  };

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
          style={[
            styles.backButton,
            { backgroundColor: backBtn.isHovered ? surfaceHover : surface },
            webButtonStyle,
          ]}
          onPress={() => navigation.goBack()}
          {...backBtn.webProps}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Appearance</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={20} color={textSecondary} />
                <Text style={[styles.settingLabel, { color: textPrimary }]}>Dark Mode</Text>
              </View>
              <View style={styles.themeButtons}>
                {(['light', 'dark', 'system'] as const).map((theme) => (
                  <ThemeButton
                    key={theme}
                    theme={theme}
                    isSelected={themeSetting === theme}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setTheme(theme);
                    }}
                    surfaceHover={surfaceHover}
                    textSecondary={textSecondary}
                    accent={accent}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Study Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Study</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            {Platform.OS !== 'web' && (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="phone-portrait-outline" size={20} color={textSecondary} />
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>Haptic Feedback</Text>
                  </View>
                  <Switch
                    value={settings.hapticFeedback}
                    onValueChange={(value) => handleToggle('hapticFeedback', value)}
                    trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
                    thumbColor={settings.hapticFeedback ? accent.orange : surfaceHover}
                  />
                </View>

                <View style={[styles.settingDivider, { backgroundColor: border }]} />
              </>
            )}

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="volume-high-outline" size={20} color={textSecondary} />
                <Text style={[styles.settingLabel, { color: textPrimary }]}>Sound Effects</Text>
              </View>
              <Switch
                value={settings.soundEffects}
                onValueChange={(value) => handleToggle('soundEffects', value)}
                trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
                thumbColor={settings.soundEffects ? accent.orange : surfaceHover}
              />
            </View>

            <View style={[styles.settingDivider, { backgroundColor: border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="flag-outline" size={20} color={textSecondary} />
                <View>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Daily Goal</Text>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>{settings.dailyGoal} cards per day</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textSecondary} />
            </View>
          </View>
        </View>

        {/* Keyboard Shortcuts - Web only */}
        {Platform.OS === 'web' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondary }]}>Keyboard Shortcuts</Text>
            <View style={[styles.settingsCard, { backgroundColor: surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="keypad-outline" size={20} color={textSecondary} />
                  <View>
                    <Text style={[styles.settingLabel, { color: textPrimary }]}>Enable Shortcuts</Text>
                    <Text style={[styles.settingDescription, { color: textSecondary }]}>Use keyboard to rate cards and navigate</Text>
                  </View>
                </View>
                <Switch
                  value={keyboardShortcuts.enabled}
                  onValueChange={(value) => handleKeyboardShortcutsToggle('enabled', value)}
                  trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
                  thumbColor={keyboardShortcuts.enabled ? accent.orange : surfaceHover}
                />
              </View>

              {keyboardShortcuts.enabled && (
                <>
                  <View style={[styles.settingDivider, { backgroundColor: border }]} />
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons name="eye-outline" size={20} color={textSecondary} />
                      <View>
                        <Text style={[styles.settingLabel, { color: textPrimary }]}>Show Key Hints</Text>
                        <Text style={[styles.settingDescription, { color: textSecondary }]}>Display keyboard shortcuts on buttons</Text>
                      </View>
                    </View>
                    <Switch
                      value={keyboardShortcuts.showHints}
                      onValueChange={(value) => handleKeyboardShortcutsToggle('showHints', value)}
                      trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
                      thumbColor={keyboardShortcuts.showHints ? accent.orange : surfaceHover}
                    />
                  </View>

                  <View style={[styles.settingDivider, { backgroundColor: border }]} />
                  <View style={[styles.keyboardShortcutsList, { backgroundColor: surfaceHover }]}>
                    <View style={styles.shortcutsHeaderRow}>
                      <Text style={[styles.shortcutsHeader, { color: textSecondary }]}>Study Shortcuts</Text>
                      <TouchableOpacity
                        style={[styles.resetButton, { backgroundColor: surface }]}
                        onPress={handleResetShortcuts}
                      >
                        <Text style={[styles.resetButtonText, { color: accent.orange }]}>Reset</Text>
                      </TouchableOpacity>
                    </View>
                    <ShortcutKeyEditor
                      label="Flip Card"
                      currentKey={keyboardShortcuts.bindings?.flipCard || 'Space'}
                      onKeyChange={(key) => handleKeyBindingChange('flipCard', key)}
                    />
                    <ShortcutKeyEditor
                      label="Rate Again"
                      currentKey={keyboardShortcuts.bindings?.rateAgain || '1'}
                      onKeyChange={(key) => handleKeyBindingChange('rateAgain', key)}
                    />
                    <ShortcutKeyEditor
                      label="Rate Hard"
                      currentKey={keyboardShortcuts.bindings?.rateHard || '2'}
                      onKeyChange={(key) => handleKeyBindingChange('rateHard', key)}
                    />
                    <ShortcutKeyEditor
                      label="Rate Good"
                      currentKey={keyboardShortcuts.bindings?.rateGood || '3'}
                      onKeyChange={(key) => handleKeyBindingChange('rateGood', key)}
                    />
                    <ShortcutKeyEditor
                      label="Rate Easy"
                      currentKey={keyboardShortcuts.bindings?.rateEasy || '4'}
                      onKeyChange={(key) => handleKeyBindingChange('rateEasy', key)}
                    />
                    <ShortcutKeyEditor
                      label="Exit Study"
                      currentKey={keyboardShortcuts.bindings?.closeStudy || 'Escape'}
                      onKeyChange={(key) => handleKeyBindingChange('closeStudy', key)}
                    />

                    <Text style={[styles.shortcutsHeader, styles.shortcutsSubheader, { color: textSecondary }]}>Multiple Choice</Text>
                    <ShortcutKeyEditor
                      label="Option 1"
                      currentKey={keyboardShortcuts.bindings?.mcOption1 || '1'}
                      onKeyChange={(key) => handleKeyBindingChange('mcOption1', key)}
                    />
                    <ShortcutKeyEditor
                      label="Option 2"
                      currentKey={keyboardShortcuts.bindings?.mcOption2 || '2'}
                      onKeyChange={(key) => handleKeyBindingChange('mcOption2', key)}
                    />
                    <ShortcutKeyEditor
                      label="Option 3"
                      currentKey={keyboardShortcuts.bindings?.mcOption3 || '3'}
                      onKeyChange={(key) => handleKeyBindingChange('mcOption3', key)}
                    />
                    <ShortcutKeyEditor
                      label="Option 4"
                      currentKey={keyboardShortcuts.bindings?.mcOption4 || '4'}
                      onKeyChange={(key) => handleKeyBindingChange('mcOption4', key)}
                    />
                    <ShortcutKeyEditor
                      label="Submit Answer"
                      currentKey={keyboardShortcuts.bindings?.mcSubmit || 'Enter'}
                      onKeyChange={(key) => handleKeyBindingChange('mcSubmit', key)}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Notifications - Mobile only */}
        {isMobile && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textSecondary }]}>Notifications</Text>
            <View style={[styles.settingsCard, { backgroundColor: surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Ionicons name="notifications-outline" size={20} color={textSecondary} />
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Push Notifications</Text>
                </View>
                <Switch
                  value={settings.notificationsEnabled}
                  onValueChange={(value) => handleToggle('notificationsEnabled', value)}
                  trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
                  thumbColor={settings.notificationsEnabled ? accent.orange : surfaceHover}
                />
              </View>

              {settings.notificationsEnabled && (
                <>
                  <View style={[styles.settingDivider, { backgroundColor: border }]} />
                  <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                      <Ionicons name="time-outline" size={20} color={textSecondary} />
                      <View>
                        <Text style={[styles.settingLabel, { color: textPrimary }]}>Reminder Time</Text>
                        <Text style={[styles.settingDescription, { color: textSecondary }]}>{settings.reminderTime}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* SRS Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Smart Scheduling</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            <TouchableOpacity
              style={[
                styles.settingRow,
                reviewSettingsBtn.isHovered && { backgroundColor: surfaceHover },
                webButtonStyle,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowReviewSettings(true);
              }}
              {...reviewSettingsBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="calendar-outline" size={20} color={textSecondary} />
                <View>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Review Settings</Text>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>Customize spaced repetition parameters</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={reviewSettingsBtn.isHovered ? accent.orange : textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Privacy</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="eye-outline" size={20} color={textSecondary} />
                <View>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Public Activity</Text>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>Show your study activity to followers</Text>
                </View>
              </View>
              <Switch
                value={settings.activityPublic}
                onValueChange={(value) => handleToggle('activityPublic', value)}
                trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
                thumbColor={settings.activityPublic ? accent.orange : surfaceHover}
              />
            </View>

            <View style={[styles.settingDivider, { backgroundColor: border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="globe-outline" size={20} color={textSecondary} />
                <View>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Discoverable Profile</Text>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>Let others find and follow you</Text>
                </View>
              </View>
              <Switch
                value={settings.profilePublic}
                onValueChange={(value) => handleToggle('profilePublic', value)}
                trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
                thumbColor={settings.profilePublic ? accent.orange : surfaceHover}
              />
            </View>
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Data</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            <TouchableOpacity
              style={[
                styles.settingRow,
                exportDataBtn.isHovered && { backgroundColor: surfaceHover },
                webButtonStyle,
              ]}
              {...exportDataBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="cloud-upload-outline" size={20} color={textSecondary} />
                <Text style={[styles.settingLabel, { color: textPrimary }]}>Export Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={exportDataBtn.isHovered ? accent.orange : textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Account</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            {user && (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="person-outline" size={20} color={textSecondary} />
                    <View>
                      <Text style={[styles.settingLabel, { color: textPrimary }]}>{user.name}</Text>
                      <Text style={[styles.settingDescription, { color: textSecondary }]}>{user.email}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.settingDivider, { backgroundColor: border }]} />
              </>
            )}
            <TouchableOpacity
              style={[
                styles.settingRow,
                signOutBtn.isHovered && { backgroundColor: '#FEF2F2' },
                webButtonStyle,
              ]}
              onPress={handleSignOut}
              disabled={isLoading}
              {...signOutBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={[styles.settingLabel, { color: '#EF4444' }]}>
                  {isLoading ? 'Signing out...' : 'Sign Out'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Support</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            <TouchableOpacity
              style={[
                styles.settingRow,
                contactBtn.isHovered && { backgroundColor: surfaceHover },
                webButtonStyle,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                Linking.openURL('mailto:damonjohnson138@gmail.com?subject=Sage%20Support%20Request');
              }}
              {...contactBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="mail-outline" size={20} color={textSecondary} />
                <View>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Contact Support</Text>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>Get help with your account</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={contactBtn.isHovered ? accent.orange : textSecondary} />
            </TouchableOpacity>

            <View style={[styles.settingDivider, { backgroundColor: border }]} />

            <TouchableOpacity
              style={[
                styles.settingRow,
                bugReportBtn.isHovered && { backgroundColor: surfaceHover },
                webButtonStyle,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                Linking.openURL('mailto:damonjohnson138@gmail.com?subject=Sage%20Bug%20Report&body=Please%20describe%20the%20bug%20you%20encountered%3A%0A%0ASteps%20to%20reproduce%3A%0A1.%20%0A2.%20%0A3.%20%0A%0AExpected%20behavior%3A%0A%0AActual%20behavior%3A%0A%0ADevice%20info%3A');
              }}
              {...bugReportBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="bug-outline" size={20} color={textSecondary} />
                <View>
                  <Text style={[styles.settingLabel, { color: textPrimary }]}>Report a Bug</Text>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>Help us improve the app</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={bugReportBtn.isHovered ? accent.orange : textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Legal</Text>
          <View style={[styles.settingsCard, { backgroundColor: surface }]}>
            <TouchableOpacity
              style={[
                styles.settingRow,
                privacyPolicyBtn.isHovered && { backgroundColor: surfaceHover },
                webButtonStyle,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                // TODO: Replace with actual privacy policy URL when available
                Alert.alert('Privacy Policy', 'Privacy policy coming soon. For questions, contact damonjohnson138@gmail.com');
              }}
              {...privacyPolicyBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="shield-checkmark-outline" size={20} color={textSecondary} />
                <Text style={[styles.settingLabel, { color: textPrimary }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={privacyPolicyBtn.isHovered ? accent.orange : textSecondary} />
            </TouchableOpacity>

            <View style={[styles.settingDivider, { backgroundColor: border }]} />

            <TouchableOpacity
              style={[
                styles.settingRow,
                termsBtn.isHovered && { backgroundColor: surfaceHover },
                webButtonStyle,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                // TODO: Replace with actual terms URL when available
                Alert.alert('Terms of Service', 'Terms of service coming soon. For questions, contact damonjohnson138@gmail.com');
              }}
              {...termsBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="document-text-outline" size={20} color={textSecondary} />
                <Text style={[styles.settingLabel, { color: textPrimary }]}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={termsBtn.isHovered ? accent.orange : textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Danger Zone</Text>
          <View style={[styles.settingsCard, styles.dangerCard]}>
            <TouchableOpacity
              style={[
                styles.settingRow,
                deleteAccountBtn.isHovered && { backgroundColor: '#FEE2E2' },
                webButtonStyle,
              ]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              {...deleteAccountBtn.webProps}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <View>
                  <Text style={[styles.settingLabel, { color: '#EF4444' }]}>
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Text>
                  <Text style={[styles.settingDescription, { color: textSecondary }]}>
                    Permanently delete your account and all data
                  </Text>
                </View>
              </View>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#EF4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: spacing[6] }} />

        {/* Footer */}
        <Footer />

        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Review Settings Modal */}
      <ReviewSettingsModal
        visible={showReviewSettings}
        onClose={() => setShowReviewSettings(false)}
      />
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
  scrollContent: {
    paddingHorizontal: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
    marginLeft: spacing[1],
  },
  settingsCard: {
    borderRadius: borderRadius['2xl'],
    ...shadows.sm,
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.sizes.base,
    marginLeft: spacing[3],
  },
  settingDescription: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[3],
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    marginHorizontal: spacing[4],
  },
  themeButtons: {
    flexDirection: 'row',
  },
  themeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.lg,
    marginLeft: spacing[1],
  },
  themeButtonText: {
    fontSize: typography.sizes.sm,
  },
  keyboardShortcutsList: {
    margin: spacing[4],
    marginTop: 0,
    padding: spacing[4],
    borderRadius: borderRadius.xl,
  },
  shortcutsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  shortcutsHeader: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shortcutsSubheader: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  resetButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  resetButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
});
