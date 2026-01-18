import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';

// Reusable hover hook for web
function useHoverState() {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};
  return { isHovered, webProps };
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSocialStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { SocialUserProfile } from '@/services';
import type { RootStackScreenProps } from '@/navigation/types';

type Tab = 'followers' | 'following' | 'discover';

// User card component with hover
function UserCardItem({
  item,
  onUserPress,
  onFollow,
  surface,
  surfaceHover,
  border,
  textPrimary,
  textSecondary,
  accent,
}: {
  item: SocialUserProfile;
  onUserPress: () => void;
  onFollow: () => void;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: { orange: string };
}) {
  const cardHover = useHoverState();
  const followBtnHover = useHoverState();

  return (
    <TouchableOpacity
      style={[
        styles.userCard,
        { backgroundColor: surface, borderColor: cardHover.isHovered ? accent.orange : 'transparent' },
        Platform.OS === 'web' && { cursor: 'pointer', transition: 'border-color 150ms ease' } as any,
      ]}
      onPress={onUserPress}
      activeOpacity={0.7}
      {...cardHover.webProps}
    >
      <View style={styles.userInfo}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: accent.orange }]}>
            <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: textPrimary }]}>{item.name}</Text>
          {item.bio && (
            <Text style={[styles.userBio, { color: textSecondary }]} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
          <View style={styles.userStats}>
            <View style={styles.userStat}>
              <Ionicons name="flame" size={12} color={accent.orange} />
              <Text style={[styles.userStatText, { color: textSecondary }]}>{item.streakCurrent || 0}</Text>
            </View>
            <View style={styles.userStat}>
              <Ionicons name="documents-outline" size={12} color={textSecondary} />
              <Text style={[styles.userStatText, { color: textSecondary }]}>{item.totalDecksCreated || 0}</Text>
            </View>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          item.isFollowing
            ? {
                backgroundColor: followBtnHover.isHovered ? accent.orange + '15' : surfaceHover,
                borderColor: followBtnHover.isHovered ? accent.orange : border,
                borderWidth: 1,
              }
            : {
                backgroundColor: followBtnHover.isHovered ? accent.orange + 'dd' : accent.orange,
              },
          Platform.OS === 'web' && { cursor: 'pointer', transition: 'background-color 150ms ease, border-color 150ms ease' } as any,
        ]}
        onPress={(e) => {
          e.stopPropagation?.();
          onFollow();
        }}
        {...followBtnHover.webProps}
      >
        <Text
          style={[
            styles.followButtonText,
            { color: item.isFollowing ? (followBtnHover.isHovered ? accent.orange : textPrimary) : '#FFFFFF' },
          ]}
        >
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export function SocialScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'Social'>['route']>();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const {
    followers,
    following,
    discoverableUsers,
    isLoading,
    followUser,
    unfollowUser,
    getUserProfile,
    loadSocialData,
    loadDiscoverUsers,
  } = useSocialStore();
  const viewUserId = route.params?.viewUserId;
  const viewingOtherUser = !!viewUserId;
  const viewedUser = viewUserId ? getUserProfile(viewUserId) : null;
  const [activeTab, setActiveTab] = useState<Tab>(route.params?.tab || 'followers');
  const [searchQuery, setSearchQuery] = useState('');

  // Load social data on mount
  useEffect(() => {
    loadSocialData();
  }, []);

  // Load discover users when tab changes or search query changes
  useEffect(() => {
    if (activeTab === 'discover') {
      loadDiscoverUsers(searchQuery || undefined);
    }
  }, [activeTab, searchQuery]);

  // Hover states
  const backBtn = useHoverState();
  const followersTab = useHoverState();
  const followingTab = useHoverState();
  const discoverTab = useHoverState();
  const clearSearchBtn = useHoverState();

  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer' as const,
    transition: 'background-color 150ms ease, border-color 150ms ease',
  } : {};

  const containerMaxWidth = isDesktop ? 600 : isTablet ? 500 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  // Update followers to show correct following state
  const followersWithState = useMemo(() => {
    const followingIds = new Set(following.map(f => f.id));
    return followers.map(user => ({
      ...user,
      isFollowing: followingIds.has(user.id),
    }));
  }, [followers, following]);

  const data = activeTab === 'followers'
    ? followersWithState
    : activeTab === 'following'
      ? following
      : discoverableUsers;

  const handleFollow = async (user: SocialUserProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user.isFollowing) {
      await unfollowUser(user.id);
    } else {
      await followUser(user.id);
    }
  };

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('UserProfile', { userId });
  };

  const renderUser = ({ item }: { item: SocialUserProfile }) => (
    <UserCardItem
      item={item}
      onUserPress={() => handleUserPress(item.id)}
      onFollow={() => handleFollow(item)}
      surface={surface}
      surfaceHover={surfaceHover}
      border={border}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
      accent={accent}
    />
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
          style={[
            styles.backButton,
            { backgroundColor: backBtn.isHovered ? surfaceHover : surface },
            webButtonStyle,
          ]}
          onPress={() => navigation.goBack()}
          {...backBtn.webProps}
        >
          <Ionicons name="arrow-back" size={24} color={backBtn.isHovered ? accent.orange : textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {viewingOtherUser && viewedUser ? `${viewedUser.name}'s Connections` : 'Connections'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={[
        styles.tabsContainer,
        {
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
          paddingHorizontal: contentPadding,
        }
      ]}>
        <View style={[styles.tabs, { backgroundColor: surface }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'followers'
                ? { backgroundColor: accent.orange }
                : followersTab.isHovered && { backgroundColor: surfaceHover },
              webButtonStyle,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('followers');
            }}
            {...followersTab.webProps}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'followers' ? '#FFFFFF' : (followersTab.isHovered ? accent.orange : textSecondary) },
              ]}
            >
              Followers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'following'
                ? { backgroundColor: accent.orange }
                : followingTab.isHovered && { backgroundColor: surfaceHover },
              webButtonStyle,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('following');
            }}
            {...followingTab.webProps}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'following' ? '#FFFFFF' : (followingTab.isHovered ? accent.orange : textSecondary) },
              ]}
            >
              Following
            </Text>
          </TouchableOpacity>
          {/* Hide Discover tab when viewing another user */}
          {!viewingOtherUser && (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'discover'
                  ? { backgroundColor: accent.orange }
                  : discoverTab.isHovered && { backgroundColor: surfaceHover },
                webButtonStyle,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab('discover');
              }}
              {...discoverTab.webProps}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'discover' ? '#FFFFFF' : (discoverTab.isHovered ? accent.orange : textSecondary) },
                ]}
              >
                Discover
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search (only show on discover tab) */}
      {activeTab === 'discover' && (
        <View style={[
          styles.searchContainer,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          }
        ]}>
          <View style={[styles.searchBox, { backgroundColor: surface }]}>
            <Ionicons name="search" size={20} color={textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary }]}
              placeholder="Search users..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
                {...clearSearchBtn.webProps}
              >
                <Ionicons name="close-circle" size={20} color={clearSearchBtn.isHovered ? accent.orange : textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* User List */}
      <FlatList
        data={data}
        renderItem={renderUser}
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
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={accent.orange} />
              <Text style={[styles.emptySubtitle, { color: textSecondary, marginTop: spacing[4] }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  activeTab === 'followers'
                    ? 'people-outline'
                    : activeTab === 'following'
                      ? 'person-add-outline'
                      : 'search-outline'
                }
                size={48}
                color={textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                {activeTab === 'followers'
                  ? 'No followers yet'
                  : activeTab === 'following'
                    ? 'Not following anyone'
                    : 'No users found'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                {activeTab === 'followers'
                  ? 'Share your decks to get more followers'
                  : activeTab === 'following'
                    ? 'Discover and follow other learners'
                    : 'Try a different search term'}
              </Text>
            </View>
          )
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
  tabsContainer: {
    marginBottom: spacing[4],
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    padding: spacing[1],
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  searchContainer: {
    marginBottom: spacing[4],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
    gap: spacing[3],
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    padding: 0,
    margin: 0,
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing[3],
    borderWidth: 1,
    ...shadows.sm,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
    marginLeft: spacing[3],
  },
  userName: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  userBio: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  userStats: {
    flexDirection: 'row',
    marginTop: spacing[1],
  },
  userStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  userStatText: {
    fontSize: typography.sizes.xs,
    marginLeft: spacing[1],
  },
  followButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    marginLeft: spacing[3],
  },
  followButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing[2],
    textAlign: 'center',
  },
});
