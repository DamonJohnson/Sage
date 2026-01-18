/**
 * Auth Service
 *
 * Handles authentication via Google and Apple OAuth.
 */

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { apiRequest, setAuthToken, clearAuthToken, APIResponse } from './api';

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// OAuth Client IDs - set these in your .env file
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  streakCurrent: number;
  streakLongest: number;
  settings?: Record<string, unknown>;
  isNewUser?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  isNewUser?: boolean;
}

export interface ProfileResponse extends User {
  lastStudyDate?: string;
  createdAt: string;
  stats: {
    deckCount: number;
    totalCards: number;
    totalReviews: number;
    accuracy: number;
  };
}

/**
 * Hook to get Google auth request and prompt
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  return { request, response, promptAsync };
}

/**
 * Sign in with Google OAuth - sends ID token to backend
 */
export async function signInWithGoogle(idToken: string): Promise<APIResponse<AuthResponse>> {
  const response = await apiRequest<AuthResponse>('POST', '/api/auth/google', { idToken });

  if (response.success && response.data?.token) {
    await setAuthToken(response.data.token);
  }

  return response;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Sign in with Google using access token (fetches user info then creates account)
 * Returns Google user info even if backend sync fails
 */
export async function signInWithGoogleAccessToken(accessToken: string): Promise<APIResponse<AuthResponse> & { googleUser?: GoogleUserInfo }> {
  try {
    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return { success: false, error: 'Failed to get Google user info' };
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // Try to sync with backend
    try {
      const response = await apiRequest<AuthResponse>('POST', '/api/auth/google', {
        accessToken,
        userInfo: {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          googleId: userInfo.id,
        }
      });

      if (response.success && response.data?.token) {
        await setAuthToken(response.data.token);
        return { ...response, googleUser: userInfo };
      }
    } catch (backendError) {
      console.log('Backend sync failed, using local auth:', backendError);
    }

    // Return success with Google user info even if backend fails
    // This allows offline-first auth
    return {
      success: true,
      googleUser: userInfo,
      data: {
        token: `local-${userInfo.id}`,
        user: {
          id: `google-${userInfo.id}`,
          email: userInfo.email,
          name: userInfo.name,
          avatarUrl: userInfo.picture,
          streakCurrent: 0,
          streakLongest: 0,
        }
      }
    };
  } catch (error) {
    console.error('Google sign in error:', error);
    return { success: false, error: 'Failed to sign in with Google' };
  }
}

/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple(
  identityToken: string,
  authorizationCode: string,
  user?: {
    email?: string;
    fullName?: { givenName?: string; familyName?: string };
  }
): Promise<APIResponse<AuthResponse>> {
  const response = await apiRequest<AuthResponse>('POST', '/api/auth/apple', {
    identityToken,
    authorizationCode,
    user,
  });

  if (response.success && response.data?.token) {
    await setAuthToken(response.data.token);
  }

  return response;
}

/**
 * Development login (for testing)
 */
export async function devLogin(email?: string): Promise<APIResponse<AuthResponse>> {
  const response = await apiRequest<AuthResponse>('POST', '/api/auth/dev-login', { email });

  if (response.success && response.data?.token) {
    await setAuthToken(response.data.token);
  }

  return response;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<APIResponse<AuthResponse>> {
  try {
    const response = await apiRequest<AuthResponse>('POST', '/api/auth/register', {
      email,
      password,
      ...(name && { name }),
    });

    if (response.success && response.data?.token) {
      await setAuthToken(response.data.token);
    }

    return response;
  } catch (error) {
    // If backend is unavailable, create local account for development
    console.log('Backend unavailable, creating local account');
    const localUser = {
      id: `local-${Date.now()}`,
      email,
      name: name || email.split('@')[0],
      avatarUrl: undefined,
      streakCurrent: 0,
      streakLongest: 0,
    };
    return {
      success: true,
      data: {
        token: `local-${localUser.id}`,
        user: localUser,
        isNewUser: true,
      }
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<APIResponse<AuthResponse>> {
  try {
    const response = await apiRequest<AuthResponse>('POST', '/api/auth/login', {
      email,
      password,
    });

    if (response.success && response.data?.token) {
      await setAuthToken(response.data.token);
    }

    return response;
  } catch (error) {
    return { success: false, error: 'Unable to connect to server' };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<APIResponse<ProfileResponse>> {
  return apiRequest<ProfileResponse>('GET', '/api/auth/me');
}

/**
 * Update user profile
 */
export async function updateProfile(data: {
  name?: string;
  avatarUrl?: string | null;
  settings?: Record<string, unknown>;
}): Promise<APIResponse<User>> {
  return apiRequest<User>('PATCH', '/api/auth/me', data);
}

/**
 * Complete profile setup for new users
 */
export async function completeProfileSetup(data: {
  name: string;
  avatarUrl?: string | null;
  dailyGoal?: number;
  studyReminders?: boolean;
  reminderTime?: string;
}): Promise<APIResponse<User>> {
  return apiRequest<User>('PATCH', '/api/auth/me', {
    name: data.name,
    avatarUrl: data.avatarUrl,
    settings: {
      dailyGoal: data.dailyGoal || 20,
      notificationsEnabled: data.studyReminders ?? true,
      reminderTime: data.reminderTime || '09:00',
      profileComplete: true,
    },
  });
}

/**
 * Delete user account
 */
export async function deleteAccount(): Promise<APIResponse<{ message: string }>> {
  const response = await apiRequest<{ message: string }>('DELETE', '/api/auth/me');

  if (response.success) {
    await clearAuthToken();
  }

  return response;
}

/**
 * Sign out - clears local token
 */
export async function signOut(): Promise<void> {
  await clearAuthToken();
}

/**
 * Check if Apple Sign In is available (iOS only)
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Perform Apple Sign In flow
 */
export async function performAppleSignIn(): Promise<{
  identityToken: string;
  authorizationCode: string;
  user?: {
    email?: string;
    fullName?: { givenName?: string; familyName?: string };
  };
} | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken || !credential.authorizationCode) {
      return null;
    }

    return {
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
      user: {
        email: credential.email || undefined,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName || undefined,
              familyName: credential.fullName.familyName || undefined,
            }
          : undefined,
      },
    };
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      return null;
    }
    throw error;
  }
}
