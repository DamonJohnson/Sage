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
import { useResponsive } from '@/hooks/useResponsive';
import { spacing, typography, borderRadius } from '@/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Value stack data
const VALUE_STACK = [
  {
    feature: 'AI Card Generation',
    description: 'paste a topic, get study-ready cards in seconds',
    replaces: 'Hours manually writing cards from textbooks',
  },
  {
    feature: 'PDF & Slide Upload',
    description: 'drag in your lecture slides, get a full deck back',
    replaces: 'Retyping slides into Anki one card at a time',
  },
  {
    feature: 'Image Occlusion',
    description: 'draw boxes on diagrams, charts, maps. Done.',
    replaces: 'Screenshotting, cropping, formatting in Anki',
  },
  {
    feature: 'AI Study Assistant',
    description: 'ask it to explain, quiz you, or generate new cards mid-session',
    replaces: 'Switching between apps and Google',
  },
  {
    feature: 'Smart Spaced Repetition',
    description: 'the same proven algorithm as Anki, zero configuration',
    replaces: 'Fiddling with Anki settings for 45 minutes',
  },
  {
    feature: 'One-Click Anki Import',
    description: 'bring your existing decks, scheduling data, and tags',
    replaces: 'Starting over from scratch',
  },
  {
    feature: 'Every future feature we build',
    description: 'founding members get everything, forever',
    replaces: 'Paying for updates and add-ons',
  },
];

// How it works steps
const STEPS = [
  {
    num: '1',
    title: 'Upload anything',
    desc: 'PDFs, slides, images, or just type a topic.',
  },
  {
    num: '2',
    title: 'Sage builds your deck',
    desc: 'AI generates cards, you review and refine. Edit anything instantly.',
  },
  {
    num: '3',
    title: 'Study smart',
    desc: "Spaced repetition shows you exactly what you're about to forget. No guessing, no wasted time.",
  },
];

// FAQ data
const FAQ_DATA = [
  {
    q: "Is the waitlist really free?",
    a: "Yes. No card, no payment. You're reserving your right to founding member pricing — 50% off lifetime access, locked in permanently."
  },
  {
    q: "What exactly do founding members get?",
    a: "Everything. Unlimited decks, all creation modes, AI features, Anki import, image occlusion, and every feature we ship after launch. No upsells. No tiers. One price, forever."
  },
  {
    q: "How is this different from Anki?",
    a: "Same proven spaced repetition science. None of the friction. Anki is a blank canvas that takes hours to set up. Sage gives you a complete study system — upload a PDF, get a deck, start studying. What takes 30 minutes in Anki takes 30 seconds here."
  },
  {
    q: "Can I import my Anki decks?",
    a: "One click. Your cards, scheduling data, and tags all transfer. Nothing lost. Use both if you want — but most people don't go back."
  },
  {
    q: "What if the AI gets a card wrong?",
    a: "Edit it in one tap. The AI gets you 90% there instantly. You refine the last 10%. Still 10x faster than building everything by hand."
  },
  {
    q: "Is my data private?",
    a: "Encrypted. Never shared. Never used to train AI models. Your study materials stay yours."
  },
];

// Waitlist Form Component
function WaitlistForm({ onSubmit }: { onSubmit?: () => void }) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), source: 'landing_page' }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
        onSubmit?.();
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successBox}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Text style={styles.successTitle}>You're in!</Text>
        <Text style={styles.successText}>Check your inbox for confirmation.</Text>
      </View>
    );
  }

  return (
    <View style={styles.formWrapper}>
      <View style={[styles.formRow, !isDesktop && styles.formRowMobile]}>
        <TextInput
          style={styles.emailInput}
          placeholder="Enter your email"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>{isLoading ? 'Joining...' : 'Reserve My Spot'}</Text>
          {!isLoading && <Ionicons name="arrow-forward" size={18} color="#000" />}
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Spots Counter Component
function SpotsCounter({ onCountLoaded }: { onCountLoaded?: (count: number) => void }) {
  const [spots, setSpots] = useState({ remaining: 127, total: 500, count: 373 });

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://sagebackend-production.up.railway.app';
        const response = await fetch(`${apiUrl}/api/waitlist/count`);
        const data = await response.json();
        if (data.success) {
          setSpots({
            remaining: data.data.spotsRemaining,
            total: data.data.totalSpots,
            count: data.data.count,
          });
          onCountLoaded?.(data.data.count);
        }
      } catch (e) {}
    };
    fetchCount();
  }, [onCountLoaded]);

  const progress = ((spots.total - spots.remaining) / spots.total) * 100;

  return (
    <View style={styles.spotsContainer}>
      <View style={styles.spotsBar}>
        <View style={[styles.spotsProgress, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.spotsText}>
        <Text style={styles.spotsHighlight}>{spots.remaining}</Text> of {spots.total} founding spots remaining — {spots.count} students already locked in
      </Text>
    </View>
  );
}

// Main Component
export default function WaitlistLandingPage() {
  const insets = useSafeAreaInsets();
  const { isDesktop, isTablet } = useResponsive();
  const containerMaxWidth = isDesktop ? 1100 : '100%';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [waitlistCount, setWaitlistCount] = useState(373);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const scrollToSignup = () => {
    if (Platform.OS === 'web') {
      document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e293b', '#0f172a']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* NAV */}
        <View style={[styles.nav, { paddingTop: insets.top + spacing[2], maxWidth: containerMaxWidth }]}>
          <View style={styles.logoContainer}>
            <RadiatingLogo accentColor="#f97316" size="small" />
            <Text style={styles.logoText}>Sage</Text>
          </View>
        </View>

        {/* HERO + SIGNUP */}
        <Animated.View
          style={[styles.hero, { maxWidth: containerMaxWidth, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          {...(Platform.OS === 'web' ? { nativeID: 'signup' } : {})}
        >
          {/* Headline */}
          <Text style={[styles.headline, isDesktop && styles.headlineDesktop]}>
            Study Less.{'\n'}
            <Text style={styles.headlineAccent}>Remember Everything.</Text>
          </Text>

          <Text style={styles.subheadline}>
            The AI-powered flashcard app that turns your lecture slides into exam-ready cards in 30 seconds — then tells you exactly what to study and when.
          </Text>

          {/* Form */}
          <View style={styles.formCard}>
            <SpotsCounter onCountLoaded={setWaitlistCount} />
            <WaitlistForm />
            <Text style={styles.trustText}>50% off lifetime access when we launch. No payment today.</Text>
          </View>
        </Animated.View>

        {/* VALUE STACK */}
        <View style={[styles.section, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>Everything you need to memorise anything</Text>
          <Text style={[styles.sectionSubtitle, isDesktop && styles.sectionSubtitleDesktop]}>without the busywork</Text>

          <View style={styles.valueStack}>
            {VALUE_STACK.map((item, i) => (
              <View key={i} style={styles.valueRow}>
                <View style={styles.valueGet}>
                  <Ionicons name="checkmark-circle" size={20} color="#4ade80" style={styles.valueIcon} />
                  <View style={styles.valueGetContent}>
                    <Text style={styles.valueFeature}>{item.feature}</Text>
                    <Text style={styles.valueDesc}>{item.description}</Text>
                  </View>
                </View>
                <View style={styles.valueReplace}>
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" style={styles.valueIcon} />
                  <Text style={styles.valueReplaceText}>{item.replaces}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* HOW IT WORKS */}
        <View style={[styles.section, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]}>From lecture slides to study session</Text>
          <Text style={[styles.sectionSubtitle, isDesktop && styles.sectionSubtitleDesktop]}>in 30 seconds</Text>

          <View style={styles.steps}>
            {STEPS.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{step.num}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={[styles.section, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop, { marginBottom: spacing[6] }]}>FAQ</Text>

          <View style={styles.faqList}>
            {FAQ_DATA.map((faq, i) => (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.faqQ}>{faq.q}</Text>
                <Text style={styles.faqA}>{faq.a}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FINAL CTA */}
        <View style={[styles.finalCta, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.finalTitle, isDesktop && styles.finalTitleDesktop]}>The waitlist closes at 500.</Text>
          <Text style={styles.finalSubtitle}>Founding member pricing disappears when we launch. Lock in your spot now — it takes 10 seconds and costs nothing.</Text>
          <TouchableOpacity style={styles.finalBtn} onPress={scrollToSignup} activeOpacity={0.8}>
            <Text style={styles.finalBtnText}>Reserve My Spot</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </TouchableOpacity>
          <Text style={styles.finalMicrocopy}>No payment required · No spam · Unsubscribe anytime</Text>
        </View>

        {/* FOOTER */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Text style={styles.footerText}>© 2026 Sage. Made for students, by students.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { alignItems: 'center' },

  // Nav
  nav: { width: '100%', paddingHorizontal: spacing[6], paddingBottom: spacing[4], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // Hero
  hero: { width: '100%', paddingHorizontal: spacing[4], paddingTop: spacing[6], paddingBottom: spacing[10], alignItems: 'center' },
  headline: { color: '#fff', fontSize: 32, fontWeight: '800', textAlign: 'center', lineHeight: 40, marginBottom: spacing[4] },
  headlineDesktop: { fontSize: 52, lineHeight: 60 },
  headlineAccent: { color: '#4ade80' },
  subheadline: { color: 'rgba(255,255,255,0.7)', fontSize: 16, textAlign: 'center', marginBottom: spacing[6], maxWidth: 600, lineHeight: 26, paddingHorizontal: spacing[2] },

  // Form Card
  formCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: spacing[5], width: '100%', maxWidth: 500, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  formWrapper: { width: '100%' },
  formRow: { flexDirection: 'row', gap: spacing[3] },
  formRowMobile: { flexDirection: 'column', gap: spacing[3] },
  emailInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: spacing[4], paddingVertical: spacing[3.5], fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4ade80', paddingHorizontal: spacing[4], paddingVertical: spacing[3.5], borderRadius: 12, gap: spacing[2] },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#f87171', fontSize: 14, marginTop: spacing[2], textAlign: 'center' },
  trustText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginTop: spacing[4] },

  // Success
  successBox: { alignItems: 'center', padding: spacing[6] },
  checkCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#000', fontSize: 24, fontWeight: '700' },
  successTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: spacing[3] },
  successText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: spacing[1] },

  // Spots
  spotsContainer: { marginBottom: spacing[4] },
  spotsBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: spacing[2] },
  spotsProgress: { height: '100%', backgroundColor: '#f97316', borderRadius: 3 },
  spotsText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  spotsHighlight: { color: '#f97316', fontWeight: '700' },

  // Section
  section: { width: '100%', paddingHorizontal: spacing[4], paddingVertical: spacing[8] },
  sectionTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2], paddingHorizontal: spacing[2] },
  sectionTitleDesktop: { fontSize: 32 },
  sectionSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 16, textAlign: 'center', marginBottom: spacing[6] },
  sectionSubtitleDesktop: { fontSize: 18, marginBottom: spacing[8] },

  // Value Stack
  valueStack: { gap: spacing[4], maxWidth: 700, alignSelf: 'center', width: '100%' },
  valueRow: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: spacing[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  valueGet: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing[2] },
  valueIcon: { marginRight: spacing[2], marginTop: 2 },
  valueGetContent: { flex: 1 },
  valueFeature: { color: '#fff', fontSize: 16, fontWeight: '600' },
  valueDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 },
  valueReplace: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing[7] },
  valueReplaceText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecorationLine: 'line-through' },

  // Steps
  steps: { gap: spacing[4], maxWidth: 500, alignSelf: 'center', width: '100%' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4] },
  stepNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stepContent: { flex: 1 },
  stepTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: spacing[1] },
  stepDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22 },

  // FAQ
  faqList: { gap: spacing[4], maxWidth: 600, alignSelf: 'center', width: '100%' },
  faqItem: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: spacing[5] },
  faqQ: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: spacing[2] },
  faqA: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22 },

  // Final CTA
  finalCta: { width: '100%', paddingHorizontal: spacing[4], paddingVertical: spacing[8], alignItems: 'center' },
  finalTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: spacing[3] },
  finalTitleDesktop: { fontSize: 32 },
  finalSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', marginBottom: spacing[5], maxWidth: 500, lineHeight: 24, paddingHorizontal: spacing[2] },
  finalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4ade80', paddingHorizontal: spacing[6], paddingVertical: spacing[4], borderRadius: 12, gap: spacing[2] },
  finalBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  finalMicrocopy: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: spacing[4] },

  // Footer
  footer: { width: '100%', paddingHorizontal: spacing[6], paddingTop: spacing[8], alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
