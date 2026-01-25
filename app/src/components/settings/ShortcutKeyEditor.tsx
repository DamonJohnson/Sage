import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius } from '@/theme';

interface ShortcutKeyEditorProps {
  label: string;
  currentKey: string;
  onKeyChange: (newKey: string) => void;
  disabled?: boolean;
}

// Format key for display
function formatKeyDisplay(key: string): string {
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'Space': 'Space',
    'Enter': 'Enter',
    'Escape': 'Esc',
    'ArrowUp': '\u2191',
    'ArrowDown': '\u2193',
    'ArrowLeft': '\u2190',
    'ArrowRight': '\u2192',
    'Backspace': '\u232B',
    'Tab': 'Tab',
  };
  return keyMap[key] || key.toUpperCase();
}

// Get the key identifier from a keyboard event
function getKeyIdentifier(event: KeyboardEvent): string | null {
  // Ignore modifier-only presses
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    return null;
  }

  // Special keys
  if (event.key === ' ') return 'Space';
  if (event.key === 'Enter') return 'Enter';
  if (event.key === 'Escape') return 'Escape';
  if (event.key === 'Tab') return 'Tab';
  if (event.key === 'Backspace') return 'Backspace';
  if (event.key.startsWith('Arrow')) return event.key;

  // Alphanumeric keys - return uppercase
  if (event.key.length === 1) {
    return event.key.toUpperCase();
  }

  // Function keys
  if (event.key.startsWith('F') && event.key.length <= 3) {
    return event.key;
  }

  return null;
}

export function ShortcutKeyEditor({
  label,
  currentKey,
  onKeyChange,
  disabled = false,
}: ShortcutKeyEditorProps) {
  const { surface, surfaceHover, textPrimary, textSecondary, accent, border } = useThemedColors();
  const [isListening, setIsListening] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (!isListening || Platform.OS !== 'web') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Cancel on Escape if already has a binding
      if (event.key === 'Escape' && currentKey) {
        setIsListening(false);
        return;
      }

      const newKey = getKeyIdentifier(event);
      if (newKey) {
        onKeyChange(newKey);
        setIsListening(false);
      }
    };

    // Handle click outside to cancel
    const handleClickOutside = (event: MouseEvent) => {
      setIsListening(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    // Small delay to avoid the click that started listening from immediately cancelling
    const timeoutId = setTimeout(() => {
      window.addEventListener('click', handleClickOutside, true);
    }, 100);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('click', handleClickOutside, true);
      clearTimeout(timeoutId);
    };
  }, [isListening, currentKey, onKeyChange]);

  const handlePress = () => {
    if (disabled || Platform.OS !== 'web') return;
    setIsListening(true);
  };

  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: textPrimary }]}>{label}</Text>
      <TouchableOpacity
        ref={containerRef as any}
        style={[
          styles.keyButton,
          {
            backgroundColor: isListening
              ? accent.orange + '20'
              : (isHovered ? surfaceHover : surface),
            borderColor: isListening
              ? accent.orange
              : (isHovered ? accent.orange : border),
          },
          disabled && styles.keyButtonDisabled,
          Platform.OS === 'web' && {
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 150ms ease',
          } as any,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        {...webProps}
      >
        <Text
          style={[
            styles.keyText,
            {
              color: isListening
                ? accent.orange
                : (disabled ? textSecondary : textPrimary),
            },
            isListening && styles.keyTextListening,
          ]}
        >
          {isListening ? 'Press a key...' : formatKeyDisplay(currentKey)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  label: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  keyButton: {
    minWidth: 80,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonDisabled: {
    opacity: 0.5,
  },
  keyText: {
    fontSize: typography.sizes.sm,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontWeight: '500',
  },
  keyTextListening: {
    fontFamily: undefined,
    fontStyle: 'italic',
  },
});
