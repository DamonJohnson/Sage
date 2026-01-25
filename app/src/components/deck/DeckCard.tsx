import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useDeckStore } from '@/store';
import { borderRadius, spacing, typography, shadows } from '@/theme';
import type { DeckWithStats } from '@sage/shared';

interface DeckCardProps {
  deck: DeckWithStats;
  onPress: () => void;
  onAuthorPress?: (authorId: string) => void;
  showPrivacyToggle?: boolean;
}

export function DeckCard({ deck, onPress, onAuthorPress, showPrivacyToggle = true }: DeckCardProps) {
  const { surface, surfaceHover, border, textPrimary, textSecondary, accent, colors } = useThemedColors();
  const { updateDeck } = useDeckStore();
  const [isHovered, setIsHovered] = useState(false);
  const [privacyHovered, setPrivacyHovered] = useState(false);
  const [authorHovered, setAuthorHovered] = useState(false);

  const isClonedDeck = Boolean(deck.originalAuthorId && deck.originalAuthorName);

  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const privacyWebProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setPrivacyHovered(true),
    onMouseLeave: () => setPrivacyHovered(false),
  } : {};

  const authorWebProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setAuthorHovered(true),
    onMouseLeave: () => setAuthorHovered(false),
  } : {};

  const webStyle = Platform.OS === 'web' ? {
    cursor: 'pointer',
    transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
  } as any : {};

  const masteryPercentage = deck.cardCount > 0
    ? Math.round((deck.masteredCount / deck.cardCount) * 100)
    : 0;

  const getMasteryInfo = () => {
    if (masteryPercentage >= 80) return { color: accent.green, label: 'Mastered' };
    if (masteryPercentage >= 40) return { color: accent.orange, label: 'Learning' };
    return { color: accent.red, label: 'New' };
  };

  const { color: masteryColor, label: masteryLabel } = getMasteryInfo();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const handlePrivacyToggle = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const success = await updateDeck(deck.id, { isPublic: !deck.isPublic });
    if (!success) {
      Alert.alert('Error', 'Failed to update privacy setting. Please try again.');
    }
  };

  const handleAuthorPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onAuthorPress && deck.originalAuthorId) {
      onAuthorPress(deck.originalAuthorId);
    }
  };

  const formatLastStudied = (dateStr: string | null) => {
    if (!dateStr) return 'Never studied';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.card,
        { backgroundColor: surface, borderColor: isHovered ? accent.orange : border },
        webStyle,
        isHovered && styles.cardHovered,
      ]}
      {...webProps}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>
          {deck.title}
        </Text>
        <View style={styles.headerBadges}>
          {isClonedDeck ? (
            <View style={[styles.savedBadge, { backgroundColor: accent.blue + '20' }]}>
              <Ionicons name="bookmark" size={10} color={accent.blue} />
              <Text style={[styles.savedBadgeText, { color: accent.blue }]}>Saved</Text>
            </View>
          ) : (
            <View style={[styles.savedBadge, { backgroundColor: accent.orange + '20' }]}>
              <Ionicons name="person" size={10} color={accent.orange} />
              <Text style={[styles.savedBadgeText, { color: accent.orange }]}>My Deck</Text>
            </View>
          )}
          <View style={[styles.masteryBadge, { backgroundColor: masteryColor + '20' }]}>
            <Text style={[styles.masteryText, { color: masteryColor }]}>
              {masteryLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Original Author (for cloned decks) */}
      {isClonedDeck && (
        <View style={styles.authorRow}>
          <Text style={[styles.authorLabel, { color: textSecondary }]}>By </Text>
          <TouchableOpacity
            style={[
              Platform.OS === 'web' && { cursor: 'pointer' } as any,
            ]}
            onPress={handleAuthorPress}
            {...authorWebProps}
          >
            <Text style={[styles.authorName, { color: authorHovered ? accent.orange : accent.blue }]}>
              {deck.originalAuthorName}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Description */}
      {deck.description && (
        <Text style={[styles.description, { color: textSecondary }]} numberOfLines={2}>
          {deck.description}
        </Text>
      )}

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              { backgroundColor: accent.orange, width: `${masteryPercentage}%` }
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: textSecondary }]}>
          {masteryPercentage}% mastered
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={[styles.statDot, { backgroundColor: accent.green }]} />
          <Text style={[styles.statText, { color: textSecondary }]}>{deck.masteredCount}</Text>
        </View>
        <View style={styles.stat}>
          <View style={[styles.statDot, { backgroundColor: accent.orange }]} />
          <Text style={[styles.statText, { color: textSecondary }]}>{deck.learningCount}</Text>
        </View>
        <View style={styles.stat}>
          <View style={[styles.statDot, { backgroundColor: accent.red }]} />
          <Text style={[styles.statText, { color: textSecondary }]}>{deck.newCount}</Text>
        </View>
        <Text style={[styles.cardCount, { color: textSecondary }]}>{deck.cardCount} cards</Text>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: border }]}>
        <View style={styles.footerLeft}>
          <Text style={[styles.lastStudied, { color: textSecondary }]}>
            {formatLastStudied(deck.lastStudied)}
          </Text>
          {showPrivacyToggle && (
            <TouchableOpacity
              style={[
                styles.privacyButton,
                { backgroundColor: privacyHovered ? accent.orange + '20' : surfaceHover },
                Platform.OS === 'web' && { cursor: 'pointer', transition: 'background-color 150ms ease' } as any,
              ]}
              onPress={handlePrivacyToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              {...privacyWebProps}
            >
              <Ionicons
                name={deck.isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={12}
                color={privacyHovered ? accent.orange : (deck.isPublic ? accent.green : textSecondary)}
              />
              <Text style={[styles.privacyText, { color: privacyHovered ? accent.orange : (deck.isPublic ? accent.green : textSecondary) }]}>
                {deck.isPublic ? 'Public' : 'Private'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {deck.dueCount > 0 && (
          <View style={[styles.dueIndicator, { backgroundColor: surfaceHover }]}>
            <Ionicons name="time-outline" size={12} color={accent.red} />
            <Text style={[styles.dueText, { color: accent.red }]}>{deck.dueCount} due</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  cardHovered: {
    transform: [{ scale: 1.02 }],
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginRight: spacing[2],
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  savedBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
  },
  masteryBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  masteryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  authorLabel: {
    fontSize: typography.sizes.sm,
  },
  authorName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  description: {
    fontSize: typography.sizes.base,
    marginBottom: spacing[3],
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: spacing[3],
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing[1],
  },
  statText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  cardCount: {
    marginLeft: 'auto',
    fontSize: typography.sizes.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing[3],
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  lastStudied: {
    fontSize: typography.sizes.xs,
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  privacyText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
  },
  dueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },
  dueText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
