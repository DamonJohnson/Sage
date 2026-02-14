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

// FAQ - designed to showcase features and handle objections
const FAQ_DATA = [
  {
    q: "Is the waitlist really free?",
    a: "Yes, completely free. No credit card, no payment. You're just reserving your spot to get 50% off lifetime access when we launch in 2 weeks."
  },
  {
    q: "What do I get as a waitlist member?",
    a: "You lock in 50% off lifetime access. That includes unlimited decks, all creation modes, AI features, Anki import, and every future feature we build."
  },
  {
    q: "How is this different from Anki?",
    a: "Anki is powerful but complex. Sage gives you the same proven spaced repetition algorithm with AI card generation, modern UI, and zero setup time. Upload a PDF and you're studying in 30 seconds, not 30 minutes."
  },
  {
    q: "Can I import my existing Anki decks?",
    a: "Yes. One-click .apkg import. Your cards, scheduling data, and tags all transfer. Nothing is lost. You can keep using both if you want."
  },
  {
    q: "How does Image Occlusion work?",
    a: "Upload any image, draw boxes over parts you want to memorise, and Sage generates flashcards automatically. Perfect for diagrams, charts, maps, or any visual content you need to learn."
  },
  {
    q: "What if the AI generates wrong cards?",
    a: "Edit any card instantly. The AI gets you 90% there in seconds. You refine the rest. Still faster than making everything from scratch."
  },
  {
    q: "Is my data private?",
    a: "Your cards and study data are encrypted and never shared. We don't use your content to train AI. Your study materials stay yours."
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
          <Text style={styles.submitBtnText}>{isLoading ? 'Joining...' : 'Join Waitlist'}</Text>
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
        <Text style={styles.spotsHighlight}>{spots.remaining}</Text> of {spots.total} spots remaining
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
          {/* Badge */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>FREE TO JOIN</Text>
          </View>

          {/* Headline */}
          <Text style={[styles.headline, isDesktop && styles.headlineDesktop]}>
            Stop Making Flashcards.{'\n'}
            <Text style={styles.headlineAccent}>Start Studying.</Text>
          </Text>

          <Text style={styles.subheadline}>
            The proven way to memorise anything. Master anatomy with image occlusion, learn pharmacology with AI-generated cards, and ace your exams with spaced repetition.
          </Text>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Join the Waitlist for Free</Text>
            <Text style={styles.formSubtitle}>Lock in 50% off lifetime access — launching in 2 weeks</Text>
            <SpotsCounter onCountLoaded={setWaitlistCount} />
            <WaitlistForm />
            <Text style={styles.trustText}>No payment required. No spam. Unsubscribe anytime.</Text>
          </View>

          {/* Social proof */}
          <Text style={styles.socialProof}>
            Join <Text style={styles.socialProofHighlight}>{waitlistCount}+ students</Text> already on the waitlist
          </Text>
        </Animated.View>

        {/* CREATE FROM ANYTHING */}
        <View style={[styles.section, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionTitle, { marginBottom: spacing[8] }]}>Create Cards From Anything</Text>

          <View style={styles.createMethods}>
            {[
              { icon: 'document-text', label: 'PDF Slides' },
              { icon: 'sparkles', label: 'AI Generation' },
              { icon: 'image', label: 'Image to Text' },
              { icon: 'grid', label: 'Image Occlusion' },
              { icon: 'cloud-download', label: 'Anki Import' },
              { icon: 'create', label: 'Manual' },
            ].map((m, i) => (
              <View key={i} style={styles.createMethod}>
                <Ionicons name={m.icon as any} size={20} color="#f97316" />
                <Text style={styles.createMethodText}>{m.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.aiFeature}>
            <Ionicons name="sparkles" size={20} color="#4ade80" />
            <Text style={styles.aiFeatureText}>
              <Text style={{ fontWeight: '700', color: '#4ade80' }}>AI Study Assistant</Text> — Generate new cards on the fly while studying. Just ask.
            </Text>
          </View>
        </View>

        {/* FAQ */}
        <View style={[styles.section, { maxWidth: containerMaxWidth }]}>
          <Text style={[styles.sectionTitle, { marginBottom: spacing[8] }]}>FAQ</Text>

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
          <Text style={styles.finalTitle}>Ready to study smarter?</Text>
          <Text style={styles.finalSubtitle}>Join free and lock in 50% off lifetime access</Text>
          <TouchableOpacity style={styles.finalBtn} onPress={scrollToSignup} activeOpacity={0.8}>
            <Text style={styles.finalBtnText}>Join the Waitlist — It's Free</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </TouchableOpacity>
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
  hero: { width: '100%', paddingHorizontal: spacing[6], paddingTop: spacing[8], paddingBottom: spacing[12], alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(249, 115, 22, 0.15)', paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: 100, marginBottom: spacing[6], gap: spacing[2] },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f97316' },
  badgeText: { color: '#f97316', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headline: { color: '#fff', fontSize: 36, fontWeight: '800', textAlign: 'center', lineHeight: 44, marginBottom: spacing[4] },
  headlineDesktop: { fontSize: 52, lineHeight: 60 },
  headlineAccent: { color: '#4ade80' },
  subheadline: { color: 'rgba(255,255,255,0.7)', fontSize: 18, textAlign: 'center', marginBottom: spacing[6], maxWidth: 500 },

  // Form Card
  formCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: spacing[6], width: '100%', maxWidth: 440, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  formTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: spacing[1] },
  formSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginBottom: spacing[4] },
  formWrapper: { width: '100%' },
  formRow: { flexDirection: 'row', gap: spacing[3] },
  formRowMobile: { flexDirection: 'column' },
  emailInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: spacing[4], paddingVertical: spacing[4], fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4ade80', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderRadius: 12, gap: spacing[2] },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#f87171', fontSize: 14, marginTop: spacing[2], textAlign: 'center' },
  trustText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: spacing[4] },

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

  // Social proof
  socialProof: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: spacing[6] },
  socialProofHighlight: { color: '#4ade80', fontWeight: '600' },

  // Section
  section: { width: '100%', paddingHorizontal: spacing[6], paddingVertical: spacing[10] },
  sectionTitle: { color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] },

  // Features
  featuresGrid: { gap: spacing[4] },
  featuresGridRow: { flexDirection: 'row', justifyContent: 'center' },
  featureCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: spacing[5], alignItems: 'center', flex: 1, maxWidth: 280 },
  featureIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(249, 115, 22, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing[3] },
  featureTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: spacing[1] },
  featureDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' },

  // Create Methods
  createMethods: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing[3], marginBottom: spacing[6] },
  createMethod: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderRadius: 100, gap: spacing[2] },
  createMethodText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
  aiFeature: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: spacing[4], borderRadius: 12, gap: spacing[3], maxWidth: 500, alignSelf: 'center' },
  aiFeatureText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, flex: 1 },

  // Testimonial
  testimonial: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: spacing[6], marginBottom: spacing[8], borderLeftWidth: 3, borderLeftColor: '#f97316' },
  quote: { color: '#fff', fontSize: 18, fontStyle: 'italic', lineHeight: 28, marginBottom: spacing[3] },
  quoteAuthor: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing[8] },
  statsRowMobile: { flexDirection: 'column', alignItems: 'center', gap: spacing[4] },
  statItem: { alignItems: 'center' },
  statNum: { color: '#f97316', fontSize: 32, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: spacing[1] },

  // FAQ
  faqList: { gap: spacing[4], maxWidth: 600, alignSelf: 'center', width: '100%' },
  faqItem: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: spacing[5] },
  faqQ: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: spacing[2] },
  faqA: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22 },

  // Final CTA
  finalCta: { width: '100%', paddingHorizontal: spacing[6], paddingVertical: spacing[10], alignItems: 'center' },
  finalTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] },
  finalSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16, textAlign: 'center', marginBottom: spacing[5] },
  finalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4ade80', paddingHorizontal: spacing[6], paddingVertical: spacing[4], borderRadius: 12, gap: spacing[2] },
  finalBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

  // Footer
  footer: { width: '100%', paddingHorizontal: spacing[6], paddingTop: spacing[8], alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
