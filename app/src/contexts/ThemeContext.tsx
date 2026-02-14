import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { useAuthStore } from '@/store';

export type ThemeMode = 'dark' | 'light';
export type ThemeSetting = 'dark' | 'light' | 'system';

// Local storage key for theme (web fallback for faster hydration)
const THEME_STORAGE_KEY = 'sage-theme-preference';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  themeSetting: ThemeSetting;
  toggleTheme: () => void;
  setTheme: (setting: ThemeSetting) => void;
  isHydrated: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Get initial theme from localStorage (web) for instant load
const getInitialTheme = (): ThemeSetting => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch (e) {
      // localStorage not available
    }
  }
  return 'dark'; // Default for first-time users
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { settings, updateSettings } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeSetting>(getInitialTheme);

  // Sync with auth store once hydrated
  useEffect(() => {
    // Check if zustand store is hydrated
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // If already hydrated
    if (useAuthStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return unsubscribe;
  }, []);

  // Once hydrated, sync localStorage and zustand
  // Prioritize localStorage (web) since it's faster and more reliable
  useEffect(() => {
    if (isHydrated) {
      // On web, localStorage is the source of truth
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
          if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')) {
            // Sync zustand with localStorage if different
            if (settings?.theme !== storedTheme) {
              updateSettings({ theme: storedTheme });
            }
            return; // localStorage takes priority
          }
        } catch (e) {}
      }
      // Fall back to zustand settings if no localStorage
      if (settings?.theme) {
        setLocalTheme(settings.theme as ThemeSetting);
      }
    }
  }, [isHydrated]);

  // Get the theme setting - use local state for instant response
  const themeSetting: ThemeSetting = localTheme;

  // Calculate actual mode based on setting
  const getActualMode = (): ThemeMode => {
    if (themeSetting === 'system') {
      return systemColorScheme === 'light' ? 'light' : 'dark';
    }
    return themeSetting;
  };

  const mode = getActualMode();
  const isDark = mode === 'dark';

  const toggleTheme = () => {
    const newSetting: ThemeSetting = isDark ? 'light' : 'dark';

    // Update local state immediately for instant feedback
    setLocalTheme(newSetting);

    // Persist to localStorage (web) for faster hydration next time
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newSetting);
      } catch (e) {
        // localStorage not available
      }
    }

    // Update zustand store (persists to AsyncStorage)
    updateSettings({ theme: newSetting });
  };

  const setTheme = (setting: ThemeSetting) => {
    setLocalTheme(setting);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, setting);
      } catch (e) {
        // localStorage not available
      }
    }

    updateSettings({ theme: setting });
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, themeSetting, toggleTheme, setTheme, isHydrated }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
