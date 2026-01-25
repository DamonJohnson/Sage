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

export function TermsOfServiceScreen() {
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Terms and Conditions</Text>
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

        {/* Section 1: Agreement to Terms */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>1. Agreement to Terms</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("you" or "User") and Sage ("we," "us," or "our") governing your access to and use of the Sage mobile application, website, and related services (collectively, the "Service").
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            By creating an account or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not use the Service.
          </Text>
        </View>

        {/* Section 2: Eligibility */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>2. Eligibility</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>To use the Service, you must:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Be at least 13 years of age</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Have the legal capacity to enter into a binding agreement</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Not be prohibited from using the Service under applicable laws</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you are between 13 and 18 years of age, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.
          </Text>
        </View>

        {/* Section 3: Account Registration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>3. Account Registration</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>3.1 Account Creation</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            To access certain features of the Service, you must create an account using Google Sign-In, Apple Sign-In, or email registration.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>3.2 Account Responsibilities</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>You are responsible for:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Providing accurate and complete registration information</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Maintaining the confidentiality of your account credentials</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• All activities that occur under your account</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Notifying us immediately of any unauthorised access or security breach</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>3.3 Account Security</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We recommend using strong, unique passwords and enabling additional security features where available. We are not liable for losses arising from unauthorised account access due to your failure to safeguard credentials.
          </Text>
        </View>

        {/* Section 4: Description of Service */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>4. Description of Service</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>Sage is a flashcard and study application that enables users to:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Create, organise, and study flashcard decks</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Generate flashcards using artificial intelligence from text, PDFs, images, and topics</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Track study progress and performance statistics</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Share decks publicly and discover content created by other users</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Follow other users and engage with the learning community</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time without prior notice.
          </Text>
        </View>

        {/* Section 5: User Content */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>5. User Content</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.1 Definition</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            "User Content" includes all flashcard decks, cards, text, images, and other materials you create, upload, or submit through the Service.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.2 Ownership</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You retain ownership of the User Content you create. By submitting User Content, you grant us a non-exclusive, worldwide, royalty-free, sublicensable licence to use, reproduce, modify, display, and distribute your User Content solely for the purposes of operating and improving the Service.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.3 Public Content</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you choose to make your decks public, you grant other users the right to view, study, and copy those decks for personal, non-commercial use. Your display name and profile picture will be associated with public content.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.4 Content Representations</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>You represent and warrant that:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• You own or have the necessary rights to your User Content</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your User Content does not infringe any third-party intellectual property rights</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your User Content does not violate these Terms or applicable laws</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>5.5 Content Removal</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We reserve the right to remove any User Content that violates these Terms or is otherwise objectionable, without prior notice.
          </Text>
        </View>

        {/* Section 6: AI-Generated Content */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>6. AI-Generated Content</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>6.1 AI Features</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            The Service includes features that use artificial intelligence to generate flashcards from content you provide (text, PDFs, images, topics).
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>6.2 Input Content</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You are solely responsible for the content you submit for AI processing. Do not submit:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Content you do not have rights to use</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Confidential or sensitive personal information</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Content that violates third-party intellectual property rights</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Illegal, harmful, or inappropriate content</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>6.3 Output Accuracy</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            AI-generated flashcards are provided "as is" for educational purposes. We do not guarantee the accuracy, completeness, or suitability of AI-generated content. You are responsible for reviewing and verifying all generated flashcards before use.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>6.4 No Professional Advice</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            AI-generated content does not constitute professional, medical, legal, financial, or expert advice. Always consult qualified professionals for matters requiring specialised expertise.
          </Text>
        </View>

        {/* Section 7: Acceptable Use */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>7. Acceptable Use</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>7.1 Permitted Use</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You may use the Service for lawful, personal, and educational purposes in accordance with these Terms.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>7.2 Prohibited Conduct</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>You agree not to:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Violate any applicable laws or regulations</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Infringe the intellectual property rights of others</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Upload or distribute harmful, offensive, defamatory, or illegal content</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Harass, abuse, or harm other users</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Impersonate any person or entity</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Use the Service to spam or send unsolicited communications</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Attempt to gain unauthorised access to the Service or other users' accounts</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Interfere with or disrupt the Service or its infrastructure</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Use automated means (bots, scrapers) to access the Service without permission</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Reverse engineer, decompile, or disassemble the Service</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Use the Service to develop a competing product</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Sublicense, sell, or commercially exploit the Service without authorisation</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>7.3 Enforcement</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We reserve the right to investigate and take appropriate action against violations, including warning, suspension, or termination of accounts and legal action where warranted.
          </Text>
        </View>

        {/* Section 8: Intellectual Property */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>8. Intellectual Property</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>8.1 Our Intellectual Property</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            The Service, including its design, features, code, graphics, logos, and trademarks, is owned by Sage and protected by intellectual property laws. You are granted a limited, non-exclusive, non-transferable licence to use the Service for personal purposes in accordance with these Terms.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>8.2 Restrictions</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You may not copy, modify, distribute, sell, or lease any part of the Service or its content, except as expressly permitted by these Terms or with our prior written consent.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>8.3 Feedback</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you provide feedback, suggestions, or ideas about the Service, you grant us the right to use such feedback without restriction or compensation.
          </Text>
        </View>

        {/* Section 9: Subscriptions and Payments */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>9. Subscriptions and Payments</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>9.1 Free and Paid Features</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            The Service may include both free features and premium features available through paid subscriptions.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>9.2 Subscription Terms</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>If you purchase a subscription:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Payment will be charged to your chosen payment method upon confirmation</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Subscriptions automatically renew unless cancelled before the renewal date</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• You may cancel your subscription at any time through your account settings or the applicable app store</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>9.3 Refunds</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Refund requests are handled in accordance with the policies of the applicable app store (Apple App Store or Google Play Store) and applicable consumer protection laws in your jurisdiction.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>9.4 Price Changes</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We reserve the right to change subscription prices. Existing subscribers will be notified in advance of any price changes.
          </Text>
        </View>

        {/* Section 10: Disclaimers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>10. Disclaimers</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>10.1 Service Provided "As Is"</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            To the maximum extent permitted by law, the Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>10.2 No Guarantee</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>We do not warrant that:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• The Service will be uninterrupted, secure, or error-free</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Results obtained from the Service will be accurate or reliable</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• The Service will meet your specific requirements</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Defects will be corrected</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>10.3 Educational Tool</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Sage is an educational study tool. We make no guarantees regarding learning outcomes, academic performance, or examination results.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>10.4 Consumer Protection Laws</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Nothing in these Terms excludes, restricts, or modifies any consumer rights under applicable consumer protection legislation in your jurisdiction that cannot be excluded, restricted, or modified by agreement.
          </Text>
        </View>

        {/* Section 11: Limitation of Liability */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>11. Limitation of Liability</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>11.1 Exclusion of Damages</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill, arising out of or related to your use of the Service.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>11.2 Liability Cap</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Our total liability for any claims arising from or related to these Terms or the Service shall not exceed the greater of:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• The amount you paid to us in the 12 months preceding the claim, or</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• AUD $100</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>11.3 Exceptions</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            These limitations do not apply to liability that cannot be excluded or limited under applicable law, including liability for fraud or personal injury caused by negligence.
          </Text>
        </View>

        {/* Section 12: Indemnification */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>12. Indemnification</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You agree to indemnify, defend, and hold harmless Sage, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your use of the Service</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your User Content</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your violation of these Terms</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your violation of any third-party rights</Text>
        </View>

        {/* Section 13: Termination */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>13. Termination</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>13.1 Termination by You</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You may terminate your account at any time by using the account deletion feature or contacting us. Upon termination, your right to use the Service ceases immediately.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>13.2 Termination by Us</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We may suspend or terminate your account at any time, with or without cause, and with or without notice. Grounds for termination include, but are not limited to:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Violation of these Terms</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Fraudulent or illegal activity</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Extended inactivity</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Request by law enforcement</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>13.3 Effect of Termination</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>Upon termination:</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Your licence to use the Service is revoked</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• We may delete your User Content and account data in accordance with our Privacy Policy</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Provisions of these Terms that by their nature should survive termination will remain in effect</Text>
        </View>

        {/* Section 14: Dispute Resolution */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>14. Dispute Resolution</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>14.1 Informal Resolution</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Before initiating formal proceedings, you agree to contact us and attempt to resolve any dispute informally for at least 30 days.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>14.2 Governing Law</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            These Terms are governed by and construed in accordance with the laws of Queensland, Australia, without regard to conflict of law principles.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>14.3 Jurisdiction</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Subject to applicable consumer protection laws that may give you the right to bring proceedings in your local courts, any disputes arising from these Terms or the Service shall be subject to the jurisdiction of the courts of Queensland, Australia.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>14.4 International Users</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you are accessing the Service from outside Australia, you are responsible for compliance with local laws. Nothing in these Terms limits any rights you may have under mandatory consumer protection laws in your jurisdiction.
          </Text>
        </View>

        {/* Section 15: General Provisions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>15. General Provisions</Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>15.1 Entire Agreement</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            These Terms, together with the Privacy Policy, constitute the entire agreement between you and Sage regarding the Service and supersede all prior agreements.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>15.2 Severability</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>15.3 Waiver</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>15.4 Assignment</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations under these Terms without restriction.
          </Text>

          <Text style={[styles.subSectionTitle, { color: textPrimary }]}>15.5 Notices</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We may provide notices to you via email, in-app notifications, or by posting on the Service. You may provide notices to us at the contact information below.
          </Text>
        </View>

        {/* Section 16: Changes to Terms */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>16. Changes to Terms</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            We reserve the right to modify these Terms at any time. We will notify you of material changes by:
          </Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Posting the updated Terms within the app</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Updating the "Last Updated" date</Text>
          <Text style={[styles.bulletPoint, { color: textSecondary }]}>• Sending an email or in-app notification for significant changes</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms. If you do not agree to the updated Terms, you must stop using the Service and delete your account.
          </Text>
        </View>

        {/* Section 17: Contact Us */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>17. Contact Us</Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            If you have questions or concerns about these Terms, please contact us:
          </Text>
          <Text style={[styles.paragraph, { color: textSecondary }]}>
            <Text style={{ fontWeight: '600' }}>Email:</Text> damonjohnson138@gmail.com
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
  copyright: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing[8],
  },
});
