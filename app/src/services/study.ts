/**
 * Study Service
 *
 * Handles study sessions and FSRS-based spaced repetition with the backend.
 */

import { apiRequest, APIResponse } from './api';

// FSRS card states
export type FSRSState = 'new' | 'learning' | 'review' | 'relearning';

// Rating options matching FSRS
export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface FSRSCardState {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  due: string;
  lastReview?: string;
}

export interface DueCard {
  id: string;
  deckId: string;
  deckTitle: string;
  front: string;
  back: string;
  cardType: 'flashcard' | 'multiple_choice';
  options?: string[];
  correctAnswer?: number;
  state: FSRSCardState;
  // Scheduling options for the UI
  schedulingInfo?: {
    again: { interval: string; dueDate: string };
    hard: { interval: string; dueDate: string };
    good: { interval: string; dueDate: string };
    easy: { interval: string; dueDate: string };
  };
}

export interface GetDueCardsParams {
  deckId?: string;
  limit?: number;
}

export interface GetDueCardsResponse {
  cards: DueCard[];
  totalDue: number;
  newCount: number;
  reviewCount: number;
}

export interface ReviewCardParams {
  cardId: string;
  rating: Rating;
  reviewTimeMs?: number;
}

export interface ReviewCardResponse {
  nextState: FSRSCardState;
  nextCard?: DueCard;
  remainingDue: number;
}

export interface StudyStats {
  today: {
    cardsStudied: number;
    cardsCorrect: number;
    timeSpentMs: number;
    newCardsLearned: number;
  };
  allTime: {
    totalReviews: number;
    totalCorrect: number;
    averageAccuracy: number;
    streakCurrent: number;
    streakLongest: number;
  };
  upcomingDue: {
    today: number;
    tomorrow: number;
    thisWeek: number;
  };
}

export interface StartSessionParams {
  deckId: string;
}

export interface StartSessionResponse {
  sessionId: string;
  cards: DueCard[];
  totalDue: number;
}

export interface EndSessionParams {
  sessionId: string;
  cardsStudied: number;
  cardsCorrect: number;
  timeSpentMs: number;
}

/**
 * Get cards due for review
 */
export async function getDueCards(
  params?: GetDueCardsParams
): Promise<APIResponse<GetDueCardsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.deckId) queryParams.set('deckId', params.deckId);
  if (params?.limit) queryParams.set('limit', params.limit.toString());

  const query = queryParams.toString();
  const url = `/api/study/due${query ? `?${query}` : ''}`;

  return apiRequest<GetDueCardsResponse>('GET', url);
}

/**
 * Submit a review for a card
 */
export async function reviewCard(
  params: ReviewCardParams
): Promise<APIResponse<ReviewCardResponse>> {
  return apiRequest<ReviewCardResponse>('POST', '/api/study/review', {
    cardId: params.cardId,
    rating: params.rating,
    reviewTimeMs: params.reviewTimeMs,
  });
}

/**
 * Get study statistics
 */
export async function getStudyStats(): Promise<APIResponse<StudyStats>> {
  return apiRequest<StudyStats>('GET', '/api/study/stats');
}

/**
 * Start a study session
 */
export async function startStudySession(
  params: StartSessionParams
): Promise<APIResponse<StartSessionResponse>> {
  return apiRequest<StartSessionResponse>('POST', '/api/study/session/start', {
    deckId: params.deckId,
  });
}

/**
 * End a study session
 */
export async function endStudySession(
  params: EndSessionParams
): Promise<APIResponse<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>('POST', '/api/study/session/end', params);
}

/**
 * Format interval for display (e.g., "1d", "2h", "10m")
 */
export function formatInterval(days: number): string {
  if (days < 1 / 24) {
    // Less than an hour
    const minutes = Math.round(days * 24 * 60);
    return `${minutes}m`;
  }
  if (days < 1) {
    // Less than a day
    const hours = Math.round(days * 24);
    return `${hours}h`;
  }
  if (days < 30) {
    return `${Math.round(days)}d`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months}mo`;
  }
  const years = (days / 365).toFixed(1);
  return `${years}y`;
}

/**
 * Get rating label
 */
export function getRatingLabel(rating: Rating): string {
  switch (rating) {
    case 1:
      return 'Again';
    case 2:
      return 'Hard';
    case 3:
      return 'Good';
    case 4:
      return 'Easy';
    default:
      return 'Unknown';
  }
}

/**
 * Get rating color
 */
export function getRatingColor(rating: Rating): string {
  switch (rating) {
    case 1:
      return '#EF4444'; // Red
    case 2:
      return '#F59E0B'; // Amber
    case 3:
      return '#10B981'; // Green
    case 4:
      return '#3B82F6'; // Blue
    default:
      return '#6B7280'; // Gray
  }
}
