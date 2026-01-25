import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { spacing, typography, borderRadius } from '@/theme';
import { Footer } from '@/components/layout';
import { useAuthStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';

interface CreateOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  route: string;
  routeParams?: Record<string, string>;
  isPrimary?: boolean;
}

export function CreateHubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent, colors } = useThemedColors();

  const CREATE_OPTIONS: CreateOption[] = [
    {
      id: 'ai',
      title: 'AI Generate',
      description: 'Generate flashcards from any topic using AI',
      icon: 'sparkles',
      gradient: ['#9333EA', '#7C3AED'] as const,
      route: 'CreateAI',
    },
    {
      id: 'manual',
      title: 'Manual Create',
      description: 'Create cards one by one with full control',
      icon: 'create-outline',
      gradient: [accent.orange, '#E85D2B'] as const,
      route: 'CreateManual',
    },
    {
      id: 'pdf',
      title: 'PDF Upload',
      description: 'Extract flashcards from PDF documents',
      icon: 'document-text-outline',
      gradient: ['#0891B2', '#0E7490'] as const,
      route: 'CreatePDF',
    },
    {
      id: 'image',
      title: 'Image to Card',
      description: 'Create cards from images and diagrams',
      icon: 'image-outline',
      gradient: [accent.green, '#2D9262'] as const,
      route: 'CreateImage',
    },
    {
      id: 'import-anki',
      title: 'Import from Anki',
      description: 'Import decks from Anki (.apkg files)',
      icon: 'folder-open-outline',
      gradient: ['#1E40AF', '#3B82F6'] as const,
      route: 'CreateImport',
      routeParams: { mode: 'anki' },
    },
    {
      id: 'import-text',
      title: 'Import Text / CSV',
      description: 'Import from CSV, TSV, or plain text files',
      icon: 'document-outline',
      gradient: ['#6366F1', '#818CF8'] as const,
      route: 'CreateImport',
      routeParams: { mode: 'text' },
    },
  ];

  const containerMaxWidth = isDesktop ? 1000 : isTablet ? 800 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];
  const gridColumns = isDesktop ? 2 : 1;

  const handleOptionPress = (option: CreateOption) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (option.routeParams) {
      (navigation as any).navigate(option.route, option.routeParams);
    } else {
      (navigation as any).navigate(option.route);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isMobile ? insets.top + spacing[4] : spacing[8],
          paddingHorizontal: contentPadding,
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }, isDesktop && styles.titleDesktop]}>
          Create Deck
        </Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Choose how you want to create your flashcards
        </Text>
      </View>

      {/* Create Options */}
      <View style={[
        styles.optionsContainer,
        gridColumns > 1 && { flexDirection: 'row', flexWrap: 'wrap' }
      ]}>
        {CREATE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => handleOptionPress(option)}
            activeOpacity={0.8}
            style={[
              styles.optionCard,
              option.isPrimary && styles.optionCardPrimary,
              gridColumns > 1 && { width: '48%', marginRight: '2%' }
            ]}
          >
            <LinearGradient
              colors={option.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.optionGradient}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name={option.icon} size={32} color="#fff" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
            {option.isPrimary && (
              <View style={[styles.recommendedBadge, { backgroundColor: surface }]}>
                <Text style={[styles.recommendedText, { color: accent.orange }]}>Recommended</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Tips */}
      <View style={styles.tipsSection}>
        <Text style={[styles.tipsTitle, { color: textPrimary }]}>Quick Tips</Text>
        <View style={[styles.tipCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.tipIconContainer, { backgroundColor: accent.orange + '20' }]}>
            <Ionicons name="bulb-outline" size={20} color={accent.orange} />
          </View>
          <View style={styles.tipContent}>
            <Text style={[styles.tipText, { color: textSecondary }]}>
              For best results with AI generation, be specific about your topic. Instead of "History", try "World War II Major Battles".
            </Text>
          </View>
        </View>
        <View style={[styles.tipCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.tipIconContainer, { backgroundColor: accent.orange + '20' }]}>
            <Ionicons name="layers-outline" size={20} color={accent.orange} />
          </View>
          <View style={styles.tipContent}>
            <Text style={[styles.tipText, { color: textSecondary }]}>
              Keep cards simple - one concept per card works best for spaced repetition learning.
            </Text>
          </View>
        </View>
      </View>

      {/* Community Section */}
      <View style={styles.discoverSection}>
        <Text style={[styles.discoverTitle, { color: textSecondary }]}>Connect with learners</Text>
        <TouchableOpacity
          style={[styles.discoverButton, { backgroundColor: accent.orange + '15' }]}
          onPress={() => navigation.navigate('Social' as never, {})}
        >
          <Ionicons name="people-outline" size={20} color={accent.orange} />
          <Text style={[styles.discoverButtonText, { color: accent.orange }]}>Join the Community</Text>
          <Ionicons name="arrow-forward" size={16} color={accent.orange} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={{ marginTop: spacing[6] }}>
        <Footer />
      </View>

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[4],
  },
  header: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[2],
  },
  titleDesktop: {
    fontSize: typography.sizes['3xl'],
  },
  subtitle: {
    fontSize: typography.sizes.base,
  },
  optionsContainer: {
    marginBottom: spacing[8],
  },
  optionCard: {
    marginBottom: spacing[4],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  optionCardPrimary: {
    transform: [{ scale: 1.02 }],
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    color: '#fff',
    marginBottom: spacing[1],
  },
  optionDescription: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  recommendedBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendedText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  // Secondary options - less prominent (Progressive disclosure)
  secondarySection: {
    marginBottom: spacing[6],
  },
  secondaryTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryOptionsContainer: {
    gap: spacing[3],
  },
  secondaryOptionCard: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[3],
    alignItems: 'center',
  },
  secondaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  secondaryOptionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  secondaryOptionDesc: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  tipsSection: {
    marginBottom: spacing[8],
  },
  tipsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[4],
  },
  tipCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  discoverSection: {
    alignItems: 'center',
  },
  discoverTitle: {
    fontSize: typography.sizes.base,
    marginBottom: spacing[3],
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.full,
  },
  discoverButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
    marginHorizontal: spacing[2],
  },
});
