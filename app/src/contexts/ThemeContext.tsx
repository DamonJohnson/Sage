import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '@/store';

export type ThemeMode = 'dark' | 'light';
export type ThemeSetting = 'dark' | 'light' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  themeSetting: ThemeSetting;
  toggleTheme: () => void;
  setTheme: (setting: ThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { settings, updateSettings } = useAuthStore();

  // Get the theme setting from auth store, default to 'dark'
  const themeSetting: ThemeSetting = (settings?.theme as ThemeSetting) || 'dark';

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
    // Toggle cycles: current -> opposite
    // If system, toggle to opposite of current actual mode
    // Otherwise toggle between light and dark
    const newSetting: ThemeSetting = isDark ? 'light' : 'dark';
    updateSettings({ theme: newSetting });
  };

  const setTheme = (setting: ThemeSetting) => {
    updateSettings({ theme: setting });
  };

  return (
    <ThemeContext.Provider value={{ mode, isDark, themeSetting, toggleTheme, setTheme }}>
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
