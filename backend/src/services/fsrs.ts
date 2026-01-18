/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm Implementation
 * Based on: https://github.com/open-spaced-repetition/fsrs4anki
 *
 * This is a simplified implementation of FSRS v4 for the Sage flashcard app.
 */

export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
export type State = 'new' | 'learning' | 'review' | 'relearning';

export interface CardState {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: State;
  due: Date;
  lastReview: Date | null;
}

export interface ReviewLog {
  rating: Rating;
  state: State;
  elapsedDays: number;
  scheduledDays: number;
  reviewTimeMs: number;
  reviewedAt: Date;
}

export interface SchedulingResult {
  again: { due: Date; scheduledDays: number; state: State };
  hard: { due: Date; scheduledDays: number; state: State };
  good: { due: Date; scheduledDays: number; state: State };
  easy: { due: Date; scheduledDays: number; state: State };
}

// FSRS Parameters (default values from FSRS v4)
const DEFAULT_PARAMS = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  w: [
    0.4, 0.6, 2.4, 5.8,     // Initial stability for Again, Hard, Good, Easy
    4.93, 0.94, 0.86, 0.01, // Difficulty parameters
    1.49, 0.14, 0.94,       // Stability parameters
    2.18, 0.05, 0.34,       // Recall parameters
    1.26, 0.29, 2.61        // Forgetting parameters
  ],
};

export class FSRS {
  private params: typeof DEFAULT_PARAMS;

  constructor(params?: Partial<typeof DEFAULT_PARAMS>) {
    this.params = { ...DEFAULT_PARAMS, ...params };
  }

  /**
   * Create initial card state for a new card
   */
  createNewCard(): CardState {
    return {
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 'new',
      due: new Date(),
      lastReview: null,
    };
  }

  /**
   * Calculate scheduling options for a card
   */
  schedule(card: CardState, now: Date = new Date()): SchedulingResult {
    if (card.state === 'new') {
      return this.scheduleNew(now);
    }

    const elapsedDays = card.lastReview
      ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    return this.scheduleReview(card, elapsedDays, now);
  }

  /**
   * Review a card with a given rating
   */
  review(card: CardState, rating: Rating, now: Date = new Date()): CardState {
    const elapsedDays = card.lastReview
      ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    let newCard: CardState;

    if (card.state === 'new') {
      newCard = this.reviewNew(card, rating, now);
    } else if (card.state === 'learning' || card.state === 'relearning') {
      newCard = this.reviewLearning(card, rating, elapsedDays, now);
    } else {
      newCard = this.reviewReview(card, rating, elapsedDays, now);
    }

    return newCard;
  }

  private scheduleNew(now: Date): SchedulingResult {
    const w = this.params.w;
    return {
      again: {
        due: this.addMinutes(now, 1),
        scheduledDays: 0,
        state: 'learning',
      },
      hard: {
        due: this.addMinutes(now, 5),
        scheduledDays: 0,
        state: 'learning',
      },
      good: {
        due: this.addMinutes(now, 10),
        scheduledDays: 0,
        state: 'learning',
      },
      easy: {
        due: this.addDays(now, w[3]),
        scheduledDays: w[3],
        state: 'review',
      },
    };
  }

  private scheduleReview(card: CardState, elapsedDays: number, now: Date): SchedulingResult {
    const s = card.stability;
    const d = card.difficulty;
    const r = this.params.requestRetention;

    // Calculate new intervals based on FSRS formula
    const intervalAgain = 1;
    const intervalHard = Math.max(1, Math.round(s * 0.8));
    const intervalGood = Math.max(intervalHard + 1, Math.round(s * (1 / r) ** (1 / 3)));
    const intervalEasy = Math.max(intervalGood + 1, Math.round(s * 1.3 * (1 / r) ** (1 / 3)));

    return {
      again: {
        due: this.addMinutes(now, 1),
        scheduledDays: 0,
        state: 'relearning',
      },
      hard: {
        due: this.addDays(now, intervalHard),
        scheduledDays: intervalHard,
        state: 'review',
      },
      good: {
        due: this.addDays(now, intervalGood),
        scheduledDays: intervalGood,
        state: 'review',
      },
      easy: {
        due: this.addDays(now, Math.min(intervalEasy, this.params.maximumInterval)),
        scheduledDays: Math.min(intervalEasy, this.params.maximumInterval),
        state: 'review',
      },
    };
  }

  private reviewNew(card: CardState, rating: Rating, now: Date): CardState {
    const w = this.params.w;
    const initialStability = w[rating - 1];
    const initialDifficulty = this.calculateInitialDifficulty(rating);

    const schedule = this.scheduleNew(now);
    const result = schedule[this.ratingToKey(rating)];

    return {
      stability: initialStability,
      difficulty: initialDifficulty,
      elapsedDays: 0,
      scheduledDays: result.scheduledDays,
      reps: 1,
      lapses: rating === 1 ? 1 : 0,
      state: result.state,
      due: result.due,
      lastReview: now,
    };
  }

  private reviewLearning(card: CardState, rating: Rating, elapsedDays: number, now: Date): CardState {
    const w = this.params.w;

    if (rating === 1) {
      // Again - stay in learning
      return {
        ...card,
        lapses: card.lapses + 1,
        due: this.addMinutes(now, 1),
        scheduledDays: 0,
        lastReview: now,
      };
    } else if (rating === 2) {
      // Hard - stay in learning longer
      return {
        ...card,
        due: this.addMinutes(now, 5),
        scheduledDays: 0,
        reps: card.reps + 1,
        lastReview: now,
      };
    } else if (rating === 3) {
      // Good - graduate to review
      const stability = this.calculateStabilityAfterSuccess(card, rating, elapsedDays);
      const scheduledDays = Math.max(1, Math.round(stability));
      return {
        ...card,
        stability,
        difficulty: this.updateDifficulty(card.difficulty, rating),
        due: this.addDays(now, scheduledDays),
        scheduledDays,
        reps: card.reps + 1,
        state: 'review',
        lastReview: now,
      };
    } else {
      // Easy - graduate with bonus
      const stability = this.calculateStabilityAfterSuccess(card, rating, elapsedDays) * 1.3;
      const scheduledDays = Math.max(1, Math.round(stability));
      return {
        ...card,
        stability,
        difficulty: this.updateDifficulty(card.difficulty, rating),
        due: this.addDays(now, scheduledDays),
        scheduledDays,
        reps: card.reps + 1,
        state: 'review',
        lastReview: now,
      };
    }
  }

  private reviewReview(card: CardState, rating: Rating, elapsedDays: number, now: Date): CardState {
    if (rating === 1) {
      // Forgot - go to relearning
      return {
        ...card,
        stability: Math.max(0.1, card.stability * 0.2), // Reduce stability
        lapses: card.lapses + 1,
        due: this.addMinutes(now, 1),
        scheduledDays: 0,
        state: 'relearning',
        lastReview: now,
      };
    }

    const newStability = this.calculateStabilityAfterSuccess(card, rating, elapsedDays);
    const schedule = this.scheduleReview(
      { ...card, stability: newStability },
      elapsedDays,
      now
    );
    const result = schedule[this.ratingToKey(rating)];

    return {
      ...card,
      stability: newStability,
      difficulty: this.updateDifficulty(card.difficulty, rating),
      elapsedDays,
      scheduledDays: result.scheduledDays,
      reps: card.reps + 1,
      state: result.state,
      due: result.due,
      lastReview: now,
    };
  }

  private calculateInitialDifficulty(rating: Rating): number {
    const w = this.params.w;
    // D0 = w[4] - (rating - 3) * w[5]
    return Math.max(1, Math.min(10, w[4] - (rating - 3) * w[5]));
  }

  private updateDifficulty(d: number, rating: Rating): number {
    const w = this.params.w;
    // D' = D - w[6] * (rating - 3)
    const newD = d - w[6] * (rating - 3);
    return Math.max(1, Math.min(10, newD));
  }

  private calculateStabilityAfterSuccess(card: CardState, rating: Rating, elapsedDays: number): number {
    const w = this.params.w;
    const s = card.stability || 1;
    const d = card.difficulty || 5;
    const r = this.calculateRetrievability(s, elapsedDays);

    // Simplified stability increase formula
    const hardPenalty = rating === 2 ? w[15] : 1;
    const easyBonus = rating === 4 ? w[16] : 1;

    const newStability = s * (1 + Math.exp(w[8]) *
      (11 - d) *
      Math.pow(s, -w[9]) *
      (Math.exp((1 - r) * w[10]) - 1) *
      hardPenalty *
      easyBonus);

    return Math.max(0.1, Math.min(this.params.maximumInterval, newStability));
  }

  private calculateRetrievability(stability: number, elapsedDays: number): number {
    if (stability === 0) return 0;
    return Math.pow(1 + elapsedDays / (9 * stability), -1);
  }

  private ratingToKey(rating: Rating): 'again' | 'hard' | 'good' | 'easy' {
    const map: Record<Rating, 'again' | 'hard' | 'good' | 'easy'> = {
      1: 'again',
      2: 'hard',
      3: 'good',
      4: 'easy',
    };
    return map[rating];
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }
}

// Export singleton instance
export const fsrs = new FSRS();
