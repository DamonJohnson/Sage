// Sage Design System - Notion-inspired Color Palette
// Grayscale-first with accent colors used sparingly
// Primary accent: Orange #F47A3A from logo

// Dark Mode Colors (default)
export const darkTheme = {
  // Core surfaces
  background: '#191919',
  surface: '#2F2F2F',
  surfaceHover: '#3A3A3A',
  border: '#3A3A3A',

  // Text
  text: {
    primary: '#E3E2E0',
    secondary: '#9B9A97',
  },

  // Accent colors (use sparingly)
  accent: {
    orange: '#F47A3A',    // Primary - links, primary actions, brand
    green: '#46B882',     // Success, mastered
    red: '#FF6B6B',       // Urgent/important, new cards
    purple: '#9B8AFB',    // Multiple choice, AI features
  },
} as const;

// Light Mode Colors - Warm, refined palette complementing the orange brand
export const lightTheme = {
  // Core surfaces - soft warm tones instead of stark white
  background: '#FDFCFA',      // Subtle warm cream, easier on the eyes
  surface: '#F5F3EF',         // Warm light surface with slight warmth
  surfaceHover: '#EDEAE4',    // Noticeably warmer hover state
  border: '#E2DFD8',          // Soft warm border, not harsh gray

  // Text - richer, warmer tones for better readability
  text: {
    primary: '#2C2A25',       // Rich warm black, softer than pure black
    secondary: '#6E6B63',     // Warm medium gray with personality
  },

  // Accent colors (optimized for light backgrounds)
  accent: {
    orange: '#E86D30',        // Slightly deeper orange for better contrast on light bg
    green: '#3EA876',         // Richer green, better contrast
    red: '#E55B5B',           // Deeper red for better visibility
    purple: '#7C6BF0',        // Deeper purple for light mode contrast
  },
} as const;

// Theme type for type safety
export type Theme = typeof darkTheme;

// Legacy color mapping for backwards compatibility during migration
export const colors = {
  // Primary - Orange from Sage logo
  primary: {
    50: '#FEF3EE',
    100: '#FDE7DD',
    200: '#FBCFBB',
    300: '#F9B799',
    400: '#F79F77',
    500: '#F47A3A',
    600: '#E5652A',
    700: '#C4511F',
    800: '#A34118',
    900: '#823212',
  },

  // Secondary - keeping for gradients
  secondary: {
    50: '#fff5f3',
    100: '#ffe4df',
    200: '#ffc9bf',
    300: '#ffa799',
    400: '#ff8573',
    500: '#ff7f66',
    600: '#ff6b4d',
    700: '#e85a3d',
    800: '#c44a32',
    900: '#a13d2a',
  },

  // Status colors for SRS states
  status: {
    new: '#E55B5B',        // Red - new cards (deeper for light mode)
    newLight: '#FDF0EF',   // Warm light red tint
    learning: '#E86D30',   // Orange - learning/review (matches brand, deeper)
    learningLight: '#FDF4EE', // Warm light orange tint
    mastered: '#3EA876',   // Green - mastered (deeper)
    masteredLight: '#EEF7F2', // Warm light green tint
  },

  // Grays (warm light mode values)
  gray: {
    50: '#FDFCFA',
    100: '#F5F3EF',
    200: '#EDEAE4',
    300: '#E2DFD8',
    400: '#9A9790',
    500: '#6E6B63',
    600: '#575550',
    700: '#3D3B36',
    800: '#2C2A25',
    900: '#1A1917',
  },

  // Semantic colors
  white: '#FDFCFA',
  black: '#1A1917',

  // Background colors (warm light mode defaults)
  background: {
    primary: '#FDFCFA',
    secondary: '#F5F3EF',
    tertiary: '#EDEAE4',
  },

  // Surface colors (warm light mode)
  surface: '#F5F3EF',
  surfaceVariant: '#EDEAE4',

  // Text colors (warm light mode)
  text: {
    primary: '#2C2A25',
    secondary: '#6E6B63',
    tertiary: '#9A9790',
    inverse: '#F5F3EF',
  },

  // Border colors (warm light mode)
  border: {
    light: '#E2DFD8',
    medium: '#D4D1C9',
    dark: '#C6C3BB',
  },

  // Semantic status (deeper for light mode contrast)
  error: '#E55B5B',
  success: '#3EA876',
  warning: '#E69B1F',
  info: '#E86D30',

  // Gradients (warm, refined for light mode)
  gradients: {
    primary: ['#E86D30', '#D45A20'],
    secondary: ['#E55B5B', '#D04A4A'],
    ai: ['#7C6BF0', '#6358E0'],
    success: ['#3EA876', '#329968'],
  },
} as const;

// Dark mode colors (legacy mapping)
export const darkColors = {
  ...colors,
  background: {
    primary: '#191919',
    secondary: '#2F2F2F',
    tertiary: '#3A3A3A',
  },
  surface: '#2F2F2F',
  surfaceVariant: '#3A3A3A',
  text: {
    primary: '#E3E2E0',
    secondary: '#9B9A97',
    tertiary: '#787774',
    inverse: '#37352F',
  },
  border: {
    light: '#3A3A3A',
    medium: '#4A4A4A',
    dark: '#5A5A5A',
  },
  gray: {
    50: '#191919',
    100: '#2F2F2F',
    200: '#3A3A3A',
    300: '#4A4A4A',
    400: '#787774',
    500: '#9B9A97',
    600: '#B3B2AF',
    700: '#CBCAC7',
    800: '#E3E2E0',
    900: '#F7F6F3',
  },
  white: '#E3E2E0',
  black: '#191919',
} as const;

export type Colors = typeof colors;
