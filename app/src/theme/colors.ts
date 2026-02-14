// Sage Design System
// Navy blue backgrounds with orange + green accents
// Primary accent: Burnt Orange #f97316 / Navy Blue #0f172a

// Dark Mode Colors (default for first-time users)
export const darkTheme = {
  // Core surfaces - navy blue (matching waitlist)
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#334155',
  border: '#334155',

  // Text
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
  },

  // Accent colors
  accent: {
    orange: '#f97316',    // Primary - vibrant orange
    green: '#4ade80',     // Success, mastered - bright green
    red: '#f87171',       // Urgent/important
    purple: '#a78bfa',    // AI features
    blue: '#3b82f6',      // Secondary accent
  },
} as const;

// Light Mode Colors - Clean with navy buttons and orange accents
// Design principles:
// - Light background with navy blue buttons/accents
// - White cards with subtle blue tints
// - Navy primary, orange secondary
export const lightTheme = {
  // Core surfaces - light with blue hints
  background: '#f8fafc',      // Very light blue-grey
  surface: '#ffffff',         // Pure white cards
  surfaceHover: '#f1f5f9',    // Light slate hover
  border: '#e2e8f0',          // Light slate border

  // Text - high contrast
  text: {
    primary: '#0f172a',       // Navy - matches dark bg
    secondary: '#64748b',     // Slate grey
  },

  // Accent colors - navy primary for buttons
  accent: {
    orange: '#1e293b',        // Navy blue for primary buttons
    green: '#16a34a',         // Vibrant green
    red: '#dc2626',           // Clear red
    purple: '#7c3aed',        // Vibrant purple
    blue: '#2563eb',          // Strong blue
  },
} as const;

// Theme type for type safety
export type Theme = typeof darkTheme;

// Legacy color mapping for backwards compatibility
export const colors = {
  // Primary - Orange scale
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },

  // Secondary - Blue scale
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Status colors for SRS states
  status: {
    new: '#f87171',        // Red - new cards
    newLight: '#fef2f2',
    learning: '#f97316',   // Orange - learning
    learningLight: '#fff7ed',
    mastered: '#4ade80',   // Green - mastered
    masteredLight: '#f0fdf4',
  },

  // Grays - slate scale
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Semantic
  white: '#FFFFFF',
  black: '#0f172a',

  // Background
  background: {
    primary: '#f8fafc',
    secondary: '#ffffff',
    tertiary: '#f1f5f9',
  },

  // Surface
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',

  // Text
  text: {
    primary: '#0f172a',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
  },

  // Border
  border: {
    light: '#e2e8f0',
    medium: '#cbd5e1',
    dark: '#94a3b8',
  },

  // Status
  error: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
  info: '#2563eb',

  // Gradients
  gradients: {
    primary: ['#f97316', '#ea580c'],
    secondary: ['#3b82f6', '#2563eb'],
    ai: ['#a78bfa', '#7c3aed'],
    success: ['#4ade80', '#16a34a'],
    dark: ['#0f172a', '#1e293b'],
  },
} as const;

// Dark mode colors (legacy mapping)
export const darkColors = {
  ...colors,
  background: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
  },
  surface: '#1e293b',
  surfaceVariant: '#334155',
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
    tertiary: '#64748b',
    inverse: '#0f172a',
  },
  border: {
    light: '#334155',
    medium: '#475569',
    dark: '#64748b',
  },
  gray: {
    50: '#0f172a',
    100: '#1e293b',
    200: '#334155',
    300: '#475569',
    400: '#64748b',
    500: '#94a3b8',
    600: '#cbd5e1',
    700: '#e2e8f0',
    800: '#f1f5f9',
    900: '#f8fafc',
  },
  white: '#f1f5f9',
  black: '#0f172a',
  status: {
    new: '#f87171',
    newLight: '#1e1b1b',
    learning: '#f97316',
    learningLight: '#1e1a15',
    mastered: '#4ade80',
    masteredLight: '#14231a',
  },
  error: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  info: '#3b82f6',
  gradients: {
    primary: ['#f97316', '#ea580c'],
    secondary: ['#3b82f6', '#2563eb'],
    ai: ['#a78bfa', '#7c3aed'],
    success: ['#4ade80', '#16a34a'],
    dark: ['#0f172a', '#1e293b'],
  },
} as const;

export type Colors = typeof colors;
