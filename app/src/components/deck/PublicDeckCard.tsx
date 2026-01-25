import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemedColors } from '@/hooks/useThemedColors';
import { borderRadius, spacing, typography, shadows } from '@/theme';
import type { PublicDeckWithAuthor } from '@/services';

interface PublicDeckCardProps {
  deck: PublicDeckWithAuthor;
  onPress: () => void;
  onAuthorPress?: (authorId: string) => void;
}

export function PublicDeckCard({ deck, onPress, onAuthorPress }: PublicDeckCardProps) {
  const { surface, border, textPrimary, textSecondary, accent } = useThemedColors();
  const [isHovered, setIsHovered] = useState(false);
  const [authorHovered, setAuthorHovered] = useState(false);

  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  const authorWebProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setAuthorHovered(true),
    onMouseLeave: () => setAuthorHovered(false),
  } : {};

  const webStyle = Platform.OS === 'web' ? {
    cursor: 'pointer',
    transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
  } as any : {};

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const handleAuthorPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onAuthorPress) {
      onAuthorPress(deck.userId);
    }
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
      {/* Title & Description */}
      <Text style={[styles.title, { color: textPrimary }]} numberOfLines={2}>
        {deck.title}
      </Text>
      <Text style={[styles.description, { color: textSecondary }]} numberOfLines={2}>
        {deck.description}
      </Text>

      {/* Author - Only name is clickable */}
      <View style={styles.authorRow}>
        <View style={[styles.authorAvatar, { backgroundColor: accent.orange }]}>
          <Text style={styles.authorInitial}>{deck.authorName?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <Text style={[styles.authorLabel, { color: textSecondary }]}>By </Text>
        <TouchableOpacity
          style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
          onPress={handleAuthorPress}
          {...authorWebProps}
        >
          <View style={styles.authorNameContainer}>
            <Text style={[styles.authorName, { color: authorHovered ? accent.orange : accent.blue }]}>
              {deck.authorName}
            </Text>
            <Ionicons name="chevron-forward" size={12} color={authorHovered ? accent.orange : accent.blue} style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderTopColor: border }]}>
        <View style={styles.statItem}>
          <Ionicons name="documents-outline" size={14} color={textSecondary} />
          <Text style={[styles.statText, { color: textSecondary }]}>{deck.cardCount} cards</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="download-outline" size={14} color={textSecondary} />
          <Text style={[styles.statText, { color: textSecondary }]}>{formatNumber(deck.downloadCount)}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star" size={14} color={accent.orange} />
          <Text style={[styles.statText, { color: textSecondary }]}>{deck.averageRating.toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing[4],
  },
  cardHovered: {
    transform: [{ scale: 1.02 }],
    ...shadows.md,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  categoryBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  description: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  authorInitial: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  authorLabel: {
    fontSize: typography.sizes.sm,
  },
  authorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    fontSize: typography.sizes.sm,
  },
});
