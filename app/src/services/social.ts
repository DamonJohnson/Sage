/**
 * Social Service
 *
 * Handles social features like following users, activity feeds, and user profiles.
 */

import { apiRequest, type APIResponse } from './api';
import type { UserProfile, UserActivity } from '@sage/shared';

export interface SocialUserProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  streakCurrent: number;
  streakLongest: number;
  totalDecksCreated: number;
  totalCardsStudied?: number;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isFollower?: boolean;
  activityPublic: boolean;
  joinedAt: string;
}

export interface SocialActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  type: 'study_session' | 'deck_created' | 'deck_shared' | 'streak_milestone';
  deckId?: string;
  deckTitle?: string;
  cardsStudied?: number;
  studyTimeMinutes?: number;
  streakDays?: number;
  createdAt: string;
}

export interface DiscoverUsersParams {
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Discover users to follow
 */
export async function discoverUsers(
  params: DiscoverUsersParams = {}
): Promise<APIResponse<SocialUserProfile[]>> {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = `/social/discover${queryString ? `?${queryString}` : ''}`;

  return apiRequest<SocialUserProfile[]>(url);
}

/**
 * Get user's followers
 */
export async function getFollowers(
  userId?: string
): Promise<APIResponse<SocialUserProfile[]>> {
  const url = userId ? `/social/followers?userId=${userId}` : '/social/followers';
  return apiRequest<SocialUserProfile[]>(url);
}

/**
 * Get users the current user is following
 */
export async function getFollowing(
  userId?: string
): Promise<APIResponse<SocialUserProfile[]>> {
  const url = userId ? `/social/following?userId=${userId}` : '/social/following';
  return apiRequest<SocialUserProfile[]>(url);
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<APIResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/social/follow/${userId}`, {
    method: 'POST',
  });
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<APIResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/social/follow/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Get a user's profile
 */
export async function getUserProfile(userId: string): Promise<APIResponse<SocialUserProfile>> {
  return apiRequest<SocialUserProfile>(`/social/users/${userId}`);
}

/**
 * Get activity feed from users you follow
 */
export async function getActivityFeed(
  params: { limit?: number; offset?: number } = {}
): Promise<APIResponse<SocialActivity[]>> {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = `/social/activity${queryString ? `?${queryString}` : ''}`;

  return apiRequest<SocialActivity[]>(url);
}

/**
 * Update user's social profile
 */
export async function updateSocialProfile(
  data: { bio?: string; activityPublic?: boolean }
): Promise<APIResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/social/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
