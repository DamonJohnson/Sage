import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, UserSettings } from '@sage/shared';
import {
  signInWithGoogle as apiSignInWithGoogle,
  signInWithApple as apiSignInWithApple,
  signOut as apiSignOut,
  devLogin as apiDevLogin,
  getCurrentUser,
  updateProfile,
  clearAuthToken,
  getAuthToken,
} from '@/services';

// Stubbed user for development (when not connected to backend)
const STUB_USER: User = {
  id: 'stub-user-1',
  email: 'demo@sage.app',
  name: 'Demo User',
  avatarUrl: null,
  oauthProvider: null,
  streakCurrent: 7,
  streakLongest: 14,
  lastStudyDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_FSRS_SETTINGS = {
  requestRetention: 0.9, // 90% target retention
  maximumInterval: 365, // 1 year max interval
  newCardsPerDay: 20,
  reviewsPerDay: 0, // 0 = unlimited
  learningSteps: [1, 10], // 1 min, 10 min
  graduatingInterval: 1,
  easyInterval: 4,
};

const DEFAULT_KEYBOARD_SHORTCUTS = {
  enabled: true,
  showHints: true,
  bindings: {
    flipCard: 'Space',
    rateAgain: '1',
    rateHard: '2',
    rateGood: '3',
    rateEasy: '4',
    closeStudy: 'Escape',
    mcOption1: '1',
    mcOption2: '2',
    mcOption3: '3',
    mcOption4: '4',
    mcSubmit: 'Enter',
  },
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  hapticFeedback: true,
  soundEffects: true,
  dailyGoal: 20,
  notificationsEnabled: true,
  reminderTime: '09:00',
  activityPublic: true,
  profilePublic: true,
  fsrs: DEFAULT_FSRS_SETTINGS,
  keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
};

interface AuthState {
  user: User | null;
  settings: UserSettings;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  needsProfileSetup: boolean;
  hasSeenOnboarding: boolean;

  // Actions
  setAuthenticated: (user: Partial<User> & { id: string; email: string; name: string }, isNewUser?: boolean) => void;
  signInWithGoogle: (idToken: string) => Promise<boolean>;
  signInWithApple: (identityToken: string, authorizationCode: string, userData?: { email?: string; fullName?: { givenName?: string; familyName?: string } }) => Promise<boolean>;
  devLogin: (email?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  syncSettingsToServer: () => Promise<void>;
  incrementStreak: () => void;
  clearError: () => void;
  completeProfileSetup: () => void;
  completeOnboarding: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state - not authenticated until we check token
      user: null,
      settings: DEFAULT_SETTINGS,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      needsProfileSetup: false,
      hasSeenOnboarding: false,

      setAuthenticated: (userData, isNewUser = false) => {
        set({
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            avatarUrl: userData.avatarUrl || null,
            oauthProvider: null,
            streakCurrent: userData.streakCurrent || 0,
            streakLongest: userData.streakLongest || 0,
            lastStudyDate: null,
            createdAt: userData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          isAuthenticated: true,
          isLoading: false,
          authError: null,
          needsProfileSetup: isNewUser,
        });
      },

      signInWithGoogle: async (idToken: string) => {
        set({ isLoading: true, authError: null });
        try {
          const response = await apiSignInWithGoogle(idToken);
          if (response.success && response.data) {
            set({
              user: {
                id: response.data.user.id,
                email: response.data.user.email,
                name: response.data.user.name,
                avatarUrl: response.data.user.avatarUrl || null,
                oauthProvider: 'google',
                streakCurrent: response.data.user.streakCurrent,
                streakLongest: response.data.user.streakLongest,
                lastStudyDate: null,
                createdAt: response.data.user.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({ authError: response.error || 'Failed to sign in', isLoading: false });
            return false;
          }
        } catch (error) {
          set({ authError: 'Network error', isLoading: false });
          return false;
        }
      },

      signInWithApple: async (identityToken, authorizationCode, userData) => {
        set({ isLoading: true, authError: null });
        try {
          const response = await apiSignInWithApple(identityToken, authorizationCode, userData);
          if (response.success && response.data) {
            set({
              user: {
                id: response.data.user.id,
                email: response.data.user.email,
                name: response.data.user.name,
                avatarUrl: response.data.user.avatarUrl || null,
                oauthProvider: 'apple',
                streakCurrent: response.data.user.streakCurrent,
                streakLongest: response.data.user.streakLongest,
                lastStudyDate: null,
                createdAt: response.data.user.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({ authError: response.error || 'Failed to sign in', isLoading: false });
            return false;
          }
        } catch (error) {
          set({ authError: 'Network error', isLoading: false });
          return false;
        }
      },

      devLogin: async (email?: string) => {
        set({ isLoading: true, authError: null });
        try {
          const response = await apiDevLogin(email);
          if (response.success && response.data) {
            set({
              user: {
                id: response.data.user.id,
                email: response.data.user.email,
                name: response.data.user.name,
                avatarUrl: response.data.user.avatarUrl || null,
                oauthProvider: null,
                streakCurrent: response.data.user.streakCurrent,
                streakLongest: response.data.user.streakLongest,
                lastStudyDate: null,
                createdAt: response.data.user.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            // Fallback to stub user if backend not available
            set({
              user: STUB_USER,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
        } catch (error) {
          // Fallback to stub user if network error
          set({
            user: STUB_USER,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        try {
          await apiSignOut();
        } catch (error) {
          // Continue with local sign out even if API fails
          console.error('Sign out error:', error);
        }
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          settings: DEFAULT_SETTINGS,
          needsProfileSetup: false,
        });
      },

      checkAuthStatus: async () => {
        set({ isLoading: true });
        try {
          const token = await getAuthToken();
          if (!token) {
            set({ isAuthenticated: false, user: null, isLoading: false });
            return;
          }

          const response = await getCurrentUser();
          if (response.success && response.data) {
            set({
              user: {
                id: response.data.id,
                email: response.data.email,
                name: response.data.name,
                avatarUrl: response.data.avatarUrl || null,
                oauthProvider: null,
                streakCurrent: response.data.streakCurrent,
                streakLongest: response.data.streakLongest,
                lastStudyDate: response.data.lastStudyDate || null,
                createdAt: response.data.createdAt,
                updatedAt: new Date().toISOString(),
              },
              settings: { ...DEFAULT_SETTINGS, ...response.data.settings },
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token invalid, clear it
            await clearAuthToken();
            set({ isAuthenticated: false, user: null, isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false });
        }
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({
            user: { ...user, ...updates, updatedAt: new Date().toISOString() },
          });
        }
      },

      updateSettings: (updates) => {
        set({ settings: { ...get().settings, ...updates } });
      },

      syncSettingsToServer: async () => {
        const { settings, isAuthenticated } = get();
        if (!isAuthenticated) return;

        try {
          await updateProfile({ settings: settings as unknown as Record<string, unknown> });
        } catch (error) {
          console.error('Failed to sync settings:', error);
        }
      },

      incrementStreak: () => {
        const { user } = get();
        if (user) {
          const newStreak = user.streakCurrent + 1;
          set({
            user: {
              ...user,
              streakCurrent: newStreak,
              streakLongest: Math.max(newStreak, user.streakLongest),
              lastStudyDate: new Date().toISOString(),
            },
          });
        }
      },

      clearError: () => {
        set({ authError: null });
      },

      completeProfileSetup: () => {
        set({ needsProfileSetup: false });
      },

      completeOnboarding: () => {
        set({ hasSeenOnboarding: true });
      },
    }),
    {
      name: 'sage-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        settings: state.settings,
        isAuthenticated: state.isAuthenticated,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
      // Merge stored state with defaults to handle new settings fields
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState>;
        return {
          ...currentState,
          ...persisted,
          settings: {
            ...DEFAULT_SETTINGS,
            ...persisted.settings,
            fsrs: {
              ...DEFAULT_FSRS_SETTINGS,
              ...persisted.settings?.fsrs,
            },
            keyboardShortcuts: {
              ...DEFAULT_KEYBOARD_SHORTCUTS,
              ...persisted.settings?.keyboardShortcuts,
              bindings: {
                ...DEFAULT_KEYBOARD_SHORTCUTS.bindings,
                ...persisted.settings?.keyboardShortcuts?.bindings,
              },
            },
          },
        };
      },
    }
  )
);
