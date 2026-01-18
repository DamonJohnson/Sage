import { Router, Request, Response } from 'express';
import { db } from '../../db/index.js';
import { fsrs, type Rating } from '../../services/fsrs.js';
import { v4 as uuid } from 'uuid';
import { optionalAuth, getUserId } from '../../middleware/auth.js';

const router = Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// GET /api/study/due - Get cards due for review
router.get('/due', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const limit = parseInt(req.query.limit as string) || 20;
  const deckId = req.query.deckId as string;

  try {
    let query = `
      SELECT c.*, cs.state, cs.due, cs.stability, cs.difficulty, cs.reps, cs.lapses,
             d.title as deck_title
      FROM cards c
      JOIN decks d ON c.deck_id = d.id
      LEFT JOIN card_states cs ON c.id = cs.card_id AND cs.user_id = ?
      WHERE d.user_id = ?
        AND (cs.due IS NULL OR cs.due <= datetime('now'))
    `;

    const params: any[] = [userId, userId];

    if (deckId) {
      query += ' AND c.deck_id = ?';
      params.push(deckId);
    }

    query += ` ORDER BY
      CASE WHEN cs.state IS NULL THEN 0 ELSE 1 END,
      cs.due ASC
      LIMIT ?`;
    params.push(limit);

    const cards = db.prepare(query).all(...params);

    // For each card, calculate scheduling options
    const cardsWithSchedule = cards.map((card: any) => {
      const cardState = card.state ? {
        stability: card.stability || 1,
        difficulty: card.difficulty || 5,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: card.reps || 0,
        lapses: card.lapses || 0,
        state: card.state,
        due: new Date(card.due || Date.now()),
        lastReview: null,
      } : fsrs.createNewCard();

      const schedule = fsrs.schedule(cardState);

      return {
        ...card,
        schedule: {
          again: { interval: formatInterval(schedule.again.scheduledDays) },
          hard: { interval: formatInterval(schedule.hard.scheduledDays) },
          good: { interval: formatInterval(schedule.good.scheduledDays) },
          easy: { interval: formatInterval(schedule.easy.scheduledDays) },
        },
      };
    });

    res.json({
      success: true,
      data: {
        cards: cardsWithSchedule,
        count: cardsWithSchedule.length,
      },
    });
  } catch (error) {
    console.error('Error fetching due cards:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch due cards' });
  }
});

// POST /api/study/review - Submit a review
router.post('/review', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { cardId, rating, reviewTimeMs } = req.body;

  if (!cardId || !rating || ![1, 2, 3, 4].includes(rating)) {
    return res.status(400).json({ success: false, error: 'Invalid cardId or rating' });
  }

  try {
    // Get current card state
    let cardState = db.prepare(`
      SELECT * FROM card_states WHERE card_id = ? AND user_id = ?
    `).get(cardId, userId) as any;

    const now = new Date();
    let fsrsState;

    if (!cardState) {
      // New card - create initial state
      fsrsState = fsrs.createNewCard();
    } else {
      fsrsState = {
        stability: cardState.stability,
        difficulty: cardState.difficulty,
        elapsedDays: cardState.elapsed_days,
        scheduledDays: cardState.scheduled_days,
        reps: cardState.reps,
        lapses: cardState.lapses,
        state: cardState.state,
        due: new Date(cardState.due),
        lastReview: cardState.last_review ? new Date(cardState.last_review) : null,
      };
    }

    // Apply review
    const newState = fsrs.review(fsrsState, rating as Rating, now);

    // Upsert card state
    db.prepare(`
      INSERT INTO card_states (id, card_id, user_id, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, due, last_review, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(card_id, user_id) DO UPDATE SET
        stability = excluded.stability,
        difficulty = excluded.difficulty,
        elapsed_days = excluded.elapsed_days,
        scheduled_days = excluded.scheduled_days,
        reps = excluded.reps,
        lapses = excluded.lapses,
        state = excluded.state,
        due = excluded.due,
        last_review = excluded.last_review,
        updated_at = datetime('now')
    `).run(
      uuid(),
      cardId,
      userId,
      newState.stability,
      newState.difficulty,
      newState.elapsedDays,
      newState.scheduledDays,
      newState.reps,
      newState.lapses,
      newState.state,
      newState.due.toISOString(),
      now.toISOString()
    );

    // Log the review
    db.prepare(`
      INSERT INTO review_logs (id, card_id, user_id, rating, state, elapsed_days, scheduled_days, review_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid(),
      cardId,
      userId,
      rating,
      fsrsState.state,
      fsrsState.elapsedDays,
      newState.scheduledDays,
      reviewTimeMs || 0
    );

    res.json({
      success: true,
      data: {
        cardState: newState,
        nextDue: newState.due.toISOString(),
        interval: formatInterval(newState.scheduledDays),
      },
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ success: false, error: 'Failed to submit review' });
  }
});

// GET /api/study/stats - Get study statistics
router.get('/stats', (req: Request, res: Response) => {
  const userId = getUserId(req);

  try {
    const today = new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM review_logs WHERE user_id = ? AND date(created_at) = ?) as reviewed_today,
        (SELECT COUNT(*) FROM card_states cs
         JOIN cards c ON cs.card_id = c.id
         JOIN decks d ON c.deck_id = d.id
         WHERE cs.user_id = ? AND d.user_id = ? AND cs.due <= datetime('now')) as due_today,
        (SELECT COUNT(*) FROM card_states cs
         JOIN cards c ON cs.card_id = c.id
         JOIN decks d ON c.deck_id = d.id
         WHERE cs.user_id = ? AND d.user_id = ?
         AND date(cs.due) = date('now', '+1 day')) as due_tomorrow,
        (SELECT streak_current FROM users WHERE id = ?) as streak
    `).get(userId, today, userId, userId, userId, userId, userId) as any;

    const cardStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN cs.state = 'review' AND cs.stability > 21 THEN 1 ELSE 0 END) as mastered,
        SUM(CASE WHEN cs.state IN ('learning', 'relearning', 'review') AND (cs.stability IS NULL OR cs.stability <= 21) THEN 1 ELSE 0 END) as learning
      FROM cards c
      JOIN decks d ON c.deck_id = d.id
      LEFT JOIN card_states cs ON c.id = cs.card_id AND cs.user_id = ?
      WHERE d.user_id = ?
    `).get(userId, userId) as any;

    res.json({
      success: true,
      data: {
        reviewedToday: stats.reviewed_today || 0,
        dueToday: stats.due_today || 0,
        dueTomorrow: stats.due_tomorrow || 0,
        streak: stats.streak || 0,
        totalCards: cardStats.total || 0,
        totalMastered: cardStats.mastered || 0,
        totalLearning: cardStats.learning || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// POST /api/study/history/sync - Sync study history from client
router.post('/history/sync', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { localHistory, lastSynced } = req.body;

  if (!localHistory || !localHistory.dailyRecords) {
    return res.status(400).json({ success: false, error: 'Invalid history data' });
  }

  try {
    const transaction = db.transaction(() => {
      // Upsert each daily record
      const upsertStmt = db.prepare(`
        INSERT INTO daily_study_records (id, user_id, date, cards_studied, study_time_ms, ratings_again, ratings_hard, ratings_good, ratings_easy, sessions, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, date) DO UPDATE SET
          cards_studied = MAX(daily_study_records.cards_studied, excluded.cards_studied),
          study_time_ms = MAX(daily_study_records.study_time_ms, excluded.study_time_ms),
          ratings_again = MAX(daily_study_records.ratings_again, excluded.ratings_again),
          ratings_hard = MAX(daily_study_records.ratings_hard, excluded.ratings_hard),
          ratings_good = MAX(daily_study_records.ratings_good, excluded.ratings_good),
          ratings_easy = MAX(daily_study_records.ratings_easy, excluded.ratings_easy),
          sessions = MAX(daily_study_records.sessions, excluded.sessions),
          updated_at = datetime('now')
      `);

      for (const [date, record] of Object.entries(localHistory.dailyRecords)) {
        const r = record as any;
        upsertStmt.run(
          uuid(),
          userId,
          date,
          r.cardsStudied || 0,
          r.studyTimeMs || 0,
          r.ratings?.again || 0,
          r.ratings?.hard || 0,
          r.ratings?.good || 0,
          r.ratings?.easy || 0,
          r.sessions || 0
        );
      }

      // Update user streak from overall stats
      if (localHistory.overallStats) {
        db.prepare(`
          UPDATE users SET
            streak_current = MAX(streak_current, ?),
            streak_longest = MAX(streak_longest, ?),
            last_study_date = COALESCE(?, last_study_date),
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          localHistory.overallStats.streakCurrent || 0,
          localHistory.overallStats.streakLongest || 0,
          localHistory.overallStats.lastStudyDate,
          userId
        );
      }
    });

    transaction();

    // Fetch merged data to return to client
    const serverRecords = db.prepare(`
      SELECT date, cards_studied, study_time_ms, ratings_again, ratings_hard, ratings_good, ratings_easy, sessions
      FROM daily_study_records
      WHERE user_id = ?
      ORDER BY date DESC
    `).all(userId) as any[];

    const user = db.prepare(`
      SELECT streak_current, streak_longest, last_study_date
      FROM users WHERE id = ?
    `).get(userId) as any;

    // Convert to client format
    const dailyRecords: Record<string, any> = {};
    let totalCardsStudied = 0;
    let totalStudyTimeMs = 0;
    const totalRatings = { again: 0, hard: 0, good: 0, easy: 0 };

    for (const r of serverRecords) {
      dailyRecords[r.date] = {
        date: r.date,
        cardsStudied: r.cards_studied,
        studyTimeMs: r.study_time_ms,
        ratings: {
          again: r.ratings_again,
          hard: r.ratings_hard,
          good: r.ratings_good,
          easy: r.ratings_easy,
        },
        sessions: r.sessions,
      };
      totalCardsStudied += r.cards_studied;
      totalStudyTimeMs += r.study_time_ms;
      totalRatings.again += r.ratings_again;
      totalRatings.hard += r.ratings_hard;
      totalRatings.good += r.ratings_good;
      totalRatings.easy += r.ratings_easy;
    }

    const firstDate = serverRecords.length > 0 ? serverRecords[serverRecords.length - 1].date : null;
    const lastDate = serverRecords.length > 0 ? serverRecords[0].date : null;

    res.json({
      success: true,
      data: {
        dailyRecords,
        overallStats: {
          totalCardsStudied,
          totalStudyTimeMs,
          totalRatings,
          streakCurrent: user?.streak_current || 0,
          streakLongest: user?.streak_longest || 0,
          lastStudyDate: user?.last_study_date || lastDate,
          firstStudyDate: firstDate,
        },
        lastSynced: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error syncing study history:', error);
    res.status(500).json({ success: false, error: 'Failed to sync study history' });
  }
});

// GET /api/study/history - Get study history
router.get('/history', (req: Request, res: Response) => {
  const userId = getUserId(req);

  try {
    const serverRecords = db.prepare(`
      SELECT date, cards_studied, study_time_ms, ratings_again, ratings_hard, ratings_good, ratings_easy, sessions
      FROM daily_study_records
      WHERE user_id = ?
      ORDER BY date DESC
    `).all(userId) as any[];

    const user = db.prepare(`
      SELECT streak_current, streak_longest, last_study_date, created_at
      FROM users WHERE id = ?
    `).get(userId) as any;

    // Convert to client format
    const dailyRecords: Record<string, any> = {};
    let totalCardsStudied = 0;
    let totalStudyTimeMs = 0;
    const totalRatings = { again: 0, hard: 0, good: 0, easy: 0 };

    for (const r of serverRecords) {
      dailyRecords[r.date] = {
        date: r.date,
        cardsStudied: r.cards_studied,
        studyTimeMs: r.study_time_ms,
        ratings: {
          again: r.ratings_again,
          hard: r.ratings_hard,
          good: r.ratings_good,
          easy: r.ratings_easy,
        },
        sessions: r.sessions,
      };
      totalCardsStudied += r.cards_studied;
      totalStudyTimeMs += r.study_time_ms;
      totalRatings.again += r.ratings_again;
      totalRatings.hard += r.ratings_hard;
      totalRatings.good += r.ratings_good;
      totalRatings.easy += r.ratings_easy;
    }

    const firstDate = serverRecords.length > 0 ? serverRecords[serverRecords.length - 1].date : null;
    const lastDate = serverRecords.length > 0 ? serverRecords[0].date : null;

    res.json({
      success: true,
      data: {
        dailyRecords,
        overallStats: {
          totalCardsStudied,
          totalStudyTimeMs,
          totalRatings,
          streakCurrent: user?.streak_current || 0,
          streakLongest: user?.streak_longest || 0,
          lastStudyDate: user?.last_study_date || lastDate,
          firstStudyDate: firstDate,
        },
        lastSynced: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching study history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch study history' });
  }
});

// POST /api/study/session/start - Start a study session
router.post('/session/start', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckId } = req.body;

  if (!deckId) {
    return res.status(400).json({ success: false, error: 'Deck ID is required' });
  }

  try {
    // Verify deck exists and belongs to user
    const deck = db.prepare(`
      SELECT id, title FROM decks WHERE id = ? AND user_id = ?
    `).get(deckId, userId) as any;

    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    // Create a new session
    const sessionId = uuid();
    db.prepare(`
      INSERT INTO study_sessions (id, deck_id, user_id, started_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(sessionId, deckId, userId);

    // Get due cards for this deck
    const cards = db.prepare(`
      SELECT c.*, cs.state, cs.due, cs.stability, cs.difficulty, cs.reps, cs.lapses
      FROM cards c
      LEFT JOIN card_states cs ON c.id = cs.card_id AND cs.user_id = ?
      WHERE c.deck_id = ?
        AND (cs.due IS NULL OR cs.due <= datetime('now'))
      ORDER BY
        CASE WHEN cs.state IS NULL THEN 0 ELSE 1 END,
        cs.due ASC
      LIMIT 20
    `).all(userId, deckId);

    res.json({
      success: true,
      data: {
        sessionId,
        cards,
        totalDue: cards.length,
      },
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ success: false, error: 'Failed to start session' });
  }
});

// POST /api/study/session/end - End a study session
router.post('/session/end', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { sessionId, cardsStudied, cardsCorrect, timeSpentMs } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID is required' });
  }

  try {
    // Update the session
    const result = db.prepare(`
      UPDATE study_sessions
      SET cards_studied = ?,
          cards_correct = ?,
          time_spent_ms = ?,
          completed_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(cardsStudied || 0, cardsCorrect || 0, timeSpentMs || 0, sessionId, userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Update user streak
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE users
      SET last_study_date = ?,
          streak_current = CASE
            WHEN date(last_study_date) = date('now', '-1 day') OR last_study_date IS NULL
            THEN streak_current + 1
            WHEN date(last_study_date) = date('now')
            THEN streak_current
            ELSE 1
          END,
          streak_longest = MAX(streak_longest, CASE
            WHEN date(last_study_date) = date('now', '-1 day') OR last_study_date IS NULL
            THEN streak_current + 1
            WHEN date(last_study_date) = date('now')
            THEN streak_current
            ELSE 1
          END),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(today, userId);

    // Record activity for social feed
    const session = db.prepare(`
      SELECT deck_id FROM study_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (session && cardsStudied > 0) {
      const deck = db.prepare(`
        SELECT title FROM decks WHERE id = ?
      `).get(session.deck_id) as any;

      db.prepare(`
        INSERT INTO user_activity (id, user_id, type, deck_id, deck_title, cards_studied, study_time_minutes)
        VALUES (?, ?, 'study_session', ?, ?, ?, ?)
      `).run(
        uuid(),
        userId,
        session.deck_id,
        deck?.title || 'Unknown Deck',
        cardsStudied,
        Math.round((timeSpentMs || 0) / 60000)
      );
    }

    res.json({
      success: true,
      data: { completed: true },
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ success: false, error: 'Failed to end session' });
  }
});

function formatInterval(days: number): string {
  if (days === 0) return '< 1 min';
  if (days < 1) {
    const hours = Math.round(days * 24);
    if (hours < 1) return `${Math.round(days * 24 * 60)} min`;
    return `${hours} hr`;
  }
  if (days === 1) return '1 day';
  if (days < 30) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}

export default router;
