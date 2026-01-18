import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useAuthStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import { completeProfileSetup } from '@/services';
import { spacing, typography, borderRadius, shadows } from '@/theme';

const DAILY_GOAL_OPTIONS = [10, 40, 80];

interface ProfileSetupScreenProps {
  onComplete: () => void;
}

export function ProfileSetupScreen({ onComplete }: ProfileSetupScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, updateUser, updateSettings } = useAuthStore();
  const { background, surface, surfaceHover, textPrimary, textSecondary, accent, border } = useThemedColors();
  const { isDesktop, isTablet, isMobile } = useResponsive();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bio, setBio] = useState('');
  const [dailyGoal, setDailyGoal] = useState(40);
  const [isCustomGoal, setIsCustomGoal] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [enableReminders, setEnableReminders] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerWidth = isDesktop ? 500 : isTablet ? 450 : '100%';

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to set your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const sourceUri = result.assets[0].uri;

      // On native platforms, copy to permanent storage
      if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
        try {
          const fileName = `avatar-${Date.now()}.jpg`;
          const destUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: sourceUri, to: destUri });
          setAvatarUrl(destUri);
        } catch (error) {
          console.error('Failed to save avatar:', error);
          // Fall back to temporary URI
          setAvatarUrl(sourceUri);
        }
      } else {
        // On web, use the blob URL (will need backend upload for persistence)
        setAvatarUrl(sourceUri);
      }
    }
  };

  const validateUsername = (value: string): boolean => {
    // Username: 3-20 chars, alphanumeric and underscores only, first letter capitalized
    const usernameRegex = /^[A-Z][a-zA-Z0-9_]{2,19}$/;
    return usernameRegex.test(value);
  };

  const handleComplete = async () => {
    // Validate username (required)
    if (!username.trim()) {
      setError('Please choose a username');
      return;
    }
    if (!validateUsername(username.trim())) {
      setError('Username must be 3-20 characters (letters, numbers, underscores only)');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);

    try {
      const response = await completeProfileSetup({
        name: displayName.trim(),
        avatarUrl: avatarUrl || null,
        dailyGoal,
        studyReminders: enableReminders,
      });

      // Update local state with all profile data
      updateUser({
        name: displayName.trim(),
        avatarUrl: avatarUrl || null,
        // Store username in user object (we'd need to add this to the User type)
      });
      updateSettings({
        dailyGoal,
        notificationsEnabled: enableReminders,
      });

      onComplete();
    } catch (err) {
      // If backend fails, still allow continuing with local state
      updateUser({
        name: displayName.trim(),
        avatarUrl: avatarUrl || null,
      });
      updateSettings({
        dailyGoal,
        notificationsEnabled: enableReminders,
      });
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isMobile ? insets.top + spacing[6] : spacing[10],
          paddingBottom: insets.bottom + spacing[8],
          maxWidth: containerWidth,
          alignSelf: 'center',
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header - Simplified messaging */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>Almost There!</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Just a few quick details and you'll be ready to start learning.
        </Text>
      </View>

      {/* Profile Picture */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[accent.orange, '#E85D2B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarPlaceholder}
            >
              <Ionicons name="person" size={40} color="#FFFFFF" />
            </LinearGradient>
          )}
          <View style={[styles.editBadge, { backgroundColor: accent.orange }]}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickImage}>
          <Text style={[styles.changePhotoText, { color: accent.orange }]}>
            {avatarUrl ? 'Change Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Username Input (Required) */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: textPrimary }]}>
          Username <Text style={{ color: accent.red }}>*</Text>
        </Text>
        <Text style={[styles.helperText, { color: textSecondary }]}>
          This is how others will find you. Choose wisely - it's public!
        </Text>
        <View style={styles.usernameInputContainer}>
          <Text style={[styles.usernamePrefix, { color: textSecondary }]}>@</Text>
          <TextInput
            style={[
              styles.usernameInput,
              {
                backgroundColor: surface,
                color: textPrimary,
                borderColor: error && !username.trim() ? '#EF4444' : border,
              },
            ]}
            value={username}
            onChangeText={(text) => {
              // Keep alphanumeric and underscores, capitalize first letter
              const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '');
              const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
              setUsername(capitalized);
            }}
            placeholder="username"
            placeholderTextColor={textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
        </View>
      </View>

      {/* Display Name Input */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: textPrimary }]}>
          Display Name <Text style={{ color: accent.red }}>*</Text>
        </Text>
        <Text style={[styles.helperText, { color: textSecondary }]}>
          This is the name shown on your profile
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: surface,
              color: textPrimary,
              borderColor: error && !displayName.trim() ? '#EF4444' : border,
            },
          ]}
          value={displayName}
          onChangeText={(text) => {
            // Capitalize first letter
            const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
            setDisplayName(capitalized);
          }}
          placeholder="Your name"
          placeholderTextColor={textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      {/* Daily Goal - Simplified with clear labels and preset options only */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: textPrimary }]}>Daily study goal</Text>
        <Text style={[styles.helperText, { color: textSecondary }]}>
          You can change this anytime in Settings
        </Text>
        <View style={styles.goalOptions}>
          {[
            { value: 10, label: 'Light', desc: '~5 min/day' },
            { value: 40, label: 'Regular', desc: '~15 min/day' },
            { value: 80, label: 'Intensive', desc: '~30 min/day' },
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.goalOption,
                {
                  backgroundColor: dailyGoal === option.value ? accent.orange : surface,
                  borderColor: dailyGoal === option.value ? accent.orange : border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setDailyGoal(option.value);
              }}
            >
              <Text
                style={[
                  styles.goalOptionText,
                  { color: dailyGoal === option.value ? '#FFFFFF' : textPrimary },
                ]}
              >
                {option.value}
              </Text>
              <Text
                style={[
                  styles.goalOptionLabel,
                  { color: dailyGoal === option.value ? 'rgba(255,255,255,0.9)' : textPrimary },
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.goalOptionDesc,
                  { color: dailyGoal === option.value ? 'rgba(255,255,255,0.7)' : textSecondary },
                ]}
              >
                {option.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Study Reminders */}
      {Platform.OS !== 'web' && (
        <View style={[styles.section, styles.reminderSection]}>
          <View style={styles.reminderRow}>
            <View style={styles.reminderInfo}>
              <View style={[styles.reminderIcon, { backgroundColor: accent.orange + '20' }]}>
                <Ionicons name="notifications-outline" size={20} color={accent.orange} />
              </View>
              <View>
                <Text style={[styles.label, { color: textPrimary, marginBottom: 0 }]}>
                  Study Reminders
                </Text>
                <Text style={[styles.reminderDescription, { color: textSecondary }]}>
                  Get daily reminders to stay on track
                </Text>
              </View>
            </View>
            <Switch
              value={enableReminders}
              onValueChange={(value) => {
                Haptics.selectionAsync();
                setEnableReminders(value);
              }}
              trackColor={{ false: surfaceHover, true: accent.orange + '80' }}
              thumbColor={enableReminders ? accent.orange : surfaceHover}
            />
          </View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: accent.orange }]}
        onPress={handleComplete}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.continueButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.requiredNote, { color: textSecondary }]}>
        * Required fields
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    paddingHorizontal: spacing[6],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing[3],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing[5],
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  helperText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[3],
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernamePrefix: {
    fontSize: typography.sizes.lg,
    fontWeight: '500',
    marginRight: spacing[2],
  },
  usernameInput: {
    flex: 1,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    fontSize: typography.sizes.base,
  },
  input: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    fontSize: typography.sizes.base,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: spacing[4],
  },
  charCount: {
    fontSize: typography.sizes.xs,
    textAlign: 'right',
    marginTop: spacing[1],
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  goalOption: {
    flex: 1,
    minWidth: 70,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  goalOptionText: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
  },
  goalOptionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginTop: spacing[1],
  },
  goalOptionDesc: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
  },
  customGoalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    gap: spacing[3],
  },
  customGoalInput: {
    width: 100,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  customGoalLabel: {
    fontSize: typography.sizes.base,
  },
  reminderSection: {
    marginBottom: spacing[4],
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  reminderDescription: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  errorText: {
    color: '#EF4444',
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
    flex: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    marginTop: spacing[4],
    gap: spacing[2],
    ...shadows.md,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  requiredNote: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing[4],
    marginBottom: spacing[8],
  },
});
