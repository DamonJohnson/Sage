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

import { useAuthStore, useDeckStore, useStudyStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius } from '@/theme';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'streak' | 'mastery' | 'collection' | 'study';
  requirement: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const { user } = useAuthStore();
  const { decks } = useDeckStore();
  const { stats } = useStudyStore();

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);
  const totalMastered = decks.reduce((sum, d) => sum + d.masteredCount, 0);
  const currentStreak = user?.streakCurrent || 0;

  const achievements: Achievement[] = [
    // Streak achievements
    {
      id: 'streak-3',
      title: 'Getting Started',
      description: 'Study for 3 days in a row',
      icon: 'flame-outline',
      category: 'streak',
      requirement: 3,
      current: currentStreak,
      unlocked: currentStreak >= 3,
    },
    {
      id: 'streak-7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day study streak',
      icon: 'flame',
      category: 'streak',
      requirement: 7,
      current: currentStreak,
      unlocked: currentStreak >= 7,
    },
    {
      id: 'streak-30',
      title: 'Monthly Master',
      description: 'Study every day for a month',
      icon: 'bonfire-outline',
      category: 'streak',
      requirement: 30,
      current: currentStreak,
      unlocked: currentStreak >= 30,
    },
    {
      id: 'streak-100',
      title: 'Centurion',
      description: 'Reach a 100-day streak',
      icon: 'bonfire',
      category: 'streak',
      requirement: 100,
      current: currentStreak,
      unlocked: currentStreak >= 100,
    },
    // Mastery achievements
    {
      id: 'master-10',
      title: 'First Steps',
      description: 'Master 10 cards',
      icon: 'checkmark-circle-outline',
      category: 'mastery',
      requirement: 10,
      current: totalMastered,
      unlocked: totalMastered >= 10,
    },
    {
      id: 'master-50',
      title: 'Knowledge Seeker',
      description: 'Master 50 cards',
      icon: 'school-outline',
      category: 'mastery',
      requirement: 50,
      current: totalMastered,
      unlocked: totalMastered >= 50,
    },
    {
      id: 'master-100',
      title: 'Scholar',
      description: 'Master 100 cards',
      icon: 'school',
      category: 'mastery',
      requirement: 100,
      current: totalMastered,
      unlocked: totalMastered >= 100,
    },
    {
      id: 'master-500',
      title: 'Sage',
      description: 'Master 500 cards',
      icon: 'library',
      category: 'mastery',
      requirement: 500,
      current: totalMastered,
      unlocked: totalMastered >= 500,
    },
    // Collection achievements
    {
      id: 'decks-3',
      title: 'Collector',
      description: 'Create 3 decks',
      icon: 'albums-outline',
      category: 'collection',
      requirement: 3,
      current: decks.length,
      unlocked: decks.length >= 3,
    },
    {
      id: 'decks-10',
      title: 'Librarian',
      description: 'Build a library of 10 decks',
      icon: 'albums',
      category: 'collection',
      requirement: 10,
      current: decks.length,
      unlocked: decks.length >= 10,
    },
    {
      id: 'cards-100',
      title: 'Card Crafter',
      description: 'Create 100 cards total',
      icon: 'documents-outline',
      category: 'collection',
      requirement: 100,
      current: totalCards,
      unlocked: totalCards >= 100,
    },
    {
      id: 'cards-500',
      title: 'Master Creator',
      description: 'Create 500 cards total',
      icon: 'documents',
      category: 'collection',
      requirement: 500,
      current: totalCards,
      unlocked: totalCards >= 500,
    },
    // Study achievements
    {
      id: 'review-100',
      title: 'Dedicated Learner',
      description: 'Review 100 cards',
      icon: 'eye-outline',
      category: 'study',
      requirement: 100,
      current: stats.reviewedToday * 10, // Mock accumulated
      unlocked: stats.reviewedToday * 10 >= 100,
    },
    {
      id: 'accuracy-80',
      title: 'Sharp Mind',
      description: 'Achieve 80% average accuracy',
      icon: 'analytics-outline',
      category: 'study',
      requirement: 80,
      current: Math.round(stats.averageAccuracy * 100),
      unlocked: stats.averageAccuracy >= 0.8,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const categories = ['streak', 'mastery', 'collection', 'study'] as const;
  const categoryLabels = {
    streak: 'Streaks',
    mastery: 'Mastery',
    collection: 'Collection',
    study: 'Study',
  };

  const getCategoryIcon = (category: typeof categories[number]): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'streak': return 'flame';
      case 'mastery': return 'trophy';
      case 'collection': return 'albums';
      case 'study': return 'book';
    }
  };

  const renderAchievement = (achievement: Achievement) => {
    const progress = Math.min(100, (achievement.current / achievement.requirement) * 100);

    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          { backgroundColor: surface, borderColor: border },
          achievement.unlocked && { borderColor: accent.orange },
        ]}
      >
        <View
          style={[
            styles.achievementIcon,
            {
              backgroundColor: achievement.unlocked ? accent.orange + '20' : surfaceHover,
            },
          ]}
        >
          <Ionicons
            name={achievement.icon}
            size={24}
            color={achievement.unlocked ? accent.orange : textSecondary}
          />
        </View>
        <View style={styles.achievementContent}>
          <View style={styles.achievementHeader}>
            <Text style={[styles.achievementTitle, { color: textPrimary }]}>
              {achievement.title}
            </Text>
            {achievement.unlocked && (
              <Ionicons name="checkmark-circle" size={18} color={accent.green} />
            )}
          </View>
          <Text style={[styles.achievementDescription, { color: textSecondary }]}>
            {achievement.description}
          </Text>
          {!achievement.unlocked && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: surfaceHover }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: accent.orange, width: `${progress}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: textSecondary }]}>
                {achievement.current} / {achievement.requirement}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Achievements</Text>
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
        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="trophy" size={32} color={accent.orange} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryTitle, { color: textPrimary }]}>
              {unlockedCount} of {achievements.length}
            </Text>
            <Text style={[styles.summarySubtitle, { color: textSecondary }]}>
              Achievements Unlocked
            </Text>
          </View>
          <View style={[styles.summaryProgress, { backgroundColor: surfaceHover }]}>
            <View
              style={[
                styles.summaryProgressFill,
                {
                  backgroundColor: accent.orange,
                  width: `${(unlockedCount / achievements.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Achievement Categories */}
        {categories.map((category) => {
          const categoryAchievements = achievements.filter(a => a.category === category);
          const unlockedInCategory = categoryAchievements.filter(a => a.unlocked).length;

          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <Ionicons name={getCategoryIcon(category)} size={20} color={accent.orange} />
                  <Text style={[styles.categoryTitle, { color: textPrimary }]}>
                    {categoryLabels[category]}
                  </Text>
                </View>
                <Text style={[styles.categoryCount, { color: textSecondary }]}>
                  {unlockedInCategory}/{categoryAchievements.length}
                </Text>
              </View>
              {categoryAchievements.map(renderAchievement)}
            </View>
          );
        })}

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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
    borderWidth: 1,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(244, 122, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.fontWeight.bold,
  },
  summarySubtitle: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  summaryProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
  },
  categorySection: {
    marginBottom: spacing[6],
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  categoryTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  categoryCount: {
    fontSize: typography.sizes.sm,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  achievementContent: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achievementTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  achievementDescription: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  progressContainer: {
    marginTop: spacing[3],
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
  },
});
