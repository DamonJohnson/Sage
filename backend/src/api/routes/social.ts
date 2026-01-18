import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  streak_current: number;
  streak_longest: number;
  created_at: string;
}

interface UserProfileRow {
  user_id: string;
  bio: string | null;
  activity_public: number;
  total_cards_studied: number;
}

interface FollowRow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * Get users to discover (users the current user doesn't follow)
 * GET /api/social/discover
 */
router.get('/discover', requireAuth, (req: Request, res: Response) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    const userId = req.authUser!.id;

    let query = `
      SELECT
        u.id, u.name, u.avatar_url, u.streak_current, u.streak_longest, u.created_at,
        COALESCE(p.bio, '') as bio,
        COALESCE(p.activity_public, 1) as activity_public,
        (SELECT COUNT(*) FROM decks WHERE user_id = u.id) as total_decks_created,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_following
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
      WHERE u.id != ?
    `;
    const params: unknown[] = [userId, userId];

    if (search) {
      query += ` AND (u.name LIKE ? OR p.bio LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY follower_count DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const users = db.prepare(query).all(...params) as any[];

    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        streakCurrent: u.streak_current,
        streakLongest: u.streak_longest,
        totalDecksCreated: u.total_decks_created,
        followerCount: u.follower_count,
        followingCount: u.following_count,
        isFollowing: u.is_following === 1,
        activityPublic: u.activity_public === 1,
        joinedAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Discover users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
    });
  }
});

/**
 * Get user's followers
 * GET /api/social/followers
 */
router.get('/followers', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || req.authUser!.id;
    const currentUserId = req.authUser!.id;

    const followers = db.prepare(`
      SELECT
        u.id, u.name, u.avatar_url, u.streak_current, u.streak_longest, u.created_at,
        COALESCE(p.bio, '') as bio,
        COALESCE(p.activity_public, 1) as activity_public,
        (SELECT COUNT(*) FROM decks WHERE user_id = u.id) as total_decks_created,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_following
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN follows f2 ON f2.follower_id = ? AND f2.following_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
    `).all(currentUserId, userId) as any[];

    res.json({
      success: true,
      data: followers.map(u => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        streakCurrent: u.streak_current,
        streakLongest: u.streak_longest,
        totalDecksCreated: u.total_decks_created,
        followerCount: u.follower_count,
        followingCount: u.following_count,
        isFollowing: u.is_following === 1,
        activityPublic: u.activity_public === 1,
        joinedAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get followers',
    });
  }
});

/**
 * Get users the current user is following
 * GET /api/social/following
 */
router.get('/following', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || req.authUser!.id;
    const currentUserId = req.authUser!.id;

    const following = db.prepare(`
      SELECT
        u.id, u.name, u.avatar_url, u.streak_current, u.streak_longest, u.created_at,
        COALESCE(p.bio, '') as bio,
        COALESCE(p.activity_public, 1) as activity_public,
        (SELECT COUNT(*) FROM decks WHERE user_id = u.id) as total_decks_created,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        1 as is_following
      FROM follows f
      JOIN users u ON f.following_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
    `).all(userId) as any[];

    res.json({
      success: true,
      data: following.map(u => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        streakCurrent: u.streak_current,
        streakLongest: u.streak_longest,
        totalDecksCreated: u.total_decks_created,
        followerCount: u.follower_count,
        followingCount: u.following_count,
        isFollowing: true,
        activityPublic: u.activity_public === 1,
        joinedAt: u.created_at,
      })),
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get following',
    });
  }
});

/**
 * Follow a user
 * POST /api/social/follow/:userId
 */
router.post('/follow/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = req.authUser!.id;

    if (userId === followerId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself',
      });
    }

    // Check if user exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if already following
    const existingFollow = db.prepare(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
    ).get(followerId, userId);

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        error: 'Already following this user',
      });
    }

    // Create follow
    const followId = uuidv4();
    db.prepare(`
      INSERT INTO follows (id, follower_id, following_id)
      VALUES (?, ?, ?)
    `).run(followId, followerId, userId);

    res.json({
      success: true,
      message: 'Successfully followed user',
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to follow user',
    });
  }
});

/**
 * Unfollow a user
 * DELETE /api/social/follow/:userId
 */
router.delete('/follow/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const followerId = req.authUser!.id;

    const result = db.prepare(`
      DELETE FROM follows WHERE follower_id = ? AND following_id = ?
    `).run(followerId, userId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not following this user',
      });
    }

    res.json({
      success: true,
      message: 'Successfully unfollowed user',
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfollow user',
    });
  }
});

/**
 * Get a user's profile
 * GET /api/social/users/:userId
 */
router.get('/users/:userId', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.authUser!.id;

    const user = db.prepare(`
      SELECT
        u.id, u.name, u.avatar_url, u.streak_current, u.streak_longest, u.created_at,
        COALESCE(p.bio, '') as bio,
        COALESCE(p.activity_public, 1) as activity_public,
        COALESCE(p.total_cards_studied, 0) as total_cards_studied,
        (SELECT COUNT(*) FROM decks WHERE user_id = u.id) as total_decks_created,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as follower_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_following,
        CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as is_follower
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
      LEFT JOIN follows f2 ON f2.follower_id = u.id AND f2.following_id = ?
      WHERE u.id = ?
    `).get(currentUserId, currentUserId, userId) as any;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        streakCurrent: user.streak_current,
        streakLongest: user.streak_longest,
        totalDecksCreated: user.total_decks_created,
        totalCardsStudied: user.total_cards_studied,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        isFollowing: user.is_following === 1,
        isFollower: user.is_follower === 1,
        activityPublic: user.activity_public === 1,
        joinedAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
});

/**
 * Get activity feed (from users you follow)
 * GET /api/social/activity
 */
router.get('/activity', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.authUser!.id;
    const { limit = 20, offset = 0 } = req.query;

    const activity = db.prepare(`
      SELECT
        a.id, a.user_id, a.type, a.deck_id, a.deck_title,
        a.cards_studied, a.study_time_minutes, a.streak_days, a.created_at,
        u.name as user_name, u.avatar_url as user_avatar
      FROM user_activity a
      JOIN follows f ON f.following_id = a.user_id AND f.follower_id = ?
      JOIN users u ON a.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE COALESCE(p.activity_public, 1) = 1
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, Number(limit), Number(offset)) as any[];

    res.json({
      success: true,
      data: activity.map(a => ({
        id: a.id,
        userId: a.user_id,
        userName: a.user_name,
        userAvatar: a.user_avatar,
        type: a.type,
        deckId: a.deck_id,
        deckTitle: a.deck_title,
        cardsStudied: a.cards_studied,
        studyTimeMinutes: a.study_time_minutes,
        streakDays: a.streak_days,
        createdAt: a.created_at,
      })),
    });
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activity feed',
    });
  }
});

/**
 * Update user profile (bio, activity privacy)
 * PATCH /api/social/profile
 */
router.patch('/profile', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.authUser!.id;
    const updateSchema = z.object({
      bio: z.string().max(200).optional(),
      activityPublic: z.boolean().optional(),
    });

    const validated = updateSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
    }

    const { bio, activityPublic } = validated.data;

    // Upsert profile
    db.prepare(`
      INSERT INTO user_profiles (user_id, bio, activity_public)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        bio = COALESCE(excluded.bio, bio),
        activity_public = COALESCE(excluded.activity_public, activity_public),
        updated_at = datetime('now')
    `).run(
      userId,
      bio ?? '',
      activityPublic !== undefined ? (activityPublic ? 1 : 0) : 1
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

export default router;
