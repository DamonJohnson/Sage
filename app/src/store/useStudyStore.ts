import { create } from 'zustand';
import type { Card, CardState, Rating, StudyStats, FSRSState } from '@sage/shared';
import { recordRating, recordSessionEnd } from '@/services/studyHistory';
import { reviewCard as reviewCardAPI, getDueCards as getDueCardsAPI } from '@/services/study';
import { useAuthStore } from './useAuthStore';
import { useDeckStore } from './useDeckStore';

interface StudySessionCard {
  card: Card;
  state: CardState;
  scheduledIntervals: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
}

interface StudySession {
  deckId: string;
  cards: StudySessionCard[];
  currentIndex: number;
  reviewed: number;
  correct: number;
  startedAt: string;
}

interface StudyState {
  currentSession: StudySession | null;
  stats: StudyStats;
  isLoading: boolean;

  // Actions
  startSession: (deckId: string, cards: Card[]) => void;
  getCurrentCard: () => StudySessionCard | null;
  rateCard: (rating: Rating) => Promise<void>;
  nextCard: () => boolean;
  endSession: () => void;
  getProgress: () => { current: number; total: number; percentage: number };
}

// Simple FSRS-like interval calculation (will be replaced with full FSRS from backend)
function calculateIntervals(state: CardState): StudySessionCard['scheduledIntervals'] {
  const baseInterval = state.scheduledDays || 1;
  const stability = state.stability || 1;

  return {
    again: 1, // 1 minute
    hard: Math.max(1, Math.round(baseInterval * 0.8 * 1440)), // in minutes
    good: Math.max(1, Math.round(baseInterval * stability * 1440)),
    easy: Math.max(1, Math.round(baseInterval * stability * 1.3 * 1440)),
  };
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr`;
  const days = Math.round(minutes / 1440);
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  if (months === 1) return '1 month';
  return `${months} months`;
}

function createInitialCardState(card: Card, userId: string): CardState {
  return {
    id: `state-${card.id}`,
    cardId: card.id,
    userId,
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    due: new Date().toISOString(),
    lastReview: null,
  };
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentSession: null,
  stats: {
    reviewedToday: 12,
    dueToday: 28,
    dueTomorrow: 15,
    streak: 7,
    totalMastered: 320,
    totalCards: 520,
    averageAccuracy: 0.85,
    studyTimeToday: 25,
  },
  isLoading: false,

  startSession: (deckId, cards) => {
    const userId = useAuthStore.getState().user?.id || 'stub-user-1';
    const sessionCards: StudySessionCard[] = cards.map((card) => {
      const state = createInitialCardState(card, userId);
      return {
        card,
        state,
        scheduledIntervals: calculateIntervals(state),
      };
    });

    set({
      currentSession: {
        deckId,
        cards: sessionCards,
        currentIndex: 0,
        reviewed: 0,
        correct: 0,
        startedAt: new Date().toISOString(),
      },
    });
  },

  getCurrentCard: () => {
    const { currentSession } = get();
    if (!currentSession) return null;
    return currentSession.cards[currentSession.currentIndex] || null;
  },

  rateCard: async (rating) => {
    const { currentSession } = get();
    if (!currentSession) return;

    const currentCard = get().getCurrentCard();
    if (!currentCard) return;

    const isCorrect = rating >= 3;
    const cardIndex = currentSession.currentIndex; // Capture the index at time of rating

    // Record rating to local persistent storage
    recordRating(rating as 1 | 2 | 3 | 4).catch(console.error);

    // Update deck's lastStudied timestamp
    useDeckStore.getState().updateDeckLastStudied(currentSession.deckId);

    // Submit review to backend for FSRS scheduling (fire and forget - don't block UI)
    reviewCardAPI({
      cardId: currentCard.card.id,
      rating: rating as 1 | 2 | 3 | 4,
      reviewTimeMs: 5000,
    }).then((response) => {
      if (response.success && response.data) {
        // Update card state with backend FSRS result using functional update
        set((state) => {
          if (!state.currentSession) return state;
          const updatedCards = state.currentSession.cards.map((c, i) =>
            i === cardIndex
              ? {
                  ...c,
                  state: {
                    ...c.state,
                    stability: response.data!.nextState?.stability || c.state.stability,
                    difficulty: response.data!.nextState?.difficulty || c.state.difficulty,
                    state: response.data!.nextState?.state || c.state.state,
                    due: response.data!.nextState?.due || c.state.due,
                    reps: (c.state.reps || 0) + 1,
                  },
                }
              : c
          );
          return {
            ...state,
            currentSession: {
              ...state.currentSession,
              cards: updatedCards,
            },
          };
        });
      }
    }).catch((error) => {
      console.error('Failed to submit review to backend:', error);
    });

    // Update local stats immediately (don't wait for API)
    set((state) => ({
      currentSession: state.currentSession ? {
        ...state.currentSession,
        reviewed: state.currentSession.reviewed + 1,
        correct: state.currentSession.correct + (isCorrect ? 1 : 0),
      } : null,
      stats: {
        ...state.stats,
        reviewedToday: state.stats.reviewedToday + 1,
        dueToday: Math.max(0, state.stats.dueToday - 1),
      },
    }));
  },

  nextCard: () => {
    const { currentSession } = get();
    if (!currentSession) return false;

    const nextIndex = currentSession.currentIndex + 1;
    if (nextIndex >= currentSession.cards.length) {
      return false; // Session complete
    }

    set({
      currentSession: {
        ...currentSession,
        currentIndex: nextIndex,
      },
    });
    return true;
  },

  endSession: () => {
    const { currentSession } = get();
    if (currentSession) {
      const sessionTimeMs = Date.now() - new Date(currentSession.startedAt).getTime();
      recordSessionEnd(sessionTimeMs).catch(console.error);
    }
    set({ currentSession: null });
  },

  getProgress: () => {
    const { currentSession } = get();
    if (!currentSession) {
      return { current: 0, total: 0, percentage: 0 };
    }
    const current = currentSession.currentIndex + 1;
    const total = currentSession.cards.length;
    return {
      current,
      total,
      percentage: total > 0 ? (current / total) * 100 : 0,
    };
  },
}));

// Helper function to format intervals for display
export function getIntervalLabel(rating: Rating, intervals: StudySessionCard['scheduledIntervals']): string {
  const minutes = {
    1: intervals.again,
    2: intervals.hard,
    3: intervals.good,
    4: intervals.easy,
  }[rating];
  return formatInterval(minutes);
}
