import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSocialStore, useDeckStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import { getUserProfile as fetchUserProfile, type SocialUserProfile, type SocialActivity } from '@/services';
import type { RootStackScreenProps } from '@/navigation/types';

export function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'UserProfile'>['route']>();
  const { userId } = route.params;
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const { followUser, unfollowUser, following } = useSocialStore();
  const { getPublicDecksByUser } = useDeckStore();

  const [user, setUser] = useState<SocialUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile on mount
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      const res = await fetchUserProfile(userId);
      if (res.success) {
        setUser(res.data);
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [userId]);

  // Update isFollowing when following list changes
  const isFollowingUser = following.some(f => f.id === userId);
  const publicDecks = getPublicDecksByUser(userId);

  const containerMaxWidth = isDesktop ? 600 : isTablet ? 500 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={accent.orange} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: background }]}>
        <Ionicons name="person-outline" size={64} color={textSecondary} />
        <Text style={[styles.emptyTitle, { color: textPrimary }]}>User not found</Text>
        <TouchableOpacity
          style={[styles.backButtonLarge, { backgroundColor: accent.orange }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleFollow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isFollowingUser) {
      await unfollowUser(user.id);
      setUser(prev => prev ? { ...prev, isFollowing: false } : null);
    } else {
      await followUser(user.id);
      setUser(prev => prev ? { ...prev, isFollowing: true } : null);
    }
  };

  // Get activity for this specific user
  const allActivity = useSocialStore.getState().activityFeed;
  const userActivity = allActivity.filter(a => a.userId === userId && user.activityPublic);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const getActivityIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'study_session': return 'book-outline';
      case 'deck_created': return 'add-circle-outline';
      case 'deck_shared': return 'share-outline';
      case 'streak_milestone': return 'flame';
      default: return 'ellipse-outline';
    }
  };

  const getActivityText = (activity: typeof userActivity[0]) => {
    switch (activity.type) {
      case 'study_session':
        return `Studied ${activity.cardsStudied} cards in ${activity.deckTitle}`;
      case 'deck_created':
        return `Created a new deck: ${activity.deckTitle}`;
      case 'deck_shared':
        return `Shared ${activity.deckTitle} publicly`;
      case 'streak_milestone':
        return `Reached a ${activity.streakDays} day streak!`;
      default:
        return 'Activity';
    }
  };

  const handleDeckPress = (deckId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('PublicDeckPreview', { deckId, source: 'user' });
  };

  const getRating = (deck: typeof publicDecks[0]) => {
    if (deck.ratingCount === 0) return 0;
    return Math.round((deck.ratingSum / deck.ratingCount / 5) * 100) / 20;
  };

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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: surface }]}>
          <View style={styles.profileHeader}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: accent.orange }]}>
                <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: textPrimary }]}>{user.name}</Text>
              {user.bio && (
                <Text style={[styles.profileBio, { color: textSecondary }]}>{user.bio}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.followButtonLarge,
              isFollowingUser
                ? { backgroundColor: surfaceHover, borderColor: border, borderWidth: 1 }
                : { backgroundColor: accent.orange },
            ]}
            onPress={handleFollow}
          >
            <Ionicons
              name={isFollowingUser ? 'checkmark' : 'person-add'}
              size={18}
              color={isFollowingUser ? textPrimary : '#FFFFFF'}
            />
            <Text
              style={[
                styles.followButtonLargeText,
                { color: isFollowingUser ? textPrimary : '#FFFFFF' },
              ]}
            >
              {isFollowingUser ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social Stats (Followers/Following) */}
        <View style={[styles.socialStatsCard, { backgroundColor: surface }]}>
          <TouchableOpacity
            style={styles.socialStatItem}
            onPress={() => navigation.navigate('Social', { tab: 'followers', viewUserId: userId })}
          >
            <Text style={[styles.socialStatValue, { color: textPrimary }]}>
              {user.followerCount !== undefined
                ? user.followerCount > 1000
                  ? `${(user.followerCount / 1000).toFixed(1)}k`
                  : user.followerCount
                : '0'}
            </Text>
            <Text style={[styles.socialStatLabel, { color: textSecondary }]}>Followers</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <TouchableOpacity
            style={styles.socialStatItem}
            onPress={() => navigation.navigate('Social', { tab: 'following', viewUserId: userId })}
          >
            <Text style={[styles.socialStatValue, { color: textPrimary }]}>
              {user.followingCount !== undefined
                ? user.followingCount > 1000
                  ? `${(user.followingCount / 1000).toFixed(1)}k`
                  : user.followingCount
                : '0'}
            </Text>
            <Text style={[styles.socialStatLabel, { color: textSecondary }]}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: surface }]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={24} color={accent.orange} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{user.streakCurrent}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: border }]} />
            <View style={styles.statItem}>
              <Ionicons name="documents-outline" size={24} color={accent.orange} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{user.totalDecksCreated}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Decks</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: border }]} />
            <View style={styles.statItem}>
              <Ionicons name="card-outline" size={24} color={accent.orange} />
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {user.totalCardsStudied > 1000
                  ? `${(user.totalCardsStudied / 1000).toFixed(1)}k`
                  : user.totalCardsStudied}
              </Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>Cards</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Recent Activity</Text>

          {!user.activityPublic ? (
            <View style={[styles.privateCard, { backgroundColor: surface }]}>
              <Ionicons name="lock-closed-outline" size={32} color={textSecondary} />
              <Text style={[styles.privateText, { color: textSecondary }]}>
                This user's activity is private
              </Text>
            </View>
          ) : userActivity.length === 0 ? (
            <View style={[styles.privateCard, { backgroundColor: surface }]}>
              <Ionicons name="time-outline" size={32} color={textSecondary} />
              <Text style={[styles.privateText, { color: textSecondary }]}>
                No recent activity
              </Text>
            </View>
          ) : (
            <View style={[styles.activityList, { backgroundColor: surface }]}>
              {userActivity.slice(0, 5).map((activity, index) => (
                <View
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index < userActivity.length - 1 && { borderBottomColor: border, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: accent.orange + '15' }]}>
                    <Ionicons
                      name={getActivityIcon(activity.type)}
                      size={18}
                      color={accent.orange}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityText, { color: textPrimary }]}>
                      {getActivityText(activity)}
                    </Text>
                    <Text style={[styles.activityTime, { color: textSecondary }]}>
                      {formatTimeAgo(activity.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Public Decks */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Public Decks</Text>

          {publicDecks.length === 0 ? (
            <View style={[styles.privateCard, { backgroundColor: surface }]}>
              <Ionicons name="documents-outline" size={32} color={textSecondary} />
              <Text style={[styles.privateText, { color: textSecondary }]}>
                No public decks yet
              </Text>
            </View>
          ) : (
            <View style={styles.decksList}>
              {publicDecks.map((deck) => (
                <TouchableOpacity
                  key={deck.id}
                  style={[styles.deckCard, { backgroundColor: surface }]}
                  onPress={() => handleDeckPress(deck.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.deckInfo}>
                    <Text style={[styles.deckTitle, { color: textPrimary }]} numberOfLines={1}>
                      {deck.title}
                    </Text>
                    {deck.description && (
                      <Text style={[styles.deckDescription, { color: textSecondary }]} numberOfLines={2}>
                        {deck.description}
                      </Text>
                    )}
                    <View style={styles.deckStats}>
                      <View style={styles.deckStat}>
                        <Ionicons name="card-outline" size={12} color={textSecondary} />
                        <Text style={[styles.deckStatText, { color: textSecondary }]}>
                          {deck.cardCount} cards
                        </Text>
                      </View>
                      <View style={styles.deckStat}>
                        <Ionicons name="download-outline" size={12} color={textSecondary} />
                        <Text style={[styles.deckStatText, { color: textSecondary }]}>
                          {deck.downloadCount.toLocaleString()}
                        </Text>
                      </View>
                      {deck.ratingCount > 0 && (
                        <View style={styles.deckStat}>
                          <Ionicons name="star" size={12} color={accent.orange} />
                          <Text style={[styles.deckStatText, { color: textSecondary }]}>
                            {getRating(deck).toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: spacing[20] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
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
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
  },
  profileCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '600',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing[4],
  },
  profileName: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
  },
  profileBio: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  followButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
  },
  followButtonLargeText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    marginLeft: spacing[2],
  },
  socialStatsCard: {
    flexDirection: 'row',
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  socialStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  socialStatValue: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
  },
  socialStatLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  statsCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    marginTop: spacing[2],
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
  },
  statDivider: {
    width: 1,
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[3],
  },
  privateCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[8],
    alignItems: 'center',
    ...shadows.sm,
  },
  privateText: {
    fontSize: typography.sizes.base,
    marginTop: spacing[3],
  },
  activityList: {
    borderRadius: borderRadius['2xl'],
    ...shadows.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  activityText: {
    fontSize: typography.sizes.sm,
  },
  activityTime: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginTop: spacing[4],
  },
  backButtonLarge: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.xl,
    marginTop: spacing[6],
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  decksList: {
    gap: spacing[3],
  },
  deckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
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
    marginTop: spacing[1],
    lineHeight: 18,
  },
  deckStats: {
    flexDirection: 'row',
    marginTop: spacing[2],
    gap: spacing[4],
  },
  deckStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deckStatText: {
    fontSize: typography.sizes.xs,
    marginLeft: spacing[1],
  },
});
