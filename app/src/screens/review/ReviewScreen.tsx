import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useDeckStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { DeckWithStats } from '@sage/shared';

export function ReviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();
  const { decks } = useDeckStore();

  const containerMaxWidth = isDesktop ? 700 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  // Get decks with cards due for review
  const dueDecks = decks.filter((deck) => deck.dueCount > 0);
  const totalDueCards = dueDecks.reduce((sum, deck) => sum + deck.dueCount, 0);

  const handleStudyDeck = (deckId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Study', { deckId });
  };

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Settings');
  };

  const renderDeck = ({ item }: { item: DeckWithStats }) => (
    <TouchableOpacity
      style={[styles.deckCard, { backgroundColor: surface }]}
      onPress={() => handleStudyDeck(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.deckInfo}>
        <Text style={[styles.deckTitle, { color: textPrimary }]}>{item.title}</Text>
        <Text style={[styles.deckDescription, { color: textSecondary }]} numberOfLines={1}>
          {item.description}
        </Text>
        <View style={styles.deckStats}>
          <View style={[styles.dueBadge, { backgroundColor: accent.orange + '15' }]}>
            <Ionicons name="time-outline" size={14} color={accent.orange} />
            <Text style={[styles.dueText, { color: accent.orange }]}>
              {item.dueCount} due
            </Text>
          </View>
          <Text style={[styles.totalCards, { color: textSecondary }]}>
            {item.cardCount} total cards
          </Text>
        </View>
      </View>
      <View style={[styles.studyButton, { backgroundColor: accent.orange }]}>
        <Ionicons name="play" size={20} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: isMobile ? insets.top : 0 }]}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
          paddingHorizontal: contentPadding,
        }
      ]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Review</Text>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: surface }]}
          onPress={handleOpenSettings}
        >
          <Ionicons name="settings-outline" size={22} color={textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={[
        styles.summaryContainer,
        {
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
          paddingHorizontal: contentPadding,
        }
      ]}>
        <View style={[styles.summaryCard, { backgroundColor: accent.orange + '15' }]}>
          <View style={styles.summaryContent}>
            <View style={[styles.summaryIcon, { backgroundColor: accent.orange }]}>
              <Ionicons name="flash" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryNumber, { color: textPrimary }]}>
                {totalDueCards}
              </Text>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>
                cards due for review
              </Text>
            </View>
          </View>
          {dueDecks.length > 0 && (
            <TouchableOpacity
              style={[styles.studyAllButton, { backgroundColor: accent.orange }]}
              onPress={() => handleStudyDeck(dueDecks[0].id)}
            >
              <Text style={styles.studyAllText}>Start Studying</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Settings Link */}
      <View style={{
        maxWidth: containerMaxWidth,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: contentPadding,
      }}>
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={handleOpenSettings}
        >
          <Ionicons name="sparkles-outline" size={18} color={accent.orange} />
          <Text style={[styles.settingsLinkText, { color: textSecondary }]}>
            Adjust spaced repetition settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Decks List */}
      <Text style={[
        styles.sectionTitle,
        {
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
          paddingHorizontal: contentPadding,
          color: textPrimary,
        }
      ]}>
        Decks with due cards
      </Text>

      <FlatList
        data={dueDecks}
        renderItem={renderDeck}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          }
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: accent.green + '15' }]}>
              <Ionicons name="checkmark-circle" size={48} color={accent.green} />
            </View>
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>All caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
              No cards are due for review right now. Check back later or add new decks to study.
            </Text>
          </View>
        }
      />
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
    ...shadows.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryContainer: {
    marginTop: spacing[4],
    marginBottom: spacing[4],
  },
  summaryCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    marginLeft: spacing[4],
  },
  summaryNumber: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: typography.sizes.base,
    marginTop: 2,
  },
  studyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
    gap: spacing[2],
  },
  studyAllText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    marginBottom: spacing[4],
  },
  settingsLinkText: {
    fontSize: typography.sizes.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  deckInfo: {
    flex: 1,
  },
  deckTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  deckDescription: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  deckStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginRight: spacing[3],
  },
  dueText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginLeft: spacing[1],
  },
  totalCards: {
    fontSize: typography.sizes.sm,
  },
  studyButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing[3],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing[2],
    textAlign: 'center',
    paddingHorizontal: spacing[4],
    lineHeight: 22,
  },
});
