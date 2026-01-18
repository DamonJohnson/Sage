import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { colors, darkColors, darkTheme as darkThemeColors, lightTheme as lightThemeColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadows, transitions } from './spacing';

// React Native Paper theme configuration
const fontConfig = {
  displayLarge: typography.variants.h1,
  displayMedium: typography.variants.h2,
  displaySmall: typography.variants.h3,
  headlineLarge: typography.variants.h2,
  headlineMedium: typography.variants.h3,
  headlineSmall: typography.variants.h4,
  titleLarge: typography.variants.h4,
  titleMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodyLarge: typography.variants.body,
  bodyMedium: typography.variants.bodySmall,
  bodySmall: typography.variants.caption,
  labelLarge: typography.variants.button,
  labelMedium: typography.variants.buttonSmall,
  labelSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

// Light theme for React Native Paper
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightThemeColors.accent.orange,
    primaryContainer: colors.primary[100],
    onPrimary: '#FFFFFF',
    onPrimaryContainer: colors.primary[900],
    secondary: lightThemeColors.accent.green,
    secondaryContainer: colors.secondary[100],
    onSecondary: '#FFFFFF',
    onSecondaryContainer: colors.secondary[900],
    tertiary: lightThemeColors.accent.orange,
    background: lightThemeColors.background,
    surface: lightThemeColors.surface,
    surfaceVariant: lightThemeColors.surfaceHover,
    onBackground: lightThemeColors.text.primary,
    onSurface: lightThemeColors.text.primary,
    onSurfaceVariant: lightThemeColors.text.secondary,
    outline: lightThemeColors.border,
    outlineVariant: lightThemeColors.border,
    error: lightThemeColors.accent.red,
    onError: '#FFFFFF',
    errorContainer: '#FFE5E5',
    onErrorContainer: '#991b1b',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: borderRadius.md,
};

// Dark theme for React Native Paper (default)
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkThemeColors.accent.orange,
    primaryContainer: colors.primary[800],
    onPrimary: '#FFFFFF',
    onPrimaryContainer: colors.primary[100],
    secondary: darkThemeColors.accent.green,
    secondaryContainer: colors.secondary[800],
    onSecondary: '#FFFFFF',
    onSecondaryContainer: colors.secondary[100],
    tertiary: darkThemeColors.accent.orange,
    background: darkThemeColors.background,
    surface: darkThemeColors.surface,
    surfaceVariant: darkThemeColors.surfaceHover,
    onBackground: darkThemeColors.text.primary,
    onSurface: darkThemeColors.text.primary,
    onSurfaceVariant: darkThemeColors.text.secondary,
    outline: darkThemeColors.border,
    outlineVariant: darkThemeColors.border,
    error: darkThemeColors.accent.red,
    onError: '#191919',
    errorContainer: '#5A2323',
    onErrorContainer: '#FFE5E5',
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: borderRadius.md,
};

// Export everything
export { colors, darkColors, darkTheme as darkThemeColors, lightTheme as lightThemeColors } from './colors';
export type { Theme } from './colors';
export { typography } from './typography';
export { spacing, borderRadius, shadows, transitions } from './spacing';

export type AppTheme = typeof lightTheme;
