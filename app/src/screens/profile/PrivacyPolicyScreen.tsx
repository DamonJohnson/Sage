import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { Footer } from '@/components/layout';
import { spacing, typography, borderRadius } from '@/theme';

const LAST_UPDATED = 'January 25, 2026';

export function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, textPrimary, textSecondary } = useThemedColors();

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Privacy Policy</Text>
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
        <Text style={[styles.lastUpdated, { color: textSecondary }]}>
          Last Updated: {LAST_UPDATED}
        </Text>

        {/* Section 1: Introduction */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>1. Introduction</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Welcome to Sage ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our flashcard application and related services (collectively, the "Service").
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We are committed to protecting your privacy in accordance with the Australian Privacy Principles (APPs) contained in the Privacy Act 1988 (Cth). If you are located in a jurisdiction with additional data protection requirements, we will process your data in accordance with applicable local laws.
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            By using Sage, you consent to the practices described in this Privacy Policy. If you do not agree with this policy, please do not use our Service.
          </Text>
        </View>

        {/* Section 2: Information We Collect */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>2. Information We Collect</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>2.1 Information You Provide</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Account Information:</Text> Name, email address, and authentication credentials when you register via Google, Apple, or email sign-in.
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Profile Information:</Text> Optional details such as profile picture and display name.
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Study Content:</Text> Flashcard decks, cards you create, and any content you upload for AI processing (text, PDFs, images).
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Communications:</Text> Messages you send to us for support or feedback.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>2.2 Information Collected Automatically</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Study Data:</Text> Study progress, performance metrics, learning statistics, and spaced repetition schedules.
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Usage Information:</Text> Features accessed, study sessions completed, session duration, and interaction patterns.
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Device Information:</Text> Device type, operating system version, unique device identifiers, and mobile network information.
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>
            • <Text style={styles.bold}>Log Data:</Text> IP address, browser type (for web app), access times, and referring URLs.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>2.3 Information from Third Parties</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you sign in using Google or Apple, we receive basic profile information (name and email) as authorised by you during the sign-in process.
          </Text>
        </View>

        {/* Section 3: How We Use Your Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>3. How We Use Your Information</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>We use collected information to:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Provide, operate, and maintain the Service</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Personalise your learning experience using spaced repetition algorithms</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Track and display your study progress and statistics</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Enable social features including public deck sharing and user following</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Process content through AI services to generate flashcards</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Send service-related notifications (account updates, new features, study reminders)</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Respond to support requests and enquiries</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Analyse usage patterns to improve functionality and user experience</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Detect, prevent, and address technical issues or security threats</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Comply with legal obligations</Text>
        </View>

        {/* Section 4: AI-Generated Content */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>4. AI-Generated Content</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Sage uses artificial intelligence to generate flashcards from topics, text, PDFs, and images you provide.
          </Text>
          <Text style={[styles.paragraph, { color: textPrimary, fontWeight: '600' }]}>When you use AI features:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your input content is transmitted to third-party AI processing services to generate flashcards.</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Input content is processed in real-time and is not retained by us after flashcard generation is complete.</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Generated flashcards are stored in your account as part of your study materials.</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Third-party AI providers may process your content in accordance with their own privacy policies.</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            <Text style={styles.bold}>Important:</Text> Do not submit sensitive personal information, confidential documents, or content you do not have rights to use when utilising AI features.
          </Text>
        </View>

        {/* Section 5: Data Sharing and Disclosure */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>5. Data Sharing and Disclosure</Text>
          <Text style={[styles.paragraph, { color: textPrimary, fontWeight: '600' }]}>We do not sell your personal information.</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We may share your information in the following circumstances:
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.1 Public Content</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you choose to make a deck public, it will be visible to other users along with your display name and profile picture.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.2 Service Providers</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We engage third-party companies to facilitate our Service, including:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Cloud Infrastructure:</Text> Data storage and hosting services</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Authentication:</Text> Google and Apple sign-in services</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>AI Processing:</Text> Artificial intelligence services for flashcard generation</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Analytics:</Text> Usage analytics to improve the Service</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            These providers are contractually obligated to protect your information and use it only for the purposes we specify.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.3 Legal Requirements</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We may disclose your information if required to:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Comply with applicable laws, regulations, or legal processes</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Enforce our Terms and Conditions</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Protect the rights, property, or safety of Sage, our users, or others</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Detect, prevent, or address fraud, security, or technical issues</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.4 Business Transfers</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
          </Text>
        </View>

        {/* Section 6: International Data Transfers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>6. International Data Transfers</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Our Service utilises cloud infrastructure and third-party services that may store or process your data in countries outside Australia, including the United States.
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            When we transfer data internationally, we take reasonable steps to ensure your information is protected in accordance with this Privacy Policy and applicable laws. By using our Service, you consent to the transfer of your information to these countries.
          </Text>
        </View>

        {/* Section 7: Data Security */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>7. Data Security</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We implement appropriate technical and organisational measures to protect your personal information, including:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Encryption of data in transit (TLS/SSL)</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Encryption of data at rest</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Secure authentication protocols</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Regular security assessments</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Access controls limiting employee access to personal data</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            However, no method of transmission over the Internet or electronic storage is completely secure. While we strive to protect your information, we cannot guarantee absolute security.
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            <Text style={styles.bold}>In the event of a data breach</Text> that is likely to result in serious harm, we will notify affected users and relevant authorities in accordance with applicable law.
          </Text>
        </View>

        {/* Section 8: Cookies and Tracking Technologies */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>8. Cookies and Tracking Technologies</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>8.1 Web Application</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Our web application uses cookies and similar technologies to:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Maintain your session and authentication state</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Remember your preferences</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Analyse usage patterns</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You can control cookie settings through your browser. Disabling cookies may affect the functionality of the Service.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>8.2 Mobile Application</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Our mobile app uses device identifiers and analytics SDKs to collect usage information as described in Section 2.2.
          </Text>
        </View>

        {/* Section 9: Your Rights and Choices */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>9. Your Rights and Choices</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Depending on your location, you may have certain rights regarding your personal information, including:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Access:</Text> Request a copy of the personal information we hold about you</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Correction:</Text> Request correction of inaccurate or incomplete information</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Deletion:</Text> Request deletion of your account and associated data</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Export:</Text> Export your flashcard data in a portable format</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Withdraw Consent:</Text> Withdraw consent for optional data processing</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Complaint:</Text> Lodge a complaint with your local data protection authority</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>How to Exercise Your Rights</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>In-App:</Text> Access privacy settings within your account profile</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Email:</Text> Contact us at damonjohnson138@gmail.com</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Account Deletion:</Text> Use the "Delete Account" option in app settings or contact us</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We will respond to requests within 30 days. We may need to verify your identity before processing certain requests.
          </Text>
        </View>

        {/* Section 10: Data Retention */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>10. Data Retention</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Active Accounts:</Text> We retain your personal information for as long as your account remains active.</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Deleted Accounts:</Text> Upon account deletion, we will delete or anonymise your personal information within 30 days.</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Exceptions:</Text> We may retain certain information where required for legal, accounting, or security purposes.</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• <Text style={styles.bold}>Backups:</Text> Residual copies in backups may persist for up to 90 days before being overwritten.</Text>
        </View>

        {/* Section 11: Children's Privacy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>11. Children's Privacy</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Sage is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information promptly.
          </Text>
        </View>

        {/* Section 12: Third-Party Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>12. Third-Party Links</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.
          </Text>
        </View>

        {/* Section 13: International Users */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>13. International Users</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Sage is operated from Australia. If you are accessing the Service from outside Australia, please be aware that your information may be transferred to, stored, and processed in Australia and other countries where our service providers operate.
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you are located in a jurisdiction with specific data protection requirements (such as the European Union, United Kingdom, or United States), we will process your data in accordance with applicable local laws in addition to this Privacy Policy. This includes respecting your rights under such laws and ensuring appropriate safeguards for international data transfers.
          </Text>
        </View>

        {/* Section 14: Changes to This Policy */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>14. Changes to This Policy</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.
          </Text>
          <Text style={[styles.paragraph, { color: textPrimary, fontWeight: '600' }]}>For material changes, we will:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Post the updated policy within the app</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Update the "Last Updated" date</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Notify you via email or in-app notification</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Your continued use of Sage after such changes constitutes acceptance of the updated policy. If you do not agree with the changes, you should discontinue use and delete your account.
          </Text>
        </View>

        {/* Section 15: Contact Us */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>15. Contact Us</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you have questions, concerns, or complaints about this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            <Text style={styles.bold}>Email:</Text> damonjohnson138@gmail.com
          </Text>
        </View>

        {/* Copyright */}
        <Text style={[styles.copyright, { color: textSecondary }]}>
          © 2026 Sage. All rights reserved.
        </Text>

        {/* Footer */}
        <View style={{ marginTop: spacing[6] }}>
          <Footer />
        </View>

        <View style={{ height: spacing[10] }} />
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
  lastUpdated: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[6],
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[3],
  },
  subSectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  paragraph: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    marginBottom: spacing[2],
  },
  bulletPoint: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    marginLeft: spacing[2],
    marginBottom: spacing[1],
  },
  bold: {
    fontWeight: '600',
  },
  copyright: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing[8],
  },
});
