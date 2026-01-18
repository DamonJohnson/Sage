import { Platform } from 'react-native';

// Sage Design System Typography
// Font weights: 400 (regular), 500 (medium), 600 (semibold)
// Use weight for hierarchy, not color
// Base font size: 14px
// Headings: 16-24px

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: 'System',
});

export const typography = {
  fontFamily: {
    regular: fontFamily,
    medium: fontFamily,
    semibold: fontFamily,
    bold: fontFamily,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,  // Use sparingly - prefer semibold
  },

  // Updated sizes with 14px base
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,      // Default body text
    md: 15,
    lg: 16,        // Heading 4 / emphasis
    xl: 18,        // Heading 3
    '2xl': 20,     // Heading 2
    '3xl': 24,     // Heading 1
    '4xl': 28,     // Large titles
    '5xl': 32,     // Extra large titles
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },

  // Pre-defined text styles following design system
  variants: {
    // Headings - use font weight for hierarchy
    h1: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h2: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    h4: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },

    // Body text
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 18,
    },

    // UI elements
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 11,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    buttonSmall: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 18,
    },

    // Navigation
    navItem: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    navItemActive: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  },
} as const;

export type Typography = typeof typography;
