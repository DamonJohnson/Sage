import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { Footer } from '@/components/layout';
import { spacing, typography, borderRadius } from '@/theme';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface SupportOption {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action: () => void;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'what-is-spaced-repetition',
    question: 'What is spaced repetition?',
    answer: 'Spaced repetition is a learning technique that involves reviewing information at increasing intervals. Cards you know well are shown less frequently, while cards you struggle with appear more often. This optimizes your learning by focusing on what you need to practice most.',
  },
  {
    id: 'how-ratings-work',
    question: 'How do the rating buttons work?',
    answer: 'After revealing an answer, you rate how well you knew it:\n\n• Again: You didn\'t know it (card will reappear soon)\n• Hard: You struggled but got it (short interval)\n• Good: You knew it with some effort (normal interval)\n• Easy: You knew it instantly (longer interval)\n\nThe app uses these ratings to schedule when you\'ll see each card again.',
  },
  {
    id: 'create-deck',
    question: 'How do I create a new deck?',
    answer: 'Tap the Create tab in the navigation bar. You can:\n\n• AI Generate: Describe a topic and let AI create cards for you\n• Manual Create: Add cards one by one\n• PDF Upload: Extract flashcards from PDF documents\n• Image to Card: Convert images to flashcards using OCR',
  },
  {
    id: 'edit-cards',
    question: 'Can I edit cards after creating them?',
    answer: 'Yes! Go to your deck, tap on any card to open the editor. You can modify the front and back content, or delete the card entirely. Tap the menu button (three dots) at the top to edit or delete the entire deck.',
  },
  {
    id: 'streak-lost',
    question: 'What happens if I lose my streak?',
    answer: 'Your streak resets to zero if you miss a day of studying. However, your longest streak is always saved, and you can work towards beating it. Streaks are a great motivator, but remember that consistent learning over time is what really matters!',
  },
  {
    id: 'sync-devices',
    question: 'Does my data sync across devices?',
    answer: 'Currently, Sage stores data locally on your device. Cloud sync across devices is coming in a future update. For now, you can use the Export feature in Settings to back up your data.',
  },
  {
    id: 'import-decks',
    question: 'Can I import existing flashcards?',
    answer: 'Yes! Go to the Create tab and select Import. Paste your CSV or text data and AI will help interpret it and create flashcards for you.',
  },
];

export function HelpScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const supportOptions: SupportOption[] = [
    {
      id: 'email',
      icon: 'mail-outline',
      title: 'Email Support',
      description: 'Get help from our team',
      action: () => Linking.openURL('mailto:support@sage.app'),
    },
    {
      id: 'twitter',
      icon: 'logo-twitter',
      title: 'Twitter',
      description: '@SageFlashcards',
      action: () => Linking.openURL('https://twitter.com/SageFlashcards'),
    },
    {
      id: 'github',
      icon: 'logo-github',
      title: 'GitHub',
      description: 'Report bugs & request features',
      action: () => Linking.openURL('https://github.com/sage-flashcards/sage'),
    },
  ];

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Help & Support</Text>
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
        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Get Help</Text>
          <View style={[styles.supportGrid, isDesktop && styles.supportGridDesktop]}>
            {supportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.supportCard,
                  { backgroundColor: surface, borderColor: border },
                  isDesktop && styles.supportCardDesktop,
                ]}
                onPress={option.action}
              >
                <View style={[styles.supportIcon, { backgroundColor: accent.orange + '20' }]}>
                  <Ionicons name={option.icon} size={24} color={accent.orange} />
                </View>
                <Text style={[styles.supportTitle, { color: textPrimary }]}>{option.title}</Text>
                <Text style={[styles.supportDescription, { color: textSecondary }]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Frequently Asked Questions
          </Text>
          <View style={[styles.faqContainer, { backgroundColor: surface, borderColor: border }]}>
            {FAQ_ITEMS.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.faqItem}
                  onPress={() => toggleFaq(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQuestion, { color: textPrimary }]}>{item.question}</Text>
                  <Ionicons
                    name={expandedFaq === item.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={textSecondary}
                  />
                </TouchableOpacity>
                {expandedFaq === item.id && (
                  <View style={[styles.faqAnswer, { backgroundColor: surfaceHover }]}>
                    <Text style={[styles.faqAnswerText, { color: textSecondary }]}>
                      {item.answer}
                    </Text>
                  </View>
                )}
                {index < FAQ_ITEMS.length - 1 && (
                  <View style={[styles.faqDivider, { backgroundColor: border }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Keyboard Shortcuts (Desktop) */}
        {isDesktop && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Keyboard Shortcuts</Text>
            <View style={[styles.shortcutsContainer, { backgroundColor: surface, borderColor: border }]}>
              <ShortcutRow keys={['Space']} action="Flip card" textPrimary={textPrimary} textSecondary={textSecondary} border={border} />
              <ShortcutRow keys={['1']} action="Rate: Again" textPrimary={textPrimary} textSecondary={textSecondary} border={border} />
              <ShortcutRow keys={['2']} action="Rate: Hard" textPrimary={textPrimary} textSecondary={textSecondary} border={border} />
              <ShortcutRow keys={['3']} action="Rate: Good" textPrimary={textPrimary} textSecondary={textSecondary} border={border} />
              <ShortcutRow keys={['4']} action="Rate: Easy" textPrimary={textPrimary} textSecondary={textSecondary} border={border} />
              <ShortcutRow keys={['Esc']} action="Exit study session" textPrimary={textPrimary} textSecondary={textSecondary} border={border} isLast />
            </View>
          </View>
        )}

        {/* App Info */}
        <View style={styles.section}>
          <View style={[styles.appInfo, { backgroundColor: surface, borderColor: border }]}>
            <View style={styles.appInfoHeader}>
              <Text style={[styles.appName, { color: textPrimary }]}>Sage</Text>
              <Text style={[styles.appVersion, { color: textSecondary }]}>Version 1.0.0</Text>
            </View>
            <Text style={[styles.appCopyright, { color: textSecondary }]}>
              Made with care for learners everywhere.
            </Text>
            <View style={styles.appLinks}>
              <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy' as never)}>
                <Text style={[styles.appLink, { color: accent.orange }]}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={[styles.appLinkDivider, { color: textSecondary }]}>•</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TermsOfService' as never)}>
                <Text style={[styles.appLink, { color: accent.orange }]}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={{ marginTop: spacing[6] }}>
          <Footer />
        </View>

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
}

function ShortcutRow({
  keys,
  action,
  textPrimary,
  textSecondary,
  border,
  isLast = false,
}: {
  keys: string[];
  action: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.shortcutRow, !isLast && { borderBottomColor: border, borderBottomWidth: 1 }]}>
      <View style={styles.shortcutKeys}>
        {keys.map((key, index) => (
          <View key={index} style={[styles.keyBadge, { backgroundColor: border }]}>
            <Text style={[styles.keyText, { color: textPrimary }]}>{key}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.shortcutAction, { color: textSecondary }]}>{action}</Text>
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
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[4],
  },
  supportGrid: {
    gap: spacing[3],
  },
  supportGridDesktop: {
    flexDirection: 'row',
  },
  supportCard: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    borderWidth: 1,
    alignItems: 'center',
  },
  supportCardDesktop: {
    flex: 1,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  supportTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  supportDescription: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  faqContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  faqQuestion: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
    marginRight: spacing[3],
  },
  faqAnswer: {
    padding: spacing[4],
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: typography.sizes.sm,
    lineHeight: 22,
  },
  faqDivider: {
    height: 1,
  },
  shortcutsContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  shortcutKeys: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  keyBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  keyText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
    fontFamily: 'monospace',
  },
  shortcutAction: {
    fontSize: typography.sizes.sm,
  },
  appInfo: {
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    borderWidth: 1,
    alignItems: 'center',
  },
  appInfoHeader: {
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  appName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.bold,
  },
  appVersion: {
    fontSize: typography.sizes.sm,
  },
  appCopyright: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[3],
  },
  appLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  appLink: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  appLinkDivider: {
    fontSize: typography.sizes.sm,
  },
});
