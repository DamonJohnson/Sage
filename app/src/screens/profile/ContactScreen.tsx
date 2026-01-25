import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useAuthStore } from '@/store';
import { spacing, typography, borderRadius } from '@/theme';

const CONTACT_EMAIL = 'damonjohnson138@gmail.com';

type ContactType = 'bug' | 'feedback' | 'question' | 'other';

interface ContactOption {
  id: ContactType;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const CONTACT_OPTIONS: ContactOption[] = [
  {
    id: 'bug',
    icon: 'bug-outline',
    title: 'Report a Bug',
    description: 'Something not working correctly?',
  },
  {
    id: 'feedback',
    icon: 'chatbubble-ellipses-outline',
    title: 'Send Feedback',
    description: 'Share your thoughts and suggestions',
  },
  {
    id: 'question',
    icon: 'help-circle-outline',
    title: 'Ask a Question',
    description: 'Need help with something?',
  },
  {
    id: 'other',
    icon: 'mail-outline',
    title: 'Other Inquiry',
    description: 'General contact or business inquiries',
  },
];

export function ContactScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();
  const { user } = useAuthStore();

  const [selectedType, setSelectedType] = useState<ContactType | null>(null);
  const [subjectTag, setSubjectTag] = useState(''); // Non-editable tag
  const [additionalSubject, setAdditionalSubject] = useState(''); // Editable portion
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const containerMaxWidth = isDesktop ? 700 : isTablet ? 550 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const handleSelectType = (type: ContactType) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedType(type);

    // Set non-editable subject tag based on type
    const option = CONTACT_OPTIONS.find(o => o.id === type);
    if (option) {
      setSubjectTag(`[${option.title}]`);
    }
    // Reset additional subject when type changes
    setAdditionalSubject('');
  };

  const handleSendEmail = async () => {
    if (!selectedType) {
      Alert.alert('Please Select', 'Please select a contact type.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Message Required', 'Please enter a message.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSending(true);

    try {
      // Combine non-editable tag with additional subject
      const fullSubject = additionalSubject.trim()
        ? `${subjectTag} ${additionalSubject.trim()}`
        : subjectTag;

      // Build email body with user details automatically included
      let body = message;
      body += '\n\n---';
      body += '\nSent from Sage App';
      if (user) {
        body += `\n\nUser Details:`;
        body += `\nName: ${user.name}`;
        body += `\nEmail: ${user.email}`;
        body += `\nUser ID: ${user.id}`;
      }

      const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(body)}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);

        // Show success and reset form
        Alert.alert(
          'Email Client Opened',
          'Your default email app should now be open with your message. Please send the email to complete your submission.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedType(null);
                setSubjectTag('');
                setAdditionalSubject('');
                setMessage('');
              },
            },
          ]
        );
      } else {
        // Fallback: show email address to copy
        Alert.alert(
          'Unable to Open Email',
          `Please email us directly at:\n\n${CONTACT_EMAIL}\n\nSubject: ${fullSubject}`,
          [
            { text: 'Copy Email', onPress: () => copyToClipboard(CONTACT_EMAIL) },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to open email client. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        Alert.alert('Copied', 'Email address copied to clipboard.');
      } catch {
        Alert.alert('Error', 'Unable to copy to clipboard.');
      }
    }
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Contact Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          },
        ]}
      >
        {/* Intro */}
        <View style={[styles.introCard, { backgroundColor: accent.orange + '15' }]}>
          <Ionicons name="chatbubbles-outline" size={24} color={accent.orange} />
          <Text style={[styles.introText, { color: textPrimary }]}>
            We'd love to hear from you! Whether you've found a bug, have a suggestion, or just want to say hi.
          </Text>
        </View>

        {/* Contact Type Selection */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>What can we help you with?</Text>
        <View style={[styles.optionsGrid, isDesktop && styles.optionsGridDesktop]}>
          {CONTACT_OPTIONS.map((option) => {
            const isSelected = selectedType === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? accent.orange + '15' : surface,
                    borderColor: isSelected ? accent.orange : border,
                  },
                  isDesktop && styles.optionCardDesktop,
                ]}
                onPress={() => handleSelectType(option.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: isSelected ? accent.orange + '20' : surfaceHover }]}>
                  <Ionicons name={option.icon} size={24} color={isSelected ? accent.orange : textSecondary} />
                </View>
                <Text style={[styles.optionTitle, { color: isSelected ? accent.orange : textPrimary }]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionDescription, { color: textSecondary }]}>
                  {option.description}
                </Text>
                {isSelected && (
                  <View style={[styles.selectedCheck, { backgroundColor: accent.orange }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Contact Form */}
        {selectedType && (
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Your Message</Text>

            {/* User info display */}
            {user && (
              <View style={[styles.userInfoCard, { backgroundColor: surface, borderColor: border }]}>
                <Ionicons name="person-circle-outline" size={20} color={textSecondary} />
                <View style={styles.userInfoContent}>
                  <Text style={[styles.userInfoName, { color: textPrimary }]}>{user.name}</Text>
                  <Text style={[styles.userInfoEmail, { color: textSecondary }]}>{user.email}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={accent.orange} />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>Subject</Text>
              <View style={[styles.subjectContainer, { backgroundColor: surface, borderColor: border }]}>
                <View style={[styles.subjectTag, { backgroundColor: accent.orange + '20' }]}>
                  <Text style={[styles.subjectTagText, { color: accent.orange }]}>{subjectTag}</Text>
                </View>
                <TextInput
                  style={[styles.subjectInput, { color: textPrimary }]}
                  value={additionalSubject}
                  onChangeText={setAdditionalSubject}
                  placeholder="Add details (optional)"
                  placeholderTextColor={textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textSecondary }]}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: surface, borderColor: border, color: textPrimary }]}
                value={message}
                onChangeText={setMessage}
                placeholder={
                  selectedType === 'bug'
                    ? 'Please describe the bug, steps to reproduce, and what you expected to happen...'
                    : 'Tell us what\'s on your mind...'
                }
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: accent.orange },
                (!message.trim() || isSending) && { opacity: 0.5 },
              ]}
              onPress={handleSendEmail}
              disabled={!message.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Direct Email */}
        <View style={[styles.directEmailCard, { backgroundColor: surface, borderColor: border }]}>
          <Ionicons name="mail-outline" size={20} color={accent.orange} />
          <View style={styles.directEmailContent}>
            <Text style={[styles.directEmailLabel, { color: textSecondary }]}>Or email us directly at:</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
              <Text style={[styles.directEmailAddress, { color: accent.orange }]}>{CONTACT_EMAIL}</Text>
            </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: spacing[10],
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[6],
    gap: spacing[3],
  },
  introText: {
    flex: 1,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[4],
  },
  optionsGrid: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  optionsGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    position: 'relative',
  },
  optionCardDesktop: {
    width: '48%',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  optionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  optionDescription: {
    fontSize: typography.sizes.sm,
  },
  selectedCheck: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    marginBottom: spacing[6],
  },
  inputGroup: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
  },
  input: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[3],
    fontSize: typography.sizes.base,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  userInfoContent: {
    flex: 1,
  },
  userInfoName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  userInfoEmail: {
    fontSize: typography.sizes.sm,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  subjectTag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  subjectTagText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  subjectInput: {
    flex: 1,
    padding: spacing[3],
    fontSize: typography.sizes.base,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  sendButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  directEmailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  directEmailContent: {
    flex: 1,
  },
  directEmailLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[1],
  },
  directEmailAddress: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
});
