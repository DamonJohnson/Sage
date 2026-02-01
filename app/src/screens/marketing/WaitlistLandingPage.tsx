import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { RadiatingLogo } from '@/components/ui';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Creation modes
const CREATION_MODES = [
  { icon: 'sparkles-outline' as const, title: 'AI Generation', desc: 'Just describe what you want to learn' },
  { icon: 'document-text-outline' as const, title: 'Lecture Slides (PDF)', desc: 'Cards in 30 seconds' },
  { icon: 'camera-outline' as const, title: 'Textbook Photo', desc: 'Key concepts extracted' },
  { icon: 'cloud-download-outline' as const, title: 'Existing Anki Decks', desc: 'One-click import, nothing lost' },
];

// Card types
const CARD_TYPES = [
  { icon: 'swap-horizontal-outline' as const, title: 'Classic Flashcards', desc: 'Definitions and quick recall' },
  { icon: 'ellipsis-horizontal-outline' as const, title: 'Cloze Deletions', desc: 'Fill-in-the-blank for pathways and lists' },
];

// Pricing
const FREE_FEATURES = ['5 decks', '50 flashcards', 'Basic features', 'Spaced repetition'];
const STANDARD_FEATURES = ['10 decks', '200 flashcards', 'All card types', 'Priority support'];
const PRO_FEATURES = ['Unlimited decks', 'Unlimited flashcards', 'All features', 'Advanced analytics', 'Priority support'];

// FAQ
const FAQ_DATA = [
  { q: 'Works with Anki?', a: 'Yes. One-click .apkg import, keeps your scheduling data.' },
  { q: 'What if AI gets it wrong?', a: 'Edit any card anytime. You are in control.' },
  { q: 'Is my data private?', a: 'Encrypted, never shared, not used for AI training.' },
  { q: "What is in the deck library?", a: 'Anatomy, pharm, path, physiology. Growing weekly.' },
  { q: "What if it is not for me?", a: '30-day refund. No questions.' },
];

// Waitlist Form
function WaitlistForm({ colors, accent, variant = 'default' }: { colors: any; accent: any; variant?: 'default' | 'hero' | 'final' }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDesktop } = useResponsive();

  const handleSubmit = async () => {
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://sagebackend-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          source: 'landing_page',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Waitlist signup error:', err);
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    const checkColor = variant === 'final' ? '#fff' : accent.green;
    return (
      <View style={[styles.successBox, variant === 'final' && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
        <View style={[styles.checkCircle, { backgroundColor: checkColor }]}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={[styles.successTitle, { color: variant === 'final' ? '#fff' : colors.textPrimary }]}>You're in!</Text>
        <Text style={[styles.successText, { color: variant === 'final' ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>Check your inbox for confirmation.</Text>
      </View>
    );
  }

  const inputStyle = variant === 'final'
    ? [styles.emailInput, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }]
    : [styles.emailInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }];

  return (
    <View style={styles.formWrapper}>
      <View style={[styles.formRow, !isDesktop && styles.formRowMobile]}>
        <TextInput
          style={inputStyle}
          placeholder="Enter your email"
          placeholderTextColor={variant === 'final' ? 'rgba(255,255,255,0.5)' : colors.textSecondary}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: variant === 'final' ? '#fff' : accent.orange, opacity: isLoading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={[styles.submitBtnText, { color: variant === 'final' ? accent.orange : '#fff' }]}>Joining...</Text>
          ) : (
            <>
              <Text style={[styles.submitBtnText, { color: variant === 'final' ? accent.orange : '#fff' }]}>Claim Your Founding Spot</Text>
              <Ionicons name="arrow-forward" size={16} color={variant === 'final' ? accent.orange : '#fff'} />
            </>
          )}
        </TouchableOpacity>
      </View>
      {error && (
        <Text style={[styles.errorText, { color: variant === 'final' ? '#ffcccc' : '#ff6b6b' }]}>{error}</Text>
      )}
    </View>
  );
}

// FAQ Item
function FAQItem({ q, a, colors }: { q: string; a: string; colors: any }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.faqItem, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={() => setOpen(!open)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQ, { color: colors.textPrimary }]}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </View>
      {open && <Text style={[styles.faqA, { color: colors.textSecondary }]}>{a}</Text>}
    </TouchableOpacity>
  );
}

// Counter
function SpotsCounter({ colors, accent }: { colors: any; accent: any }) {
  const remaining = 127;
  const total = 500;
  const pct = ((total - remaining) / total) * 100;

  return (
    <View style={styles.counterWrap}>
      <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: accent.orange }]} />
      </View>
      <Text style={[styles.counterText, { color: colors.textSecondary }]}>
        <Text style={{ color: accent.orange, fontWeight: '700' }}>{remaining}</Text> of {total} spots left
      </Text>
    </View>
  );
}

export function WaitlistLandingPage() {
  const insets = useSafeAreaInsets();
  const { background, surface, surfaceHover, textPrimary, textSecondary, accent, border } = useThemedColors();
  const { isDesktop, isTablet } = useResponsive();
  const { isDark } = useTheme();
  const colors = { background, surface, surfaceHover, textPrimary, textSecondary, border };

  const heroHeight = SCREEN_HEIGHT - insets.top - insets.bottom;
  const containerMaxWidth = isDesktop ? 1200 : isTablet ? 900 : '100%';
  const featureColumns = isDesktop ? 4 : isTablet ? 2 : 1;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const scrollToSignup = () => {
    if (Platform.OS === 'web') {
      document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const webButtonStyle = Platform.OS === 'web' ? { cursor: 'pointer' as const } as any : {};

  return (
    <ScrollView style={[styles.container, { backgroundColor: background }]} showsVerticalScrollIndicator={false}>
      {/* HERO */}
      <View style={[styles.heroSection, { paddingTop: insets.top + spacing[4], minHeight: heroHeight }]}>
        <LinearGradient
          colors={isDark
            ? ['rgba(244, 122, 58, 0.15)', 'rgba(244, 122, 58, 0.05)', 'transparent']
            : ['rgba(244, 122, 58, 0.2)', 'rgba(244, 122, 58, 0.08)', 'transparent']
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Nav */}
        <View style={[styles.nav, { maxWidth: containerMaxWidth }]}>
          <View style={styles.logoContainer}>
            <RadiatingLogo accentColor={accent.orange} size="medium" />
            <Text style={[styles.logoText, { color: textPrimary }]}>Sage</Text>
          </View>
          <TouchableOpacity style={[styles.navCta, { backgroundColor: accent.orange }, webButtonStyle]} onPress={scrollToSignup}>
            <Text style={styles.navCtaText}>Join Waitlist</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Content */}
        <Animated.View style={[styles.heroContent, { maxWidth: containerMaxWidth, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroTextContainer}>
            <Text style={[styles.heroTitle, { color: textPrimary }, isDesktop && styles.heroTitleDesktop]}>
              Turn 6 Hours of Card-Making Into{' '}
              <Text style={{ color: accent.orange }}>30 Seconds</Text>
            </Text>
            <Text style={[styles.heroSubtitle, { color: textSecondary }]}>
              Upload your lecture slides. Get study-ready flashcards instantly.
            </Text>
            <Text style={[styles.heroBody, { color: textSecondary }]}>
              You know flashcards work. But you are spending entire evenings making cards instead of learning them. Your exam date is not moving.
            </Text>
            <Text style={[styles.socialProof, { color: accent.orange }]}>
              373 med students have already claimed their spot.
            </Text>
            <View style={styles.heroCTAContainer}>
              <TouchableOpacity style={[styles.primaryCTA, { backgroundColor: accent.orange }, webButtonStyle]} onPress={scrollToSignup} activeOpacity={0.9}>
                <Text style={styles.primaryCTAText}>Claim Your Founding Spot</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={[styles.freeNote, { color: textSecondary }]}>Free to join the waitlist</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* WAITLIST SIGNUP - High Impact CTA */}
      <View style={styles.waitlistSection} {...(Platform.OS === 'web' ? { nativeID: 'signup' } : {})}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          {/* Urgency Badge */}
          <View style={styles.urgencyBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.urgencyText}>LIMITED TIME OFFER</Text>
          </View>

          {/* Main Headline */}
          <Text style={styles.waitlistHeadline}>
            Lock In <Text style={{ color: '#4ade80' }}>50% Off</Text> Forever
          </Text>

          <Text style={styles.waitlistSubheadline}>
            Join now and never pay full price
          </Text>

          {/* Price Card */}
          <View style={styles.priceCard2}>
            <View style={styles.priceCardInner}>
              <Text style={styles.priceCardLabel}>LIFETIME ACCESS</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceOld2}>$199</Text>
                <View style={styles.priceNew2Container}>
                  <Text style={styles.priceNew2}>$99</Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>SAVE $100</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.priceCardNote}>One payment. Yours forever. No subscriptions.</Text>
            </View>
          </View>

          {/* Benefits Row */}
          <View style={styles.benefitsRow}>
            {[
              { icon: '∞', text: 'Unlimited Everything' },
              { icon: '⚡', text: 'Early Access' },
              { icon: '🏆', text: 'Founding Member' },
            ].map((b, i) => (
              <View key={i} style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          {/* Signup Form Card */}
          <View style={styles.signupCard}>
            <SpotsCounter colors={colors} accent={accent} />
            <WaitlistForm colors={colors} accent={accent} variant="hero" />

            {/* Trust Signals */}
            <View style={styles.trustRow}>
              <Text style={styles.trustText}>🔒 No credit card required</Text>
              <Text style={styles.trustText}>✉️ Unsubscribe anytime</Text>
            </View>
          </View>

          {/* Social Proof */}
          <View style={styles.socialProofRow}>
            <View style={styles.avatarStack}>
              {['👩‍⚕️', '👨‍⚕️', '👩‍🎓', '👨‍🎓'].map((emoji, i) => (
                <View key={i} style={[styles.avatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 4 - i }]}>
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.socialProofText}>
              <Text style={{ fontWeight: '700', color: '#4ade80' }}>373+ students</Text> already on the waitlist
            </Text>
          </View>
        </View>
      </View>

      {/* CREATION MODES */}
      <View style={[styles.section, { backgroundColor: surface }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>CARD CREATION</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Multiple Ways to Build Your Deck</Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Just tell Sage what you want to learn and AI creates the cards. Or upload your own materials.
          </Text>

          <View style={[styles.featureGrid, { flexDirection: featureColumns > 1 ? 'row' : 'column' }]}>
            {CREATION_MODES.map((mode, index) => (
              <View
                key={index}
                style={[styles.featureCard, { width: featureColumns > 1 ? `${100 / featureColumns - 2}%` : '100%', backgroundColor: background, borderColor: border }]}
              >
                <View style={[styles.featureIconContainer, { backgroundColor: accent.orange + '15' }]}>
                  <Ionicons name={mode.icon} size={24} color={accent.orange} />
                </View>
                <Text style={[styles.featureTitle, { color: textPrimary }]}>{mode.title}</Text>
                <Text style={[styles.featureDescription, { color: textSecondary }]}>{mode.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* CARD TYPES */}
      <View style={[styles.section, { backgroundColor: background }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>CARD TYPES</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>The Right Card for Every Concept</Text>

          <View style={[styles.cardTypesGrid, { flexDirection: isDesktop || isTablet ? 'row' : 'column' }]}>
            {CARD_TYPES.map((cardType, index) => (
              <View key={index} style={[styles.cardTypeCard, { width: isDesktop || isTablet ? '48%' : '100%', backgroundColor: surface, borderColor: border }]}>
                <View style={[styles.cardTypeIconContainer, { backgroundColor: accent.orange + '15' }]}>
                  <Ionicons name={cardType.icon} size={32} color={accent.orange} />
                </View>
                <Text style={[styles.cardTypeTitle, { color: textPrimary }]}>{cardType.title}</Text>
                <Text style={[styles.cardTypeDescription, { color: textSecondary }]}>{cardType.desc}</Text>
              </View>
            ))}
          </View>

          <View style={styles.moreCardTypes}>
            {[
              { icon: 'image-outline', name: 'Image Cards', desc: 'Label anatomy, histology, radiology' },
              { icon: 'checkbox-outline', name: 'Multiple Choice', desc: 'Practice in exam format' },
            ].map((type, i) => (
              <View key={i} style={styles.moreCardTypeRow}>
                <Ionicons name={type.icon as any} size={20} color={accent.orange} />
                <Text style={[styles.moreCardTypeText, { color: textPrimary }]}>
                  <Text style={{ fontWeight: '600' }}>{type.name}</Text> — {type.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* SMART SCHEDULING */}
      <View style={[styles.section, { backgroundColor: surface }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>SMART SCHEDULING</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Study Less. Remember More.</Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Sage shows you cards exactly when you are about to forget them. Track retention by deck, identify weak cards, and know where you stand before exam day.
          </Text>
          <Text style={[styles.tagline, { color: accent.orange }]}>No more guessing. You will have the data.</Text>
        </View>
      </View>

      {/* COMMUNITY */}
      <View style={[styles.section, { backgroundColor: background }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>COMMUNITY</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Do Not Start From Zero</Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Access 500+ community-created decks for anatomy, pharmacology, pathology, and more. Download, customise, or share your own.
          </Text>

          <View style={[styles.ankiCard, { backgroundColor: surface, borderColor: border }]}>
            <Ionicons name="swap-horizontal" size={28} color={accent.orange} />
            <Text style={[styles.ankiTitle, { color: textPrimary }]}>Already Using Anki?</Text>
            <Text style={[styles.ankiBody, { color: textSecondary }]}>
              Import your .apkg files in one click. Cards, scheduling data, and tags all transfer. Setup takes 2 minutes.
            </Text>
          </View>
        </View>
      </View>

      {/* SOCIAL PROOF */}
      <View style={[styles.section, { backgroundColor: surface }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <View style={[styles.testimonial, { borderColor: accent.orange }]}>
            <Text style={[styles.quote, { color: textPrimary }]}>
              "I was spending 2-3 hours after every lecture making cards. Now I upload the slides and I am studying within a minute."
            </Text>
            <Text style={[styles.quoteAttr, { color: textSecondary }]}>— Beta tester, UQ</Text>
          </View>

          <View style={styles.statsRow}>
            {[
              { num: '12,000+', label: 'cards generated' },
              { num: '4+ hrs', label: 'saved per week' },
              { num: '15+', label: 'Australian unis' },
            ].map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={[styles.statNum, { color: accent.orange }]}>{stat.num}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* PRICING */}
      <View style={[styles.section, { backgroundColor: background }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionLabel, { color: accent.orange }]}>PRICING</Text>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Simple Plans</Text>

          <View style={[styles.pricingRow, !isDesktop && styles.pricingRowStack]}>
            {/* Free Tier */}
            <View style={[styles.priceCard, { backgroundColor: surface, borderColor: border }]}>
              <Text style={[styles.tierName, { color: textPrimary }]}>Free</Text>
              <Text style={[styles.price, { color: textPrimary }]}>$0</Text>
              <Text style={[styles.priceMonthly, { color: textSecondary }]}>Forever free</Text>
              <View style={styles.priceFeatures}>
                {FREE_FEATURES.map((f, i) => (
                  <View key={i} style={styles.priceFeatureRow}>
                    <Text style={{ color: accent.green, marginRight: 8 }}>✓</Text>
                    <Text style={[styles.priceFeatureText, { color: textSecondary }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Standard Tier */}
            <View style={[styles.priceCard, { backgroundColor: surface, borderColor: border }]}>
              <Text style={[styles.tierName, { color: textPrimary }]}>Standard</Text>
              <Text style={[styles.price, { color: textPrimary }]}>$59.99<Text style={styles.priceUnit}>/yr</Text></Text>
              <Text style={[styles.priceMonthly, { color: textSecondary }]}>or $7.99/month</Text>
              <View style={styles.priceFeatures}>
                {STANDARD_FEATURES.map((f, i) => (
                  <View key={i} style={styles.priceFeatureRow}>
                    <Text style={{ color: accent.green, marginRight: 8 }}>✓</Text>
                    <Text style={[styles.priceFeatureText, { color: textSecondary }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Pro Tier */}
            <View style={[styles.priceCard, styles.priceCardPro, { backgroundColor: surface, borderColor: accent.orange }]}>
              <View style={[styles.badge, { backgroundColor: accent.orange }]}>
                <Text style={styles.badgeText}>Best Value</Text>
              </View>
              <Text style={[styles.tierName, { color: textPrimary }]}>Pro</Text>
              <Text style={[styles.price, { color: textPrimary }]}>$99<Text style={styles.priceUnit}>/yr</Text></Text>
              <Text style={[styles.priceMonthly, { color: textSecondary }]}>or $15/month · $199 lifetime</Text>
              <View style={styles.priceFeatures}>
                {PRO_FEATURES.map((f, i) => (
                  <View key={i} style={styles.priceFeatureRow}>
                    <Text style={{ color: accent.green, marginRight: 8 }}>✓</Text>
                    <Text style={[styles.priceFeatureText, { color: textSecondary }]}>{f}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.guarantee, { color: textSecondary }]}>30-day money-back guarantee</Text>
            </View>
          </View>
        </View>
      </View>

      {/* COMPARISON */}
      <View style={[styles.section, { backgroundColor: background }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>What If You Wait?</Text>

          <View style={[styles.compareTable, { borderColor: border }]}>
            <View style={[styles.compareHeader, { backgroundColor: surfaceHover }]}>
              <Text style={[styles.compareHeaderText, { color: accent.green }]}>Now</Text>
              <Text style={[styles.compareHeaderText, { color: textSecondary }]}>Later</Text>
            </View>
            {[
              ['$79/year forever', '$149/year'],
              ['Beta access this week', 'Waitlist'],
              ['Vote on features', 'Features ship without you'],
              ['373 already in', '127 spots left'],
            ].map((row, i) => (
              <View key={i} style={[styles.compareRow, { borderTopColor: border }]}>
                <Text style={[styles.compareNow, { color: accent.green }]}>{row[0]}</Text>
                <Text style={[styles.compareLater, { color: textSecondary }]}>{row[1]}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: accent.orange }, webButtonStyle]} onPress={scrollToSignup}>
            <Text style={styles.ctaBtnText}>Claim Your Founding Spot</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* FAQ */}
      <View style={[styles.section, { backgroundColor: surface }]}>
        <View style={[styles.sectionContent, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>FAQ</Text>
          <View style={styles.faqList}>
            {FAQ_DATA.map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} colors={colors} />
            ))}
          </View>
        </View>
      </View>

      {/* FINAL CTA */}
      <View style={[styles.finalCTASection, { backgroundColor: background }]}>
        <LinearGradient
          colors={[accent.orange, '#E85D2B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.finalCTAGradient, { maxWidth: isDesktop ? 900 : '100%' }]}
        >
          <Text style={styles.finalCTATitle}>Stop Making Cards. Start Studying.</Text>
          <Text style={styles.finalCTASub}>127 Founding Member spots left.</Text>
          <WaitlistForm colors={colors} accent={accent} variant="final" />
          <Text style={styles.noSpam}>Free to join • No spam • Unsubscribe anytime</Text>
        </LinearGradient>
      </View>

      {/* FOOTER */}
      <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
        <View style={[styles.footerContent, { maxWidth: containerMaxWidth }]}>
          <View style={styles.footerLogo}>
            <RadiatingLogo accentColor={accent.orange} size="small" />
            <Text style={[styles.footerLogoText, { color: textPrimary }]}>Sage</Text>
          </View>
          <Text style={[styles.footerCopyright, { color: textSecondary }]}>© 2025 Sage. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  heroSection: { paddingHorizontal: spacing[6], paddingBottom: spacing[8], overflow: 'hidden', position: 'relative' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[4], alignSelf: 'center', width: '100%' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  logoText: { fontSize: typography.sizes['2xl'], fontWeight: '800' },
  navCta: { paddingVertical: spacing[2], paddingHorizontal: spacing[5], borderRadius: borderRadius.md },
  navCtaText: { color: '#FFFFFF', fontSize: typography.sizes.base, fontWeight: '600' },
  heroContent: { marginTop: spacing[8], alignSelf: 'center', width: '100%' },
  heroTextContainer: { maxWidth: 600, alignSelf: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 32, fontWeight: '800', lineHeight: 40, marginBottom: spacing[4], textAlign: 'center' },
  heroTitleDesktop: { fontSize: 48, lineHeight: 56 },
  heroSubtitle: { fontSize: typography.sizes.lg, lineHeight: 28, marginBottom: spacing[3], textAlign: 'center' },
  heroBody: { fontSize: typography.sizes.base, lineHeight: 24, marginBottom: spacing[4], textAlign: 'center', maxWidth: 500 },
  socialProof: { fontSize: typography.sizes.sm, fontWeight: '600', marginBottom: spacing[6] },
  heroCTAContainer: { gap: spacing[3], alignItems: 'center' },
  freeNote: { fontSize: typography.sizes.sm, marginTop: spacing[2] },
  primaryCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[8], borderRadius: borderRadius.xl, gap: spacing[2], ...shadows.lg },
  primaryCTAText: { color: '#FFFFFF', fontSize: typography.sizes.lg, fontWeight: '600' },

  // Sections
  section: { paddingVertical: spacing[16], paddingHorizontal: spacing[6] },
  sectionContent: { alignSelf: 'center', width: '100%' },
  sectionLabel: { fontSize: typography.sizes.sm, fontWeight: '700', letterSpacing: 1.5, marginBottom: spacing[3], textAlign: 'center' },
  sectionTitle: { fontSize: typography.sizes['3xl'], fontWeight: '700', textAlign: 'center', marginBottom: spacing[4] },
  sectionSubtitle: { fontSize: typography.sizes.lg, textAlign: 'center', marginBottom: spacing[12], maxWidth: 600, alignSelf: 'center', lineHeight: 26 },
  tagline: { fontSize: typography.sizes.base, fontWeight: '600', textAlign: 'center', marginTop: spacing[4] },

  // Feature Grid
  featureGrid: { flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing[5] },
  featureCard: { padding: spacing[7], borderRadius: borderRadius['2xl'], borderWidth: 1, marginBottom: spacing[4], ...shadows.md },
  featureIconContainer: { width: 56, height: 56, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: spacing[5] },
  featureTitle: { fontSize: typography.sizes.lg, fontWeight: '600', marginBottom: spacing[2] },
  featureDescription: { fontSize: typography.sizes.base, lineHeight: 24 },

  // Card Types
  cardTypesGrid: { justifyContent: 'space-between', gap: spacing[4], marginBottom: spacing[8] },
  cardTypeCard: { padding: spacing[8], borderRadius: borderRadius.xl, borderWidth: 1, marginBottom: spacing[4], alignItems: 'center' },
  cardTypeIconContainer: { width: 64, height: 64, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: spacing[5] },
  cardTypeTitle: { fontSize: typography.sizes.xl, fontWeight: '600', marginBottom: spacing[3], textAlign: 'center' },
  cardTypeDescription: { fontSize: typography.sizes.base, lineHeight: 24, textAlign: 'center', maxWidth: 300 },
  moreCardTypes: { gap: spacing[3], maxWidth: 500, alignSelf: 'center' },
  moreCardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  moreCardTypeText: { fontSize: typography.sizes.base, flex: 1 },

  // Anki Card
  ankiCard: { padding: spacing[6], borderRadius: borderRadius.xl, borderWidth: 1, maxWidth: 500, alignSelf: 'center', alignItems: 'center' },
  ankiTitle: { fontSize: typography.sizes.lg, fontWeight: '700', marginTop: spacing[3], marginBottom: spacing[2] },
  ankiBody: { fontSize: typography.sizes.base, textAlign: 'center', lineHeight: 24 },

  // Testimonial
  testimonial: { borderLeftWidth: 3, paddingLeft: spacing[5], marginBottom: spacing[10], maxWidth: 550, alignSelf: 'center' },
  quote: { fontSize: typography.sizes.xl, fontStyle: 'italic', lineHeight: 32 },
  quoteAttr: { fontSize: typography.sizes.base, marginTop: spacing[3] },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing[10], flexWrap: 'wrap' },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: typography.sizes['3xl'], fontWeight: '800' },
  statLabel: { fontSize: typography.sizes.sm, marginTop: spacing[1] },

  // Pricing
  pricingRow: { flexDirection: 'row', gap: spacing[6], justifyContent: 'center' },
  pricingRowStack: { flexDirection: 'column', alignItems: 'center' },
  priceCard: { padding: spacing[7], borderRadius: borderRadius['2xl'], borderWidth: 1, width: '100%', maxWidth: 340 },
  priceCardPro: { borderWidth: 2, position: 'relative' },
  badge: { position: 'absolute', top: -12, alignSelf: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[1], borderRadius: borderRadius.full },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tierName: { fontSize: typography.sizes.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] },
  priceWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  priceOld: { fontSize: typography.sizes.lg, textDecorationLine: 'line-through' },
  price: { fontSize: 36, fontWeight: '800', textAlign: 'center' },
  priceUnit: { fontSize: typography.sizes.base, fontWeight: '500' },
  priceMonthly: { fontSize: typography.sizes.sm, textAlign: 'center', marginBottom: spacing[5] },
  priceFeatures: { gap: spacing[3], marginTop: spacing[4] },
  priceFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  priceFeatureText: { fontSize: typography.sizes.base },
  guarantee: { fontSize: typography.sizes.sm, textAlign: 'center', marginTop: spacing[5], fontStyle: 'italic' },

  // Founding
  checkList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing[4], marginBottom: spacing[8] },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  checkText: { fontSize: typography.sizes.base },
  checkCircleSmall: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  checkMarkSmall: { color: '#fff', fontSize: 12, fontWeight: '700' },
  savingsBadge: { paddingHorizontal: spacing[5], paddingVertical: spacing[2], borderRadius: borderRadius.full, alignSelf: 'center', marginBottom: spacing[4] },
  savingsBadgeText: { color: '#fff', fontSize: typography.sizes.lg, fontWeight: '800', letterSpacing: 1 },
  priceCompare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3], marginTop: spacing[2] },
  priceCompareOld: { fontSize: typography.sizes['2xl'], textDecorationLine: 'line-through', opacity: 0.6 },
  priceCompareNew: { fontSize: typography.sizes['4xl'], fontWeight: '800' },
  priceCompareLabel: { fontSize: typography.sizes.base },

  // Counter
  counterWrap: { alignItems: 'center', marginBottom: spacing[6] },
  progressBg: { width: '100%', maxWidth: 360, height: 8, borderRadius: 4, marginBottom: spacing[3] },
  progressFill: { height: '100%', borderRadius: 4 },
  counterText: { fontSize: typography.sizes.base },

  // Form
  formWrapper: { width: '100%', maxWidth: 500, alignSelf: 'center' },
  formRow: { flexDirection: 'row', gap: spacing[3] },
  formRowMobile: { flexDirection: 'column' },
  emailInput: { flex: 1, borderWidth: 1, borderRadius: borderRadius.lg, paddingHorizontal: spacing[4], paddingVertical: spacing[4], fontSize: typography.sizes.base },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: borderRadius.lg, gap: spacing[2] },
  submitBtnText: { fontSize: typography.sizes.base, fontWeight: '600' },
  successBox: { alignItems: 'center', padding: spacing[6], borderRadius: borderRadius.xl },
  successTitle: { fontSize: typography.sizes.xl, fontWeight: '700', marginTop: spacing[3] },
  successText: { fontSize: typography.sizes.base, marginTop: spacing[1] },
  checkCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
  errorText: { fontSize: typography.sizes.sm, marginTop: spacing[2], textAlign: 'center' },

  // Compare
  compareTable: { borderWidth: 1, borderRadius: borderRadius.xl, overflow: 'hidden', maxWidth: 450, alignSelf: 'center', width: '100%', marginBottom: spacing[8] },
  compareHeader: { flexDirection: 'row', paddingVertical: spacing[3], paddingHorizontal: spacing[5] },
  compareHeaderText: { flex: 1, fontSize: typography.sizes.base, fontWeight: '700', textAlign: 'center' },
  compareRow: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: spacing[4], paddingHorizontal: spacing[5] },
  compareNow: { flex: 1, fontSize: typography.sizes.base, fontWeight: '500' },
  compareLater: { flex: 1, fontSize: typography.sizes.base, textAlign: 'right' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[4], paddingHorizontal: spacing[7], borderRadius: borderRadius.xl, gap: spacing[2], alignSelf: 'center', ...shadows.md },
  ctaBtnText: { color: '#fff', fontSize: typography.sizes.base, fontWeight: '600' },

  // FAQ
  faqList: { gap: spacing[3], maxWidth: 600, alignSelf: 'center', width: '100%' },
  faqItem: { borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[5] },
  faqQ: { fontSize: typography.sizes.base, fontWeight: '600', flex: 1 },
  faqA: { fontSize: typography.sizes.base, lineHeight: 24, paddingHorizontal: spacing[5], paddingBottom: spacing[5] },

  // Final CTA
  finalCTASection: { paddingVertical: spacing[16], paddingHorizontal: spacing[6], alignItems: 'center' },
  finalCTAGradient: { width: '100%', alignItems: 'center', paddingVertical: spacing[12], paddingHorizontal: spacing[8], borderRadius: borderRadius['2xl'], ...shadows.xl },
  finalCTATitle: { color: '#FFFFFF', fontSize: typography.sizes['2xl'], fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] },
  finalCTASub: { color: 'rgba(255, 255, 255, 0.9)', fontSize: typography.sizes.lg, textAlign: 'center', marginBottom: spacing[6] },
  noSpam: { color: 'rgba(255, 255, 255, 0.6)', fontSize: typography.sizes.sm, marginTop: spacing[4] },

  // Footer
  footer: { borderTopWidth: 1, paddingVertical: spacing[6], paddingHorizontal: spacing[6] },
  footerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'center', width: '100%' },
  footerLogo: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  footerLogoText: { fontSize: typography.sizes.base, fontWeight: '600' },
  footerCopyright: { fontSize: typography.sizes.sm },

  // High Impact Waitlist Section
  waitlistSection: { paddingVertical: spacing[12], paddingHorizontal: spacing[6], position: 'relative', overflow: 'hidden' },
  urgencyBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: borderRadius.full, marginBottom: spacing[4], gap: spacing[2] },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  urgencyText: { color: '#fca5a5', fontSize: typography.sizes.sm, fontWeight: '700', letterSpacing: 1.5 },
  waitlistHeadline: { color: '#fff', fontSize: 42, fontWeight: '800', textAlign: 'center', marginBottom: spacing[2], letterSpacing: -1 },
  waitlistSubheadline: { color: 'rgba(255,255,255,0.7)', fontSize: typography.sizes.xl, textAlign: 'center', marginBottom: spacing[6] },
  priceCard2: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: borderRadius['2xl'], padding: spacing[1], alignSelf: 'center', marginBottom: spacing[6], borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  priceCardInner: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: borderRadius.xl, padding: spacing[6], alignItems: 'center' },
  priceCardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: typography.sizes.sm, fontWeight: '600', letterSpacing: 2, marginBottom: spacing[2] },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  priceOld2: { color: 'rgba(255,255,255,0.4)', fontSize: 32, fontWeight: '600', textDecorationLine: 'line-through' },
  priceNew2Container: { alignItems: 'center' },
  priceNew2: { color: '#4ade80', fontSize: 56, fontWeight: '800' },
  saveBadge: { backgroundColor: '#4ade80', paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: borderRadius.full, marginTop: spacing[1] },
  saveBadgeText: { color: '#000', fontSize: 12, fontWeight: '800' },
  priceCardNote: { color: 'rgba(255,255,255,0.6)', fontSize: typography.sizes.sm, marginTop: spacing[3], textAlign: 'center' },
  benefitsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing[6], marginBottom: spacing[6], flexWrap: 'wrap' },
  benefitItem: { alignItems: 'center', gap: spacing[1] },
  benefitIcon: { fontSize: 24 },
  benefitText: { color: 'rgba(255,255,255,0.8)', fontSize: typography.sizes.sm, fontWeight: '500' },
  signupCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: borderRadius['2xl'], padding: spacing[6], maxWidth: 480, alignSelf: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing[4], marginTop: spacing[4], flexWrap: 'wrap' },
  trustText: { color: 'rgba(255,255,255,0.5)', fontSize: typography.sizes.sm },
  socialProofRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[3], marginTop: spacing[6] },
  avatarStack: { flexDirection: 'row' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1a1a2e' },
  avatarEmoji: { fontSize: 16 },
  socialProofText: { color: 'rgba(255,255,255,0.7)', fontSize: typography.sizes.sm },
});

export default WaitlistLandingPage;
