import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index.js';
import { config } from '../../config.js';
import { generateToken, requireAuth } from '../../middleware/auth.js';

const router = Router();

// Helper to convert SQLite datetime to ISO 8601 format
const toISODate = (sqliteDate: string | null): string => {
  if (!sqliteDate) return new Date().toISOString();
  // SQLite format: '2026-01-01 00:00:00' -> ISO: '2026-01-01T00:00:00.000Z'
  return sqliteDate.replace(' ', 'T') + '.000Z';
};

// Validation schemas
const googleAuthSchema = z.object({
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  userInfo: z.object({
    email: z.string().email(),
    name: z.string(),
    picture: z.string().optional(),
    googleId: z.string(),
  }).optional(),
}).refine(data => data.idToken || data.accessToken || data.userInfo, {
  message: 'Either idToken, accessToken, or userInfo is required',
});

const appleAuthSchema = z.object({
  identityToken: z.string().min(1, 'Identity token is required'),
  authorizationCode: z.string().min(1, 'Authorization code is required'),
  user: z.object({
    email: z.string().email().optional(),
    fullName: z.object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    }).optional(),
  }).optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  streak_current: number;
  streak_longest: number;
  last_study_date: string | null;
  settings: string;
  created_at: string;
}

/**
 * Google OAuth - Verify ID token and create/login user
 * POST /api/auth/google
 *
 * In production, this would verify the token with Google's tokeninfo endpoint
 * For development, we simulate the flow
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const validated = googleAuthSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
    }

    const { idToken, accessToken, userInfo } = validated.data;

    // Handle user info passed directly from frontend (already verified by Google on client)
    let googleUser: { email: string; name: string; googleId: string; picture?: string };

    if (userInfo) {
      // User info was already fetched by the frontend using the access token
      googleUser = {
        email: userInfo.email,
        name: userInfo.name,
        googleId: userInfo.googleId,
        picture: userInfo.picture,
      };
    } else if (idToken && idToken.startsWith('mock-google-token:')) {
      // Development mock token
      const parts = idToken.split(':');
      googleUser = {
        email: parts[1] || 'test@example.com',
        name: parts[2] || 'Test User',
        googleId: parts[3] || `google-${Date.now()}`,
        picture: undefined,
      };
    } else if (idToken || accessToken) {
      // Verify token with Google
      const tokenToVerify = idToken || accessToken;
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`);

        if (!response.ok) {
          // Try verifying as an access token
          const accessTokenResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
            headers: { Authorization: `Bearer ${idToken}` }
          });

          if (!accessTokenResponse.ok) {
            return res.status(401).json({
              success: false,
              error: 'Invalid Google token',
            });
          }

          const userData = await accessTokenResponse.json();
          googleUser = {
            email: userData.email,
            name: userData.name || userData.email?.split('@')[0] || 'User',
            googleId: userData.sub,
            picture: userData.picture,
          };
        } else {
          const tokenData = await response.json();
          googleUser = {
            email: tokenData.email,
            name: tokenData.name || tokenData.email?.split('@')[0] || 'User',
            googleId: tokenData.sub,
            picture: tokenData.picture,
          };
        }
      } catch (verifyError) {
        console.error('Google token verification error:', verifyError);
        return res.status(401).json({
          success: false,
          error: 'Failed to verify Google token',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing authentication data',
      });
    }

    // Check if user exists by Google ID
    let user = db.prepare(`
      SELECT * FROM users WHERE oauth_provider = 'google' AND oauth_id = ?
    `).get(googleUser.googleId) as UserRow | undefined;

    let isNewUser = false;

    if (!user) {
      // Check if user exists by email (might have signed up with Apple first)
      user = db.prepare(`
        SELECT * FROM users WHERE email = ?
      `).get(googleUser.email) as UserRow | undefined;

      if (user) {
        // Update existing user with Google OAuth info
        db.prepare(`
          UPDATE users SET oauth_provider = 'google', oauth_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(googleUser.googleId, user.id);
      } else {
        // Create new user
        isNewUser = true;
        const userId = uuidv4();
        db.prepare(`
          INSERT INTO users (id, email, name, avatar_url, oauth_provider, oauth_id)
          VALUES (?, ?, ?, ?, 'google', ?)
        `).run(userId, googleUser.email, googleUser.name, googleUser.picture || null, googleUser.googleId);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
      }
    }

    // Generate JWT token
    const token = generateToken({ id: user!.id, email: user!.email });

    res.json({
      success: true,
      data: {
        token,
        isNewUser,
        user: {
          id: user!.id,
          email: user!.email,
          name: user!.name,
          avatarUrl: user!.avatar_url,
          streakCurrent: user!.streak_current,
          streakLongest: user!.streak_longest,
          settings: JSON.parse(user!.settings || '{}'),
          createdAt: toISODate(user!.created_at),
        },
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Google',
    });
  }
});

/**
 * Apple OAuth - Verify identity token and create/login user
 * POST /api/auth/apple
 *
 * Apple Sign In provides identityToken and optional user info on first sign-in
 */
router.post('/apple', async (req: Request, res: Response) => {
  try {
    const validated = appleAuthSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
    }

    const { identityToken, user: appleUser } = validated.data;

    // In production, verify the token with Apple's public key
    // For now, we'll handle mock tokens for development
    let appleData: { appleId: string; email?: string; name?: string };

    if (identityToken.startsWith('mock-apple-token:')) {
      // Development mock token
      const parts = identityToken.split(':');
      appleData = {
        appleId: parts[1] || `apple-${Date.now()}`,
        email: appleUser?.email || parts[2],
        name: appleUser?.fullName
          ? `${appleUser.fullName.givenName || ''} ${appleUser.fullName.familyName || ''}`.trim()
          : parts[3],
      };
    } else {
      // In production, verify with Apple
      // Decode the JWT and verify signature against Apple's public keys
      return res.status(400).json({
        success: false,
        error: 'Apple OAuth not configured. Use mock tokens for development.',
      });
    }

    // Check if user exists by Apple ID
    let user = db.prepare(`
      SELECT * FROM users WHERE oauth_provider = 'apple' AND oauth_id = ?
    `).get(appleData.appleId) as UserRow | undefined;

    if (!user) {
      // Check if user exists by email (if provided)
      if (appleData.email) {
        user = db.prepare(`
          SELECT * FROM users WHERE email = ?
        `).get(appleData.email) as UserRow | undefined;

        if (user) {
          // Update existing user with Apple OAuth info
          db.prepare(`
            UPDATE users SET oauth_provider = 'apple', oauth_id = ?, updated_at = datetime('now')
            WHERE id = ?
          `).run(appleData.appleId, user.id);
        }
      }

      if (!user) {
        // Create new user
        // Note: Apple may not provide email/name after first sign-in
        const userId = uuidv4();
        const email = appleData.email || `${appleData.appleId}@privaterelay.appleid.com`;
        const name = appleData.name || 'Apple User';

        db.prepare(`
          INSERT INTO users (id, email, name, oauth_provider, oauth_id)
          VALUES (?, ?, ?, 'apple', ?)
        `).run(userId, email, name, appleData.appleId);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
      }
    }

    // Generate JWT token
    const token = generateToken({ id: user!.id, email: user!.email });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user!.id,
          email: user!.email,
          name: user!.name,
          avatarUrl: user!.avatar_url,
          streakCurrent: user!.streak_current,
          streakLongest: user!.streak_longest,
          settings: JSON.parse(user!.settings || '{}'),
          createdAt: toISODate(user!.created_at),
        },
      },
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate with Apple',
    });
  }
});

/**
 * Register with email and password
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validated = registerSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
    }

    const { email, password, name } = validated.data;

    // Use email prefix as default name if not provided
    const userName = name?.trim() || email.split('@')[0];

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists',
      });
    }

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `).run(userId, email, userName, passwordHash);

    // Create user profile
    db.prepare(`
      INSERT INTO user_profiles (user_id, bio, activity_public)
      VALUES (?, '', 1)
    `).run(userId);

    // Fetch the created user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        token,
        isNewUser: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
          streakCurrent: user.streak_current,
          streakLongest: user.streak_longest,
          settings: JSON.parse(user.settings || '{}'),
          createdAt: toISODate(user.created_at),
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account',
    });
  }
});

/**
 * Login with email and password
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = loginSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
    }

    const { email, password } = validated.data;

    // Find user by email
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if user has a password (might be OAuth-only account)
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'This account uses social login. Please sign in with Google or Apple.',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        token,
        isNewUser: false,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
          streakCurrent: user.streak_current,
          streakLongest: user.streak_longest,
          settings: JSON.parse(user.settings || '{}'),
          createdAt: toISODate(user.created_at),
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign in',
    });
  }
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  try {
    const user = db.prepare(`
      SELECT id, email, name, avatar_url, streak_current, streak_longest,
             last_study_date, settings, created_at
      FROM users
      WHERE id = ?
    `).get(req.authUser!.id) as UserRow;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get user's deck count and total cards
    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT d.id) as deckCount,
        SUM(d.card_count) as totalCards
      FROM decks d
      WHERE d.user_id = ?
    `).get(req.authUser!.id) as { deckCount: number; totalCards: number | null };

    // Get study stats
    const studyStats = db.prepare(`
      SELECT
        COUNT(*) as totalReviews,
        SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) as correctReviews
      FROM review_logs
      WHERE user_id = ?
    `).get(req.authUser!.id) as { totalReviews: number; correctReviews: number | null };

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        streakCurrent: user.streak_current,
        streakLongest: user.streak_longest,
        lastStudyDate: user.last_study_date,
        settings: JSON.parse(user.settings || '{}'),
        createdAt: toISODate(user.created_at),
        stats: {
          deckCount: stats.deckCount || 0,
          totalCards: stats.totalCards || 0,
          totalReviews: studyStats.totalReviews || 0,
          accuracy: studyStats.totalReviews
            ? Math.round(((studyStats.correctReviews || 0) / studyStats.totalReviews) * 100)
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
});

/**
 * Update user profile
 * PATCH /api/auth/me
 */
router.patch('/me', requireAuth, (req: Request, res: Response) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      avatarUrl: z.string().url().optional().nullable(),
      settings: z.record(z.unknown()).optional(),
    });

    const validated = updateSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        error: validated.error.errors[0].message,
      });
    }

    const { name, avatarUrl, settings } = validated.data;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }

    if (settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
      });
    }

    updates.push("updated_at = datetime('now')");
    values.push(req.authUser!.id);

    db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    // Fetch updated user
    const user = db.prepare(`
      SELECT id, email, name, avatar_url, streak_current, streak_longest, settings
      FROM users WHERE id = ?
    `).get(req.authUser!.id) as UserRow;

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        streakCurrent: user.streak_current,
        streakLongest: user.streak_longest,
        settings: JSON.parse(user.settings || '{}'),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

/**
 * Delete user account
 * DELETE /api/auth/me
 */
router.delete('/me', requireAuth, (req: Request, res: Response) => {
  try {
    // Delete user and all associated data (CASCADE should handle related tables)
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.authUser!.id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    });
  }
});

/**
 * Development-only: Create a mock login token
 * POST /api/auth/dev-login
 */
if (config.nodeEnv === 'development') {
  router.post('/dev-login', (req: Request, res: Response) => {
    try {
      const { email = 'demo@sage.app' } = req.body;

      // Find or create user
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;

      // Demo account start date: Jan 1, 2026
      const demoCreatedAt = '2026-01-01 00:00:00';

      if (!user) {
        const userId = uuidv4();
        db.prepare(`
          INSERT INTO users (id, email, name, created_at)
          VALUES (?, ?, ?, ?)
        `).run(userId, email, email.split('@')[0], demoCreatedAt);

        user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
      } else if (email === 'demo@sage.app') {
        // Always update demo account to Jan 1, 2026 for testing
        db.prepare(`UPDATE users SET created_at = ? WHERE id = ?`).run(demoCreatedAt, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as UserRow;
      }

      const token = generateToken({ id: user!.id, email: user!.email });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user!.id,
            email: user!.email,
            name: user!.name,
            avatarUrl: user!.avatar_url,
            streakCurrent: user!.streak_current,
            streakLongest: user!.streak_longest,
            createdAt: toISODate(user!.created_at),
          },
        },
      });
    } catch (error) {
      console.error('Dev login error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create dev login',
      });
    }
  });
}

export default router;
