// List of inappropriate words/phrases to filter
const BANNED_WORDS = [
  // Profanity
  'damn', 'hell', 'crap', 'ass', 'bastard',
  // Slurs and hate speech (abbreviated patterns)
  'idiot', 'stupid', 'dumb', 'moron', 'loser',
  // Harassment patterns
  'hate', 'suck', 'worst', 'terrible', 'garbage', 'trash',
  // Personal attacks
  'ugly', 'fat', 'pathetic', 'useless',
];

// Additional phrases that indicate rude/inappropriate content
const RUDE_PHRASES = [
  'waste of time',
  'complete garbage',
  'total crap',
  'you suck',
  'this sucks',
  'hate this',
  'so bad',
  'piece of',
  'shut up',
  'get lost',
];

export interface ModerationResult {
  isApproved: boolean;
  reason?: string;
  flaggedWords?: string[];
}

/**
 * Check if content contains inappropriate or rude language
 */
export function moderateContent(content: string): ModerationResult {
  if (!content || content.trim().length === 0) {
    return {
      isApproved: false,
      reason: 'Content cannot be empty',
    };
  }

  const lowerContent = content.toLowerCase();
  const flaggedWords: string[] = [];

  // Check for banned words
  for (const word of BANNED_WORDS) {
    // Use word boundary check to avoid false positives
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerContent)) {
      flaggedWords.push(word);
    }
  }

  // Check for rude phrases
  for (const phrase of RUDE_PHRASES) {
    if (lowerContent.includes(phrase)) {
      flaggedWords.push(phrase);
    }
  }

  if (flaggedWords.length > 0) {
    return {
      isApproved: false,
      reason: 'Your comment contains inappropriate language. Please keep it respectful.',
      flaggedWords,
    };
  }

  // Check for excessive caps (yelling)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (content.length > 10 && capsRatio > 0.7) {
    return {
      isApproved: false,
      reason: 'Please avoid using excessive capital letters.',
    };
  }

  // Check for spam patterns (repeated characters)
  if (/(.)\1{4,}/.test(content)) {
    return {
      isApproved: false,
      reason: 'Your comment appears to contain spam. Please write a genuine review.',
    };
  }

  return {
    isApproved: true,
  };
}

/**
 * Sanitize content by removing potential harmful characters
 */
export function sanitizeContent(content: string): string {
  return content
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML injection
    .slice(0, 500); // Limit length
}
