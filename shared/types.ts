// ============================================
// SAGE SHARED TYPES
// ============================================

// --------------------------------------------
// User Types
// --------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  oauthProvider: 'google' | 'apple' | 'email' | null;
  streakCurrent: number;
  streakLongest: number;
  lastStudyDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  hapticFeedback: boolean;
  soundEffects: boolean;
  dailyGoal: number;
  notificationsEnabled: boolean;
  reminderTime: string; // HH:mm format
  // Privacy settings
  activityPublic: boolean; // Whether to show study activity to others
  profilePublic: boolean; // Whether profile is discoverable
  // FSRS Settings
  fsrs: FSRSSettings;
  // Web-only: Keyboard shortcuts settings
  keyboardShortcuts?: KeyboardShortcutsSettings;
}

export interface KeyboardShortcutsSettings {
  enabled: boolean; // Master toggle for keyboard shortcuts
  showHints: boolean; // Show hotkey hints on buttons
  bindings: KeyboardBindings;
}

export interface KeyboardBindings {
  flipCard: string; // Default: 'Space' or 'Enter'
  rateAgain: string; // Default: '1'
  rateHard: string; // Default: '2'
  rateGood: string; // Default: '3'
  rateEasy: string; // Default: '4'
  closeStudy: string; // Default: 'Escape'
  mcOption1: string; // Default: '1'
  mcOption2: string; // Default: '2'
  mcOption3: string; // Default: '3'
  mcOption4: string; // Default: '4'
  mcSubmit: string; // Default: 'Enter'
}

export interface FSRSSettings {
  requestRetention: number; // Target retention rate (0.7 - 0.97)
  maximumInterval: number; // Max days between reviews (1 - 36500)
  newCardsPerDay: number; // New cards to introduce daily (0 - 9999)
  reviewsPerDay: number; // Review cards per day (0 = unlimited)
  learningSteps: number[]; // Learning phase intervals in minutes
  graduatingInterval: number; // First interval after learning phase (days)
  easyInterval: number; // Interval when pressing "Easy" on learning card (days)
}

// --------------------------------------------
// Social Types
// --------------------------------------------

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  streakCurrent: number;
  streakLongest: number;
  totalCardsStudied: number;
  totalDecksCreated: number;
  joinedAt: string;
  isFollowing: boolean;
  isFollower: boolean;
  activityPublic: boolean;
  followerCount?: number;
  followingCount?: number;
}

export interface FollowRelation {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  type: 'study_session' | 'deck_created' | 'deck_shared' | 'streak_milestone';
  deckId?: string;
  deckTitle?: string;
  cardsStudied?: number;
  studyTimeMinutes?: number;
  streakDays?: number;
  createdAt: string;
}

// --------------------------------------------
// Deck Types
// --------------------------------------------

export interface Deck {
  id: string;
  userId: string;
  title: string;
  description: string;
  isPublic: boolean;
  category: string | null;
  tags: string[];
  cardCount: number;
  downloadCount: number;
  ratingSum: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  // Author tracking for cloned decks
  originalAuthorId: string | null; // If cloned from another user's public deck
  originalAuthorName: string | null;
  originalAuthorAvatar: string | null;
  originalDeckId: string | null; // Reference to the original deck
}

export interface DeckWithStats extends Deck {
  masteredCount: number;
  learningCount: number;
  newCount: number;
  dueCount: number;
  lastStudied: string | null;
  nextReview: string | null;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'mastered';
}

export interface PublicDeck extends Deck {
  authorName: string;
  authorAvatar: string | null;
  averageRating: number;
}

// --------------------------------------------
// Card Types
// --------------------------------------------

export type CardType = 'flashcard' | 'multiple_choice';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  frontImage: string | null; // URL of image for front of card
  backImage: string | null; // URL of image for back of card
  cardType: CardType;
  options: string[] | null; // For multiple choice
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CardWithState extends Card {
  state: CardState;
}

// --------------------------------------------
// FSRS Types (Spaced Repetition)
// --------------------------------------------

export type FSRSState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export const RatingLabels: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

export interface CardState {
  id: string;
  cardId: string;
  userId: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  due: string;
  lastReview: string | null;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  userId: string;
  rating: Rating;
  state: FSRSState;
  elapsedDays: number;
  scheduledDays: number;
  reviewTimeMs: number;
  createdAt: string;
}

export interface SchedulingResult {
  card: CardState;
  nextStates: {
    again: { due: string; scheduledDays: number };
    hard: { due: string; scheduledDays: number };
    good: { due: string; scheduledDays: number };
    easy: { due: string; scheduledDays: number };
  };
}

// --------------------------------------------
// Study Session Types
// --------------------------------------------

export interface StudySession {
  id: string;
  deckId: string;
  userId: string;
  cardsStudied: number;
  cardsCorrect: number;
  timeSpentMs: number;
  startedAt: string;
  completedAt: string | null;
}

export interface StudyStats {
  reviewedToday: number;
  dueToday: number;
  dueTomorrow: number;
  streak: number;
  totalMastered: number;
  totalCards: number;
  averageAccuracy: number;
  studyTimeToday: number; // in minutes
}

// --------------------------------------------
// API Types
// --------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// --------------------------------------------
// AI Generation Types
// --------------------------------------------

export interface GenerateFromTopicRequest {
  topic: string;
  count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface GenerateFromTextRequest {
  text: string;
  count: number;
}

export interface GeneratedCard {
  front: string;
  back: string;
  cardType: CardType;
  options?: string[];
}

// --------------------------------------------
// Sync Types
// --------------------------------------------

export type ChangeType = 'create' | 'update' | 'delete';

export interface SyncChange {
  table: 'decks' | 'cards' | 'card_states' | 'review_logs';
  type: ChangeType;
  id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface SyncPushRequest {
  changes: SyncChange[];
  lastSyncAt: string;
}

export interface SyncPullResponse {
  changes: SyncChange[];
  serverTime: string;
  conflicts: SyncChange[];
}

// --------------------------------------------
// Constants
// --------------------------------------------

export const CATEGORIES = [
  'Languages',
  'Science',
  'Mathematics',
  'History',
  'Geography',
  'Arts',
  'Technology',
  'Business',
  'Medicine',
  'Law',
  'Music',
  'Literature',
  'Philosophy',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const MASTERY_THRESHOLDS = {
  beginner: 0.3,
  intermediate: 0.7,
  mastered: 1.0,
} as const;
