import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  discoverUsers,
  getFollowers as fetchFollowers,
  getFollowing as fetchFollowing,
  followUser as followUserAPI,
  unfollowUser as unfollowUserAPI,
  getUserProfile as fetchUserProfile,
  getActivityFeed as fetchActivityFeed,
  type SocialUserProfile,
  type SocialActivity,
} from '@/services';

interface SocialState {
  followers: SocialUserProfile[];
  following: SocialUserProfile[];
  discoverableUsers: SocialUserProfile[];
  activityFeed: SocialActivity[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadSocialData: () => Promise<void>;
  loadDiscoverUsers: (search?: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  getFollowers: () => SocialUserProfile[];
  getFollowing: () => SocialUserProfile[];
  getUserProfile: (userId: string) => SocialUserProfile | undefined;
  getActivityFeed: () => SocialActivity[];
  refreshActivityFeed: () => Promise<void>;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      followers: [],
      following: [],
      discoverableUsers: [],
      activityFeed: [],
      isLoading: false,
      error: null,

      loadSocialData: async () => {
        set({ isLoading: true, error: null });
        try {
          // Load followers, following, and activity feed in parallel
          const [followersRes, followingRes, activityRes] = await Promise.all([
            fetchFollowers(),
            fetchFollowing(),
            fetchActivityFeed(),
          ]);

          set({
            followers: followersRes.success ? followersRes.data : [],
            following: followingRes.success ? followingRes.data : [],
            activityFeed: activityRes.success ? activityRes.data : [],
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load social data:', error);
          set({ isLoading: false, error: 'Failed to load social data' });
        }
      },

      loadDiscoverUsers: async (search?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await discoverUsers({ search, limit: 50 });
          if (res.success) {
            set({ discoverableUsers: res.data, isLoading: false });
          } else {
            set({ isLoading: false, error: res.error });
          }
        } catch (error) {
          console.error('Failed to load discoverable users:', error);
          set({ isLoading: false, error: 'Failed to load users' });
        }
      },

      followUser: async (userId: string) => {
        try {
          const res = await followUserAPI(userId);
          if (res.success) {
            // Find the user in discoverable users or create a placeholder
            const { discoverableUsers, following } = get();
            const user = discoverableUsers.find(u => u.id === userId);

            if (user) {
              // Update discoverable users to reflect new following state
              set({
                discoverableUsers: discoverableUsers.map(u =>
                  u.id === userId ? { ...u, isFollowing: true } : u
                ),
                following: [...following, { ...user, isFollowing: true }],
              });
            } else {
              // User not in discoverable list, fetch their profile
              const profileRes = await fetchUserProfile(userId);
              if (profileRes.success) {
                set({
                  following: [...following, { ...profileRes.data, isFollowing: true }],
                });
              }
            }
          } else {
            console.error('Failed to follow user:', res.error);
          }
        } catch (error) {
          console.error('Failed to follow user:', error);
        }
      },

      unfollowUser: async (userId: string) => {
        try {
          const res = await unfollowUserAPI(userId);
          if (res.success) {
            const { discoverableUsers, following } = get();
            set({
              discoverableUsers: discoverableUsers.map(u =>
                u.id === userId ? { ...u, isFollowing: false } : u
              ),
              following: following.filter(u => u.id !== userId),
            });
          } else {
            console.error('Failed to unfollow user:', res.error);
          }
        } catch (error) {
          console.error('Failed to unfollow user:', error);
        }
      },

      getFollowers: () => get().followers,

      getFollowing: () => get().following,

      getUserProfile: (userId: string) => {
        const { followers, following, discoverableUsers } = get();
        // Check all cached lists for the user
        const allUsers = [...followers, ...following, ...discoverableUsers];
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          // Update isFollowing status based on current following list
          const isFollowing = get().following.some(f => f.id === userId);
          return { ...user, isFollowing };
        }
        return undefined;
      },

      getActivityFeed: () => {
        // Return activity from users we follow who have public activity
        const { activityFeed, following } = get();
        const followingIds = new Set(following.filter(u => u.activityPublic).map(u => u.id));
        return activityFeed.filter(a => followingIds.has(a.userId));
      },

      refreshActivityFeed: async () => {
        try {
          const res = await fetchActivityFeed();
          if (res.success) {
            set({ activityFeed: res.data });
          }
        } catch (error) {
          console.error('Failed to refresh activity feed:', error);
        }
      },
    }),
    {
      name: 'sage-social',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        followers: state.followers,
        following: state.following,
      }),
    }
  )
);
