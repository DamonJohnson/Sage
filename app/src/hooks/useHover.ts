import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';

interface HoverState {
  isHovered: boolean;
  hoverProps: {
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
  };
}

/**
 * Hook for handling hover states on web
 * Returns empty handlers on native platforms for performance
 */
export function useHover(): HoverState {
  const [isHovered, setIsHovered] = useState(false);

  const onMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const hoverProps = useMemo(() => {
    if (Platform.OS !== 'web') {
      return {};
    }
    return {
      onMouseEnter,
      onMouseLeave,
    };
  }, [onMouseEnter, onMouseLeave]);

  return {
    isHovered: Platform.OS === 'web' ? isHovered : false,
    hoverProps,
  };
}

/**
 * Get web-specific cursor style
 */
export function getWebCursor(disabled?: boolean): object {
  if (Platform.OS !== 'web') return {};
  return {
    cursor: disabled ? 'not-allowed' : 'pointer',
  } as any;
}

/**
 * Get transition style for smooth hover effects
 */
export function getTransitionStyle(properties: string[] = ['all']): object {
  if (Platform.OS !== 'web') return {};
  return {
    transition: properties.map(p => `${p} 150ms ease`).join(', '),
  } as any;
}
