// Sage Design System
// Grayscale-first with accent colors used sparingly
// Primary accent: Burnt Orange #D96830 (dark) / #C05518 (light)

// Dark Mode Colors (default for first-time users)
export const darkTheme = {
  // Core surfaces - warm charcoal
  background: '#1A1A1A',
  surface: '#252525',
  surfaceHover: '#303030',
  border: '#3A3A3A',

  // Text
  text: {
    primary: '#EBEBEB',
    secondary: '#A0A0A0',
  },

  // Accent colors (use sparingly)
  accent: {
    orange: '#D96830',    // Primary - warm burnt orange, slightly brighter
    green: '#4A9B7F',     // Success, mastered - sage green
    red: '#C45454',       // Urgent/important - muted red
    purple: '#8B7BBF',    // Multiple choice, AI features
  },
} as const;

// Light Mode Colors - Sophisticated warm neutral palette
// Design principles:
// - Warm paper-like background reduces eye strain
// - White cards for seamless image backgrounds
// - Muted accent colors that don't compete with content
// - Strong text contrast for readability
export const lightTheme = {
  // Core surfaces
  background: '#F0EDE8',      // Warm paper - like aged quality paper
  surface: '#FFFFFF',         // Pure white cards for image compatibility
  surfaceHover: '#F7F5F2',    // Subtle warm hover
  border: '#D8D4CD',          // Warm grey border

  // Text - high contrast for readability
  text: {
    primary: '#1F1E1C',       // Near black with warmth
    secondary: '#6B665D',     // Warm medium grey
  },

  // Accent colors (deeper for light backgrounds)
  accent: {
    orange: '#C05518',        // Burnt orange - good contrast on light bg
    green: '#3D7A63',         // Deep sage green
    red: '#A84040',           // Deep muted red
    purple: '#6B5CA0',        // Deep muted purple
  },
} as const;

// Theme type for type safety
export type Theme = typeof darkTheme;

// Legacy color mapping for backwards compatibility
export const colors = {
  // Primary - Burnt Orange scale
  primary: {
    50: '#FEF6F0',
    100: '#FCEBE0',
    200: '#F8D5C0',
    300: '#F0B898',
    400: '#E89468',
    500: '#D96830',
    600: '#C05518',
    700: '#9A4412',
    800: '#74330E',
    900: '#4E220A',
  },

  // Secondary - warm coral
  secondary: {
    50: '#FDF5F2',
    100: '#FAEBE5',
    200: '#F2D5CC',
    300: '#E8B8AA',
    400: '#D89580',
    500: '#C06B50',
    600: '#A05540',
    700: '#804435',
    800: '#60332A',
    900: '#40221F',
  },

  // Status colors for SRS states
  status: {
    new: '#A84040',        // Muted red - new cards
    newLight: '#FDF0F0',   // Light red tint
    learning: '#C05518',   // Burnt orange - learning
    learningLight: '#FEF6F0',
    mastered: '#3D7A63',   // Sage green - mastered
    masteredLight: '#F0F7F4',
  },

  // Grays - warm neutral scale
  gray: {
    50: '#FAFAF8',
    100: '#F0EDE8',
    200: '#E5E1DA',
    300: '#D8D4CD',
    400: '#A8A49C',
    500: '#6B665D',
    600: '#52504A',
    700: '#3A3836',
    800: '#1F1E1C',
    900: '#121110',
  },

  // Semantic
  white: '#FFFFFF',
  black: '#121110',

  // Background
  background: {
    primary: '#F0EDE8',
    secondary: '#FFFFFF',
    tertiary: '#E5E1DA',
  },

  // Surface
  surface: '#FFFFFF',
  surfaceVariant: '#F7F5F2',

  // Text
  text: {
    primary: '#1F1E1C',
    secondary: '#6B665D',
    tertiary: '#A8A49C',
    inverse: '#FFFFFF',
  },

  // Border
  border: {
    light: '#D8D4CD',
    medium: '#C8C4BC',
    dark: '#B8B4AC',
  },

  // Status
  error: '#A84040',
  success: '#3D7A63',
  warning: '#B88020',
  info: '#C05518',

  // Gradients
  gradients: {
    primary: ['#D96830', '#C05518'],
    secondary: ['#A84040', '#883535'],
    ai: ['#6B5CA0', '#554A85'],
    success: ['#4A9B7F', '#3D7A63'],
  },
} as const;

// Dark mode colors (legacy mapping)
export const darkColors = {
  ...colors,
  background: {
    primary: '#1A1A1A',
    secondary: '#252525',
    tertiary: '#303030',
  },
  surface: '#252525',
  surfaceVariant: '#303030',
  text: {
    primary: '#EBEBEB',
    secondary: '#A0A0A0',
    tertiary: '#707070',
    inverse: '#252525',
  },
  border: {
    light: '#3A3A3A',
    medium: '#484848',
    dark: '#585858',
  },
  gray: {
    50: '#1A1A1A',
    100: '#252525',
    200: '#303030',
    300: '#404040',
    400: '#707070',
    500: '#A0A0A0',
    600: '#B8B8B8',
    700: '#D0D0D0',
    800: '#EBEBEB',
    900: '#F8F8F8',
  },
  white: '#EBEBEB',
  black: '#1A1A1A',
  status: {
    new: '#C45454',
    newLight: '#2A2020',
    learning: '#D96830',
    learningLight: '#2A2218',
    mastered: '#4A9B7F',
    masteredLight: '#1A2A24',
  },
  error: '#C45454',
  success: '#4A9B7F',
  warning: '#D4A030',
  info: '#D96830',
  gradients: {
    primary: ['#D96830', '#C05518'],
    secondary: ['#C45454', '#A84040'],
    ai: ['#8B7BBF', '#6B5CA0'],
    success: ['#4A9B7F', '#3D7A63'],
  },
} as const;

export type Colors = typeof colors;
