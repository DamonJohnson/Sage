import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWeb: boolean;
}

// Breakpoint thresholds
const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

function getBreakpoint(width: number): Breakpoint {
  if (width >= DESKTOP_BREAKPOINT) return 'desktop';
  if (width >= TABLET_BREAKPOINT) return 'tablet';
  return 'mobile';
}

export function useResponsive(): ResponsiveInfo {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  const breakpoint = getBreakpoint(dimensions.width);

  return {
    width: dimensions.width,
    height: dimensions.height,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWeb: Platform.OS === 'web',
  };
}

// Utility for responsive styles
export function responsive<T>(
  info: ResponsiveInfo,
  values: { mobile: T; tablet?: T; desktop?: T }
): T {
  if (info.isDesktop && values.desktop !== undefined) return values.desktop;
  if (info.isTablet && values.tablet !== undefined) return values.tablet;
  if (info.isTablet && values.desktop !== undefined) return values.desktop;
  return values.mobile;
}
