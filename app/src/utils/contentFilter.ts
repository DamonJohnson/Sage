/**
 * Simple content filter for user-generated text
 * Checks for inappropriate words and validates content
 */

// Common inappropriate words (kept minimal, extend as needed)
const BLOCKED_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'piss',
  'dick', 'cock', 'pussy', 'cunt', 'bastard', 'slut', 'whore',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
];

// Patterns that try to evade the filter (l33t speak, etc.)
const EVASION_PATTERNS: [RegExp, string][] = [
  [/f+[u\*@0]+c+k+/gi, 'fuck'],
  [/s+h+[i1!]+t+/gi, 'shit'],
  [/b+[i1!]+t+c+h+/gi, 'bitch'],
  [/a+[s\$]+[s\$]+/gi, 'ass'],
];

/**
 * Check if text contains inappropriate content
 * @param text - The text to check
 * @returns Object with isValid boolean and optional reason
 */
export function validateContent(text: string): { isValid: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { isValid: true };
  }

  const lowerText = text.toLowerCase();

  // Check for blocked words
  for (const word of BLOCKED_WORDS) {
    // Check for word boundaries to avoid false positives (e.g., "class" containing "ass")
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      return {
        isValid: false,
        reason: 'Please use appropriate language',
      };
    }
  }

  // Check for evasion patterns
  for (const [pattern] of EVASION_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        reason: 'Please use appropriate language',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate a category name
 * @param category - The category name to validate
 * @returns Object with isValid boolean and optional reason
 */
export function validateCategory(category: string): { isValid: boolean; reason?: string } {
  if (!category || typeof category !== 'string') {
    return { isValid: false, reason: 'Category cannot be empty' };
  }

  const trimmed = category.trim();

  if (trimmed.length < 2) {
    return { isValid: false, reason: 'Category must be at least 2 characters' };
  }

  if (trimmed.length > 30) {
    return { isValid: false, reason: 'Category must be 30 characters or less' };
  }

  // Check for inappropriate content
  const contentCheck = validateContent(trimmed);
  if (!contentCheck.isValid) {
    return contentCheck;
  }

  // Only allow letters, numbers, spaces, and common punctuation
  if (!/^[a-zA-Z0-9\s\-&]+$/.test(trimmed)) {
    return { isValid: false, reason: 'Category can only contain letters, numbers, spaces, and hyphens' };
  }

  return { isValid: true };
}
