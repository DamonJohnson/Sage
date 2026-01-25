import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

// Augment Express Request to include our user type
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthenticatedUser;
}

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: { id: string; email: string }): string {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    options
  );
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Middleware that requires authentication
 * Extracts JWT from Authorization header (Bearer token)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please sign in again.',
    });
    return;
  }

  // Fetch user from database
  const user = db.prepare(`
    SELECT id, email, name, avatar_url as avatarUrl
    FROM users
    WHERE id = ?
  `).get(payload.userId) as AuthenticatedUser | undefined;

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'User not found. Please sign in again.',
    });
    return;
  }

  req.authUser = user;
  next();
}

/**
 * Middleware that optionally authenticates
 * If a valid token is provided, sets req.authUser, otherwise continues without auth
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (payload) {
    const user = db.prepare(`
      SELECT id, email, name, avatar_url as avatarUrl
      FROM users
      WHERE id = ?
    `).get(payload.userId) as AuthenticatedUser | undefined;

    if (user) {
      req.authUser = user;
    }
  }

  next();
}

/**
 * Get user ID from request, using authenticated user or falling back to stub user
 */
export function getUserId(req: Request): string {
  if (req.authUser) {
    return req.authUser.id;
  }
  // In development, allow x-user-id header to specify user
  if (config.nodeEnv === 'development' && req.headers['x-user-id']) {
    return req.headers['x-user-id'] as string;
  }
  // Fallback to demo user for development
  return 'stub-user-1';
}
