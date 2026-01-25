import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ProgressBar } from '@/components/ui';
import { Footer } from '@/components/layout';
import { useAuthStore, useDeckStore, useStudyStore, useSocialStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  onPress?: () => void;
  color?: string;
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, signOut } = useAuthStore();
  const { decks } = useDeckStore();
  const { stats } = useStudyStore();
  const { followers, following } = useSocialStore();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  // Responsive values
  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);
  const totalMastered = decks.reduce((sum, d) => sum + d.masteredCount, 0);

  const menuItems: MenuItem[] = [
    { icon: 'people-outline', label: 'Connections', route: 'Social' },
    { icon: 'stats-chart-outline', label: 'Statistics', route: 'Statistics' },
    { icon: 'trophy-outline', label: 'Achievements', route: 'Achievements' },
    { icon: 'settings-outline', label: 'Settings', route: 'Settings' },
    { icon: 'help-circle-outline', label: 'Help & Support', route: 'Help' },
    { icon: 'log-out-outline', label: 'Sign Out', onPress: signOut, color: accent.red },
  ];

  const handleMenuPress = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      navigation.navigate(item.route as never);
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
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => navigation.navigate('EditProfile' as never)}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: accent.orange }]}>
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          <View style={[styles.streakBadge, { backgroundColor: accent.orange, borderColor: background }]}>
            <Ionicons name="flame" size={14} color="#FFFFFF" />
            <Text style={styles.streakBadgeText}>{user?.streakCurrent || 0}</Text>
          </View>
          <View style={[styles.editBadge, { backgroundColor: surface, borderColor: background }]}>
            <Ionicons name="pencil" size={12} color={textSecondary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.userName, { color: textPrimary }]}>{user?.name || 'User'}</Text>
        <Text style={[styles.userEmail, { color: textSecondary }]}>{user?.email || 'demo@sage.app'}</Text>
        <TouchableOpacity
          style={[styles.editProfileButton, { backgroundColor: surfaceHover }]}
          onPress={() => navigation.navigate('EditProfile' as never)}
        >
          <Ionicons name="pencil-outline" size={14} color={textPrimary} />
          <Text style={[styles.editProfileButtonText, { color: textPrimary }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Social Stats */}
      <View style={[styles.socialStatsCard, { backgroundColor: surface }]}>
        <TouchableOpacity
          style={styles.socialStatItem}
          onPress={() => navigation.navigate('Social', { tab: 'followers' })}
        >
          <Text style={[styles.socialStatValue, { color: textPrimary }]}>{followers.length}</Text>
          <Text style={[styles.socialStatLabel, { color: textSecondary }]}>Followers</Text>
        </TouchableOpacity>
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <TouchableOpacity
          style={styles.socialStatItem}
          onPress={() => navigation.navigate('Social', { tab: 'following' })}
        >
          <Text style={[styles.socialStatValue, { color: textPrimary }]}>{following.length}</Text>
          <Text style={[styles.socialStatLabel, { color: textSecondary }]}>Following</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={[styles.statsCard, { backgroundColor: surface }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: accent.orange }]}>{decks.length}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Decks</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: accent.orange }]}>{totalCards}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Cards</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: accent.orange }]}>{totalMastered}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Mastered</Text>
          </View>
        </View>
      </View>

      {/* Study Streak */}
      <View style={[styles.streakCard, { backgroundColor: surface }]}>
        <View style={styles.streakHeader}>
          <View style={styles.streakInfo}>
            <Ionicons name="flame" size={24} color={accent.orange} />
            <View style={styles.streakTextContainer}>
              <Text style={[styles.streakTitle, { color: textPrimary }]}>Study Streak</Text>
              <Text style={[styles.streakDays, { color: textSecondary }]}>
                {user?.streakCurrent || 0} day{(user?.streakCurrent || 0) !== 1 ? 's' : ''} in a row
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.viewStatsButton}
            onPress={() => navigation.navigate('Statistics' as never)}
          >
            <Text style={[styles.viewStatsText, { color: accent.orange }]}>View Stats</Text>
            <Ionicons name="chevron-forward" size={16} color={accent.orange} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.longestStreak, { color: textSecondary }]}>
          Longest streak: {user?.streakLongest || 0} days
        </Text>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuSection, { backgroundColor: surface }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              index === menuItems.length - 1 && styles.menuItemLast,
              index < menuItems.length - 1 && { borderBottomColor: border },
            ]}
            onPress={() => handleMenuPress(item)}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: (item.color || accent.orange) + '15' },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={item.color || accent.orange}
              />
            </View>
            <Text style={[styles.menuLabel, { color: item.color || textPrimary }]}>
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* App Version */}
      <Text style={[styles.version, { color: textSecondary }]}>Sage v1.0.0</Text>

      <View style={{ height: spacing[6] }} />

      {/* Footer */}
      <Footer />

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
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing[3],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '600',
    color: '#FFFFFF',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 2,
  },
  streakBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 2,
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  userEmail: {
    fontSize: typography.sizes.sm,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginTop: spacing[3],
    gap: spacing[2],
  },
  editProfileButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  editBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
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
    marginBottom: spacing[4],
    ...shadows.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  statDivider: {
    width: 1,
  },
  streakCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[4],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakTextContainer: {
    marginLeft: spacing[3],
  },
  streakTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  streakDays: {
    fontSize: typography.sizes.sm,
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewStatsText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  longestStreak: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
  },
  menuSection: {
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
  },
  version: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
