import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { GradientButton, ProgressBar } from '@/components/ui';
import { DeckCard } from '@/components/deck';
import { useAuthStore, useDeckStore, useStudyStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { MainTabScreenProps } from '@/navigation/types';

// Reusable hover hook for web
function useHoverState() {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};
  return { isHovered, webProps };
}

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { decks } = useDeckStore();
  const { stats } = useStudyStore();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { isDark, toggleTheme } = useTheme();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent, colors } = useThemedColors();

  // Hover states for buttons
  const themeToggle = useHoverState();
  const searchBtn = useHoverState();
  const createDeckBtn = useHoverState();
  const streakBadge = useHoverState();
  const startReview = useHoverState();
  const seeAllBtn = useHoverState();
  const emptyCreateBtn = useHoverState();
  const emptyBrowseBtn = useHoverState();
  const quickAction1 = useHoverState();
  const quickAction2 = useHoverState();
  const quickAction3 = useHoverState();

  const [showMasteryInfo, setShowMasteryInfo] = useState(false);

  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer' as const,
    transition: 'transform 150ms ease, background-color 150ms ease, box-shadow 150ms ease',
  } : {};

  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);
  const totalMastered = decks.reduce((sum, d) => sum + d.masteredCount, 0);
  const masteryPercentage = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  // Separate decks into created and saved
  const myCreatedDecks = decks
    .filter((d) => !d.originalAuthorId || !d.originalAuthorName)
    .sort((a, b) => {
      const aDate = a.lastStudied ? new Date(a.lastStudied).getTime() : 0;
      const bDate = b.lastStudied ? new Date(b.lastStudied).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, isDesktop ? 3 : 2);

  const savedPublicDecks = decks
    .filter((d) => d.originalAuthorId && d.originalAuthorName)
    .sort((a, b) => {
      const aDate = a.lastStudied ? new Date(a.lastStudied).getTime() : 0;
      const bDate = b.lastStudied ? new Date(b.lastStudied).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, isDesktop ? 3 : 2);

  const handleDeckPress = (deckId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('DeckDetail', { deckId });
  };

  const handleAuthorPress = (authorId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('UserProfile', { userId: authorId });
  };

  const handleStartStudy = () => {
    const deckWithDue = decks.find((d) => d.dueCount > 0);
    if (deckWithDue) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('Study', { deckId: deckWithDue.id });
    } else if (decks.length > 0) {
      // No cards due, but user has decks - offer to study anyway
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('Study', { deckId: decks[0].id });
    } else {
      // No decks at all
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      navigation.navigate('CreateTab' as never);
    }
  };

  const handleSocial = () => {
    navigation.navigate('Social', {});
  };

  // Responsive values
  const containerMaxWidth = isDesktop ? 1200 : isTablet ? 900 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];
  const deckGridColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  // Check if user is a new user (no decks)
  const hasNoDecks = decks.length === 0;
  const totalDueCards = decks.reduce((sum, d) => sum + (d.dueCount || 0), 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isMobile ? insets.top + spacing[4] : spacing[6],
          paddingHorizontal: contentPadding,
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header - simplified */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={[styles.greeting, { color: textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: textPrimary }, isDesktop && styles.userNameDesktop]}>
              {user?.name || 'Learner'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* Theme toggle on mobile */}
          {isMobile && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: themeToggle.isHovered ? surfaceHover : surface },
                webButtonStyle,
              ]}
              onPress={toggleTheme}
              {...themeToggle.webProps}
            >
              <Ionicons
                name={isDark ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={themeToggle.isHovered ? textPrimary : textSecondary}
              />
            </TouchableOpacity>
          )}
          {/* Desktop/Tablet header buttons */}
          {(isDesktop || isTablet) && (
            <>
              <TouchableOpacity
                style={[
                  styles.searchBtn,
                  { backgroundColor: createDeckBtn.isHovered ? surfaceHover : surface, borderColor: createDeckBtn.isHovered ? accent.orange : border },
                  webButtonStyle,
                ]}
                onPress={() => navigation.navigate('CreateTab' as never)}
                {...createDeckBtn.webProps}
              >
                <Ionicons name="add" size={18} color={createDeckBtn.isHovered ? accent.orange : textPrimary} />
                <Text style={[styles.searchBtnText, { color: createDeckBtn.isHovered ? accent.orange : textPrimary }]}>Create Deck</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createDeckBtn,
                  { backgroundColor: accent.orange },
                  webButtonStyle,
                  searchBtn.isHovered && styles.btnHovered,
                ]}
                onPress={handleStartStudy}
                {...searchBtn.webProps}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.createDeckText}>Study Now</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[
              styles.streakBadge,
              { backgroundColor: streakBadge.isHovered ? surfaceHover : surface, borderColor: streakBadge.isHovered ? accent.orange : border, borderWidth: 1 },
              webButtonStyle,
            ]}
            onPress={() => navigation.navigate('Statistics')}
            {...streakBadge.webProps}
          >
            <Ionicons name="flame" size={18} color={accent.red} />
            <Text style={[styles.streakText, { color: textPrimary }]}>{user?.streakCurrent || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/*
        MOBILE HERO CTA - Primary Study Action
        UX Principle: Fitts's Law - large, prominent touch target for primary action
        Learning UX: Active recall primacy - studying should be the dominant action
      */}
      {isMobile && !hasNoDecks && (
        <TouchableOpacity
          style={[
            styles.mobileStudyCTA,
            { backgroundColor: accent.orange },
            webButtonStyle,
          ]}
          onPress={handleStartStudy}
          activeOpacity={0.8}
        >
          <View style={styles.mobileStudyCTAContent}>
            <View style={styles.mobileStudyCTALeft}>
              <Text style={styles.mobileStudyCTATitle}>
                {totalDueCards > 0 ? 'Ready to Study?' : 'Keep Learning'}
              </Text>
              <Text style={styles.mobileStudyCTASubtitle}>
                {totalDueCards > 0
                  ? `${totalDueCards} card${totalDueCards === 1 ? '' : 's'} due for review`
                  : 'Continue where you left off'
                }
              </Text>
            </View>
            <View style={styles.mobileStudyCTAButton}>
              <Ionicons name="play" size={24} color={accent.orange} />
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/*
        NEW USER WELCOME STATE
        UX Principle: Progressive disclosure - guide new users to first action
        Learning UX: Minimum viable study session - get them studying ASAP
      */}
      {hasNoDecks && (
        <View style={[styles.welcomeHero, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.welcomeIconContainer, { backgroundColor: accent.orange + '20' }]}>
            <Ionicons name="sparkles" size={32} color={accent.orange} />
          </View>
          <Text style={[styles.welcomeTitle, { color: textPrimary }]}>
            Let's Get Started!
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: textSecondary }]}>
            Create your first deck or explore community decks to begin learning.
          </Text>

          {/* Single primary CTA (Hick's Law) */}
          <TouchableOpacity
            style={[
              styles.welcomePrimaryCTA,
              { backgroundColor: accent.orange },
              webButtonStyle,
              emptyCreateBtn.isHovered && styles.btnHovered,
            ]}
            onPress={() => navigation.navigate('CreateTab' as never)}
            {...emptyCreateBtn.webProps}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.welcomePrimaryCTAText}>Create Your First Deck</Text>
          </TouchableOpacity>

          {/* Secondary action - less prominent */}
          <TouchableOpacity
            style={[
              styles.welcomeSecondaryCTA,
              { borderColor: border },
              webButtonStyle,
              emptyBrowseBtn.isHovered && { borderColor: accent.orange, backgroundColor: surfaceHover },
            ]}
            onPress={() => navigation.navigate('DiscoverTab' as never)}
            {...emptyBrowseBtn.webProps}
          >
            <Ionicons name="compass-outline" size={18} color={emptyBrowseBtn.isHovered ? accent.orange : textSecondary} />
            <Text style={[
              styles.welcomeSecondaryCTAText,
              { color: emptyBrowseBtn.isHovered ? accent.orange : textSecondary }
            ]}>
              Browse Community Decks
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Cards */}
      <View style={[
        styles.statsRow,
        {
          flexDirection: isDesktop || isTablet ? 'row' : 'column',
          marginHorizontal: isDesktop || isTablet ? -spacing[2] : 0,
        }
      ]}>
        {/* Due Today Card */}
        <View style={[
          { paddingHorizontal: isDesktop || isTablet ? spacing[2] : 0 },
          (isDesktop || isTablet) && { width: `${100 / 3}%` },
          isMobile && { marginBottom: spacing[4] }
        ]}>
          <View style={[
            styles.statCard,
            { backgroundColor: surface, borderColor: border, height: '100%' }
          ]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="calendar-outline" size={18} color={textSecondary} />
              <Text style={[styles.statCardLabel, { color: textSecondary }]}>Due Today</Text>
            </View>
            <Text style={[styles.statCardValue, { color: textPrimary }]}>{stats.dueToday}</Text>
            {stats.dueToday > 0 && (
              <TouchableOpacity
                style={[
                  styles.statCardAction,
                  Platform.OS === 'web' && { cursor: 'pointer', transition: 'transform 150ms ease' } as any,
                  startReview.isHovered && { transform: [{ translateX: 4 }] },
                ]}
                onPress={handleStartStudy}
                {...startReview.webProps}
              >
                <Text style={[styles.statCardActionText, { color: accent.orange }]}>Start Review</Text>
                <Ionicons name="arrow-forward" size={14} color={accent.orange} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Streak Card */}
        <View style={[
          { paddingHorizontal: isDesktop || isTablet ? spacing[2] : 0 },
          (isDesktop || isTablet) && { width: `${100 / 3}%` },
          isMobile && { marginBottom: spacing[4] }
        ]}>
          <View style={[
            styles.statCard,
            { backgroundColor: surface, borderColor: border, height: '100%' }
          ]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="flame-outline" size={18} color={textSecondary} />
              <Text style={[styles.statCardLabel, { color: textSecondary }]}>Current Streak</Text>
            </View>
            <Text style={[styles.statCardValue, { color: textPrimary }]}>{user?.streakCurrent || 0} days</Text>
            <Text style={[styles.statCardSubtext, { color: textSecondary }]}>
              Best: {user?.streakLongest || 0} days
            </Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={[
          { paddingHorizontal: isDesktop || isTablet ? spacing[2] : 0 },
          (isDesktop || isTablet) && { width: `${100 / 3}%` }
        ]}>
          <View style={[
            styles.statCard,
            { backgroundColor: surface, borderColor: border, height: '100%' }
          ]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="trending-up-outline" size={18} color={textSecondary} />
              <Text style={[styles.statCardLabel, { color: textSecondary }]}>Mastery</Text>
              <TouchableOpacity
                onPress={() => setShowMasteryInfo(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}
              >
                <Ionicons name="information-circle-outline" size={16} color={textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.statCardValue, { color: textPrimary }]}>{masteryPercentage}%</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: accent.orange, width: `${masteryPercentage}%` }
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions - Mobile Only */}
      {isMobile && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.quickAction,
                { backgroundColor: quickAction1.isHovered ? surfaceHover : surface, borderColor: quickAction1.isHovered ? accent.orange : border },
                webButtonStyle,
              ]}
              onPress={() => navigation.navigate('CreateTab' as never)}
              {...quickAction1.webProps}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: surfaceHover }]}>
                <Ionicons name="add-outline" size={22} color={accent.orange} />
              </View>
              <Text style={[styles.quickActionText, { color: textPrimary }]}>Create Deck</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickAction,
                { backgroundColor: quickAction2.isHovered ? surfaceHover : surface, borderColor: quickAction2.isHovered ? accent.orange : border },
                webButtonStyle,
              ]}
              onPress={handleSocial}
              {...quickAction2.webProps}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: surfaceHover }]}>
                <Ionicons name="people-outline" size={22} color={accent.orange} />
              </View>
              <Text style={[styles.quickActionText, { color: textPrimary }]}>Community</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickAction,
                { backgroundColor: quickAction3.isHovered ? surfaceHover : surface, borderColor: quickAction3.isHovered ? accent.orange : border },
                webButtonStyle,
              ]}
              onPress={() => navigation.navigate('Statistics')}
              {...quickAction3.webProps}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: surfaceHover }]}>
                <Ionicons name="stats-chart-outline" size={22} color={accent.orange} />
              </View>
              <Text style={[styles.quickActionText, { color: textPrimary }]}>Statistics</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* My Created Decks Section */}
      <View style={styles.section}>
        <View style={[styles.deckSectionHeader, { borderBottomColor: border }]}>
          <View style={styles.deckSectionHeaderLeft}>
            <Ionicons name="person" size={18} color={accent.orange} />
            <Text style={[styles.deckSectionTitle, { color: textPrimary }]}>{user?.name ? `${user.name}'s Decks` : 'My Decks'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('LibraryTab' as never)}
            style={[
              Platform.OS === 'web' && { cursor: 'pointer', transition: 'opacity 150ms ease' } as any,
            ]}
            {...seeAllBtn.webProps}
          >
            <Text style={[
              styles.seeAllText,
              { color: accent.orange },
              seeAllBtn.isHovered && { textDecorationLine: 'underline' },
            ]}>See All</Text>
          </TouchableOpacity>
        </View>

        {myCreatedDecks.length > 0 ? (
          <View style={[
            styles.deckGrid,
            {
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginHorizontal: isDesktop || isTablet ? -spacing[2] : 0,
            }
          ]}>
            {myCreatedDecks.map((deck) => {
              const cardWidth = isDesktop
                ? `${100 / 3}%`
                : isTablet
                  ? '50%'
                  : '100%';

              return (
                <View
                  key={deck.id}
                  style={[
                    {
                      width: cardWidth,
                      paddingHorizontal: isDesktop || isTablet ? spacing[2] : 0,
                      marginBottom: spacing[4],
                    },
                  ]}
                >
                  <DeckCard
                    deck={deck}
                    onPress={() => handleDeckPress(deck.id)}
                    onAuthorPress={handleAuthorPress}
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.sectionEmptyState, { backgroundColor: surface, borderColor: border }]}>
            <Ionicons name="create-outline" size={32} color={textSecondary} />
            <Text style={[styles.sectionEmptyText, { color: textSecondary }]}>No decks created yet</Text>
            <TouchableOpacity
              style={[styles.sectionEmptyButton, { backgroundColor: accent.orange }]}
              onPress={() => navigation.navigate('CreateTab' as never)}
            >
              <Text style={styles.sectionEmptyButtonText}>Create Deck</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Saved Public Decks Section */}
      <View style={styles.section}>
        <View style={[styles.deckSectionHeader, { borderBottomColor: border }]}>
          <View style={styles.deckSectionHeaderLeft}>
            <Ionicons name="bookmark" size={18} color={accent.blue} />
            <Text style={[styles.deckSectionTitle, { color: textPrimary }]}>Saved Public Decks</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('LibraryTab' as never)}
            style={[
              Platform.OS === 'web' && { cursor: 'pointer', transition: 'opacity 150ms ease' } as any,
            ]}
            {...seeAllBtn.webProps}
          >
            <Text style={[
              styles.seeAllText,
              { color: accent.orange },
              seeAllBtn.isHovered && { textDecorationLine: 'underline' },
            ]}>See All</Text>
          </TouchableOpacity>
        </View>

        {savedPublicDecks.length > 0 ? (
          <View style={[
            styles.deckGrid,
            {
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginHorizontal: isDesktop || isTablet ? -spacing[2] : 0,
            }
          ]}>
            {savedPublicDecks.map((deck) => {
              const cardWidth = isDesktop
                ? `${100 / 3}%`
                : isTablet
                  ? '50%'
                  : '100%';

              return (
                <View
                  key={deck.id}
                  style={[
                    {
                      width: cardWidth,
                      paddingHorizontal: isDesktop || isTablet ? spacing[2] : 0,
                      marginBottom: spacing[4],
                    },
                  ]}
                >
                  <DeckCard
                    deck={deck}
                    onPress={() => handleDeckPress(deck.id)}
                    onAuthorPress={handleAuthorPress}
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.sectionEmptyState, { backgroundColor: surface, borderColor: border }]}>
            <Ionicons name="compass-outline" size={32} color={textSecondary} />
            <Text style={[styles.sectionEmptyText, { color: textSecondary }]}>No saved decks yet</Text>
            <TouchableOpacity
              style={[styles.sectionEmptyButton, { backgroundColor: accent.blue }]}
              onPress={() => navigation.navigate('DiscoverTab' as never)}
            >
              <Text style={styles.sectionEmptyButtonText}>Browse Public Decks</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom spacing */}
      <View style={{ height: spacing[20] }} />

      {/* Mastery Info Modal */}
      <Modal
        visible={showMasteryInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMasteryInfo(false)}
      >
        <Pressable
          style={styles.infoModalOverlay}
          onPress={() => setShowMasteryInfo(false)}
        >
          <Pressable
            style={[styles.infoModalContent, { backgroundColor: surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.infoModalHeader}>
              <View style={styles.infoModalTitleRow}>
                <Ionicons name="school" size={24} color={accent.green} />
                <Text style={[styles.infoModalTitle, { color: textPrimary }]}>What is Mastery?</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMasteryInfo(false)}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.infoModalText, { color: textSecondary }]}>
              Mastery measures the percentage of cards you've truly learned. A card is considered "mastered" when you can reliably recall it for at least 3 weeks without reviewing.
            </Text>
            <Text style={[styles.infoModalText, { color: textSecondary, marginTop: spacing[3] }]}>
              The more consistently you study and rate cards as "Good" or "Easy", the faster they'll reach mastery status. Cards you forget will return to the learning phase.
            </Text>
            <TouchableOpacity
              style={[styles.infoModalButton, { backgroundColor: accent.orange }]}
              onPress={() => setShowMasteryInfo(false)}
            >
              <Text style={styles.infoModalButtonText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  btnHovered: {
    transform: [{ scale: 1.02 }],
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  greeting: {
    fontSize: typography.sizes.base,
  },
  userName: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.semibold,
  },
  userNameDesktop: {
    fontSize: typography.sizes['3xl'],
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchBtnText: {
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.sizes.base,
  },
  createDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },
  createDeckText: {
    color: '#fff',
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.sizes.base,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    gap: spacing[1],
  },
  streakText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  // Stats Cards
  statsRow: {
    marginBottom: spacing[6],
  },
  statCard: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  statCardLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  statCardValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.semibold,
  },
  statCardSubtext: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  statCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[3],
  },
  statCardActionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 2,
    marginTop: spacing[3],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  quickActionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  // Sections
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[4],
  },
  seeAllText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  // Deck Section Headers
  deckSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[3],
    marginBottom: spacing[4],
    borderBottomWidth: 1,
  },
  deckSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  deckSectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionEmptyState: {
    alignItems: 'center',
    padding: spacing[8],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  sectionEmptyText: {
    fontSize: typography.sizes.base,
    marginTop: spacing[3],
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  sectionEmptyButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },
  sectionEmptyButtonText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  // Deck Grid
  deckGrid: {
    marginTop: spacing[2],
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing[1],
  },
  emptyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  emptyBrowseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  emptyBrowseButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  infoModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    ...shadows.xl,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  infoModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  infoModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  infoModalText: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  infoModalButton: {
    marginTop: spacing[5],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  infoModalButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.semibold,
  },
  // Mobile Hero CTA - prominent study button for mobile (Fitts's Law)
  mobileStudyCTA: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[5],
    ...shadows.md,
  },
  mobileStudyCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileStudyCTALeft: {
    flex: 1,
  },
  mobileStudyCTATitle: {
    color: '#fff',
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  mobileStudyCTASubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: typography.sizes.sm,
  },
  mobileStudyCTAButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[3],
  },
  // Welcome Hero for new users (Progressive disclosure)
  welcomeHero: {
    alignItems: 'center',
    padding: spacing[8],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing[6],
  },
  welcomeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  welcomeTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  welcomeSubtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
    maxWidth: 300,
  },
  welcomePrimaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
    width: '100%',
    maxWidth: 280,
    ...shadows.md,
  },
  welcomePrimaryCTAText: {
    color: '#fff',
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  welcomeSecondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
    marginTop: spacing[3],
  },
  welcomeSecondaryCTAText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
});
