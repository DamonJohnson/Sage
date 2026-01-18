import { Router, Request, Response } from 'express';
import { db } from '../../db/index.js';
import { optionalAuth, getUserId } from '../../middleware/auth.js';

const router = Router();

// Apply optional auth to all routes - will set req.authUser if token is valid
router.use(optionalAuth);

// GET /api/public/decks - Browse public decks
router.get('/decks', (req: Request, res: Response) => {
  const { search, category, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = `
      SELECT d.*, u.name as author_name, u.avatar_url as author_avatar,
             CASE WHEN d.rating_count > 0 THEN CAST(d.rating_sum AS REAL) / d.rating_count ELSE 0 END as average_rating
      FROM decks d
      JOIN users u ON d.user_id = u.id
      WHERE d.is_public = 1
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (d.title LIKE ? OR d.description LIKE ? OR d.tags LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category && category !== 'All') {
      query += ` AND d.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY d.download_count DESC, d.rating_sum DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const decks = db.prepare(query).all(...params);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM decks WHERE is_public = 1
      ${search ? `AND (title LIKE ? OR description LIKE ?)` : ''}
      ${category && category !== 'All' ? `AND category = ?` : ''}
    `).get(...(search ? [`%${search}%`, `%${search}%`] : []), ...(category && category !== 'All' ? [category] : [])) as { count: number };

    res.json({
      success: true,
      data: {
        decks,
        total: total.count,
        page: Number(page),
        pageSize: Number(limit),
        hasMore: offset + decks.length < total.count,
      },
    });
  } catch (error) {
    console.error('Error fetching public decks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch public decks' });
  }
});

// GET /api/public/decks/:id - Get public deck details with preview cards
router.get('/decks/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deck = db.prepare(`
      SELECT d.*, u.name as author_name, u.avatar_url as author_avatar,
             CASE WHEN d.rating_count > 0 THEN CAST(d.rating_sum AS REAL) / d.rating_count ELSE 0 END as average_rating
      FROM decks d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ? AND d.is_public = 1
    `).get(id);

    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    // Get preview cards (first 5)
    const cards = db.prepare(`
      SELECT id, deck_id, front, back, card_type, options, position, created_at, updated_at
      FROM cards
      WHERE deck_id = ?
      ORDER BY position
      LIMIT 5
    `).all(id);

    res.json({
      success: true,
      data: { deck, cards },
    });
  } catch (error) {
    console.error('Error fetching public deck:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch public deck' });
  }
});

// POST /api/public/decks/:id/clone - Clone public deck to user's library
router.post('/decks/:id/clone', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  try {
    // Get source deck with author info
    const sourceDeck = db.prepare(`
      SELECT d.*, u.name as author_name, u.avatar_url as author_avatar
      FROM decks d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ? AND d.is_public = 1
    `).get(id) as any;

    if (!sourceDeck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    // Create new deck for user with original author info
    const newDeckId = require('uuid').v4();
    db.prepare(`
      INSERT INTO decks (
        id, user_id, title, description, is_public, category, tags, card_count,
        original_author_id, original_author_name, original_author_avatar, original_deck_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      newDeckId,
      userId,
      sourceDeck.title,
      sourceDeck.description,
      sourceDeck.category,
      sourceDeck.tags,
      sourceDeck.card_count,
      sourceDeck.user_id,
      sourceDeck.author_name,
      sourceDeck.author_avatar,
      sourceDeck.id
    );

    // Clone cards
    const sourceCards = db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY position').all(id);
    const insertCard = db.prepare(`
      INSERT INTO cards (id, deck_id, front, back, card_type, options, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    for (const card of sourceCards as any[]) {
      insertCard.run(require('uuid').v4(), newDeckId, card.front, card.back, card.card_type, card.options, card.position);
    }

    // Increment download count
    db.prepare('UPDATE decks SET download_count = download_count + 1 WHERE id = ?').run(id);

    const newDeck = db.prepare('SELECT * FROM decks WHERE id = ?').get(newDeckId) as any;

    // Return response in camelCase format
    const formattedDeck = {
      id: newDeck.id,
      userId: newDeck.user_id,
      title: newDeck.title,
      description: newDeck.description,
      isPublic: newDeck.is_public === 1,
      category: newDeck.category,
      tags: typeof newDeck.tags === 'string' ? JSON.parse(newDeck.tags) : (newDeck.tags || []),
      cardCount: newDeck.card_count || 0,
      downloadCount: newDeck.download_count || 0,
      ratingSum: newDeck.rating_sum || 0,
      ratingCount: newDeck.rating_count || 0,
      originalAuthorId: newDeck.original_author_id,
      originalAuthorName: newDeck.original_author_name,
      originalAuthorAvatar: newDeck.original_author_avatar,
      originalDeckId: newDeck.original_deck_id,
      createdAt: newDeck.created_at,
      updatedAt: newDeck.updated_at,
      masteredCount: 0,
      learningCount: 0,
      newCount: newDeck.card_count || 0,
      dueCount: 0,
    };
    res.status(201).json({ success: true, data: formattedDeck });
  } catch (error) {
    console.error('Error cloning deck:', error);
    res.status(500).json({ success: false, error: 'Failed to clone deck' });
  }
});

// GET /api/public/categories - Get list of categories
router.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as count
      FROM decks
      WHERE is_public = 1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/public/decks/:id/rate - Submit or update a rating and review
router.post('/decks/:id/rate', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { rating, reviewText } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
  }

  try {
    // Check if deck exists and is public
    const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND is_public = 1').get(id);
    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    // Check if user already has a rating for this deck
    const existingRating = db.prepare('SELECT * FROM deck_ratings WHERE deck_id = ? AND user_id = ?').get(id, userId) as any;

    if (existingRating) {
      // Update existing rating
      const oldRating = existingRating.rating;
      db.prepare(`
        UPDATE deck_ratings
        SET rating = ?, review_text = ?, updated_at = datetime('now')
        WHERE deck_id = ? AND user_id = ?
      `).run(rating, reviewText || null, id, userId);

      // Update deck rating sum (subtract old, add new)
      db.prepare(`
        UPDATE decks
        SET rating_sum = rating_sum - ? + ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(oldRating, rating, id);
    } else {
      // Insert new rating
      const ratingId = require('uuid').v4();
      db.prepare(`
        INSERT INTO deck_ratings (id, deck_id, user_id, rating, review_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(ratingId, id, userId, rating, reviewText || null);

      // Update deck rating sum and count
      db.prepare(`
        UPDATE decks
        SET rating_sum = rating_sum + ?, rating_count = rating_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(rating, id);
    }

    const updatedRating = db.prepare('SELECT * FROM deck_ratings WHERE deck_id = ? AND user_id = ?').get(id, userId);
    res.json({ success: true, data: updatedRating });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ success: false, error: 'Failed to submit rating' });
  }
});

// GET /api/public/decks/:id/reviews - Get all reviews for a deck
router.get('/decks/:id/reviews', (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId = req.authUser?.id;

  try {
    // Get reviews with user info
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name, u.avatar_url as user_avatar
      FROM deck_ratings r
      JOIN users u ON r.user_id = u.id
      WHERE r.deck_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(id, Number(limit), offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM deck_ratings WHERE deck_id = ?').get(id) as { count: number };

    // Get user's own rating if logged in
    let userRating = null;
    if (userId) {
      userRating = db.prepare('SELECT * FROM deck_ratings WHERE deck_id = ? AND user_id = ?').get(id, userId);
    }

    res.json({
      success: true,
      data: {
        reviews,
        total: total.count,
        page: Number(page),
        pageSize: Number(limit),
        hasMore: offset + reviews.length < total.count,
        userRating,
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

// GET /api/public/decks/:id/my-rating - Get user's own rating for a deck
router.get('/decks/:id/my-rating', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  try {
    const rating = db.prepare('SELECT * FROM deck_ratings WHERE deck_id = ? AND user_id = ?').get(id, userId);
    res.json({ success: true, data: rating || null });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rating' });
  }
});

// DELETE /api/public/decks/:id/rate - Delete user's own rating/review
router.delete('/decks/:id/rate', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  try {
    const existingRating = db.prepare('SELECT * FROM deck_ratings WHERE deck_id = ? AND user_id = ?').get(id, userId) as any;

    if (!existingRating) {
      return res.status(404).json({ success: false, error: 'Rating not found' });
    }

    // Delete the rating
    db.prepare('DELETE FROM deck_ratings WHERE deck_id = ? AND user_id = ?').run(id, userId);

    // Update deck rating sum and count
    db.prepare(`
      UPDATE decks
      SET rating_sum = rating_sum - ?, rating_count = rating_count - 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(existingRating.rating, id);

    res.json({ success: true, message: 'Rating deleted' });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ success: false, error: 'Failed to delete rating' });
  }
});

export default router;
