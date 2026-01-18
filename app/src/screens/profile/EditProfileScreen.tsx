import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

import { useAuthStore } from '@/store';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import { updateProfile } from '@/services';
import { spacing, typography, borderRadius, shadows } from '@/theme';

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, updateUser } = useAuthStore();
  const { background, surface, surfaceHover, textPrimary, textSecondary, accent, border } = useThemedColors();
  const { isDesktop, isTablet, isMobile } = useResponsive();

  const [displayName, setDisplayName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const containerMaxWidth = isDesktop ? 600 : isTablet ? 500 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const handleNameChange = (value: string) => {
    setDisplayName(value);
    setHasChanges(true);
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant photo library access to change your avatar.');
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
          setHasChanges(true);
        } catch (error) {
          console.error('Failed to save avatar:', error);
          // Fall back to temporary URI
          setAvatarUrl(sourceUri);
          setHasChanges(true);
        }
      } else {
        // On web, use the blob URL
        setAvatarUrl(sourceUri);
        setHasChanges(true);
      }
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      // Try to sync with server
      await updateProfile({
        name: displayName.trim(),
        avatarUrl: avatarUrl || null,
      });
    } catch (error) {
      // Server sync failed, but we'll still save locally
      console.log('Server sync failed:', error);
    }

    // Always update locally and navigate back
    updateUser({
      name: displayName.trim(),
      avatarUrl: avatarUrl || null,
    });
    setIsLoading(false);
    navigation.goBack();
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
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Edit Profile</Text>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: hasChanges ? accent.orange : surfaceHover },
          ]}
          onPress={handleSave}
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[
              styles.saveButtonText,
              { color: hasChanges ? '#FFFFFF' : textSecondary },
            ]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handlePickImage}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: accent.orange }]}>
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={[styles.editBadge, { backgroundColor: accent.orange }]}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.changePhotoText, { color: accent.orange }]}>
            Change Photo
          </Text>
        </View>

        {/* Name Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: textSecondary }]}>Display Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: surface,
                color: textPrimary,
                borderColor: border,
              },
            ]}
            value={displayName}
            onChangeText={handleNameChange}
            placeholder="Enter your name"
            placeholderTextColor={textSecondary}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Email (Read-only) */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: textSecondary }]}>Email</Text>
          <View style={[styles.readOnlyInput, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.readOnlyText, { color: textSecondary }]}>
              {user?.email || ''}
            </Text>
            <Ionicons name="lock-closed-outline" size={16} color={textSecondary} />
          </View>
          <Text style={[styles.helperText, { color: textSecondary }]}>
            Email cannot be changed
          </Text>
        </View>

        {/* Account Info */}
        <View style={[styles.infoCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>Account created</Text>
            <Text style={[styles.infoValue, { color: textPrimary }]}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>Current streak</Text>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={16} color={accent.orange} />
              <Text style={[styles.infoValue, { color: textPrimary }]}>
                {user?.streakCurrent || 0} days
              </Text>
            </View>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondary }]}>Longest streak</Text>
            <Text style={[styles.infoValue, { color: textPrimary }]}>
              {user?.streakLongest || 0} days
            </Text>
          </View>
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
    justifyContent: 'space-between',
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
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  content: {
    paddingTop: spacing[4],
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
  },
  avatarInitial: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '600',
    color: '#FFFFFF',
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
  inputSection: {
    marginBottom: spacing[5],
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  input: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    fontSize: typography.sizes.base,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: typography.sizes.base,
  },
  helperText: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
  infoCard: {
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  infoDivider: {
    height: 1,
    marginVertical: spacing[2],
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
});
