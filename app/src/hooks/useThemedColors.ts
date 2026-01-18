import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { darkTheme, lightTheme, colors, darkColors, type Theme } from '@/theme/colors';

// Accent type with orange as primary (aliased as blue for backwards compat)
interface AccentColors {
  orange: string;  // Primary accent - #F47A3A
  green: string;   // Success
  red: string;     // Error/urgent
  purple: string;  // Multiple choice, AI features
  blue: string;    // Alias for orange (backwards compatibility)
}

export interface ThemedColors {
  // Core theme
  theme: Theme;

  // Direct theme access
  background: string;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;

  // Accent colors
  accent: AccentColors;

  // Legacy colors (for backwards compatibility)
  colors: typeof colors;
}

export function useThemedColors(): ThemedColors {
  const { isDark } = useTheme();

  return useMemo(() => {
    const theme = isDark ? darkTheme : lightTheme;
    const legacyColors = isDark ? darkColors : colors;

    // Map orange to blue for backwards compatibility
    const accent: AccentColors = {
      ...theme.accent,
      blue: theme.accent.orange, // Alias orange as blue for existing code
    };

    return {
      theme,
      background: theme.background,
      surface: theme.surface,
      surfaceHover: theme.surfaceHover,
      border: theme.border,
      textPrimary: theme.text.primary,
      textSecondary: theme.text.secondary,
      accent,
      colors: legacyColors,
    };
  }, [isDark]);
}
