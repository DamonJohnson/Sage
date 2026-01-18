import { Router, Request, Response } from 'express';
import { db } from '../../db/index.js';
import { v4 as uuid } from 'uuid';
import { optionalAuth, getUserId } from '../../middleware/auth.js';

const router = Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// Helper to map deck row to camelCase response
function mapDeckToResponse(deck: any) {
  return {
    id: deck.id,
    userId: deck.user_id,
    title: deck.title,
    description: deck.description,
    isPublic: deck.is_public === 1,
    category: deck.category,
    tags: typeof deck.tags === 'string' ? JSON.parse(deck.tags) : (deck.tags || []),
    cardCount: deck.card_count || 0,
    downloadCount: deck.download_count || 0,
    ratingSum: deck.rating_sum || 0,
    ratingCount: deck.rating_count || 0,
    originalAuthorId: deck.original_author_id,
    originalAuthorName: deck.original_author_name,
    originalAuthorAvatar: deck.original_author_avatar,
    originalDeckId: deck.original_deck_id,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
    // Stats fields
    masteredCount: deck.mastered_count || 0,
    learningCount: deck.learning_count || 0,
    newCount: deck.new_count || 0,
    dueCount: deck.due_count || 0,
    lastStudied: deck.last_studied || null,
    nextReview: deck.next_review || null,
  };
}

// GET /api/decks - List user's decks
router.get('/', (req: Request, res: Response) => {
  const userId = getUserId(req);

  try {
    const decks = db.prepare(`
      SELECT
        d.*,
        (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) as card_count,
        (SELECT COUNT(*) FROM card_states cs
         JOIN cards c ON cs.card_id = c.id
         WHERE c.deck_id = d.id AND cs.user_id = ? AND cs.state = 'review' AND cs.stability > 21) as mastered_count,
        (SELECT COUNT(*) FROM card_states cs
         JOIN cards c ON cs.card_id = c.id
         WHERE c.deck_id = d.id AND cs.user_id = ? AND cs.state IN ('learning', 'relearning')) as learning_count,
        (SELECT COUNT(*) FROM cards c
         LEFT JOIN card_states cs ON c.id = cs.card_id AND cs.user_id = ?
         WHERE c.deck_id = d.id AND cs.id IS NULL) as new_count,
        (SELECT COUNT(*) FROM card_states cs
         JOIN cards c ON cs.card_id = c.id
         WHERE c.deck_id = d.id AND cs.user_id = ? AND cs.due <= datetime('now')) as due_count
      FROM decks d
      WHERE d.user_id = ?
      ORDER BY d.updated_at DESC
    `).all(userId, userId, userId, userId, userId);

    const mappedDecks = (decks as any[]).map(mapDeckToResponse);
    res.json({ success: true, data: mappedDecks });
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch decks' });
  }
});

// GET /api/decks/:id - Get single deck with cards
router.get('/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  try {
    const deck = db.prepare(`
      SELECT * FROM decks WHERE id = ? AND (user_id = ? OR is_public = 1)
    `).get(id, userId);

    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    const cards = db.prepare(`
      SELECT c.*, cs.state, cs.due, cs.stability, cs.difficulty
      FROM cards c
      LEFT JOIN card_states cs ON c.id = cs.card_id AND cs.user_id = ?
      WHERE c.deck_id = ?
      ORDER BY c.position
    `).all(userId, id);

    res.json({ success: true, data: { ...deck, cards } });
  } catch (error) {
    console.error('Error fetching deck:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deck' });
  }
});

// POST /api/decks - Create deck
router.post('/', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { title, description, isPublic, category, tags } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }

  try {
    const id = uuid();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO decks (id, user_id, title, description, is_public, category, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, title.trim(), description || '', isPublic ? 1 : 0, category || null, JSON.stringify(tags || []), now, now);

    const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: mapDeckToResponse(deck) });
  } catch (error) {
    console.error('Error creating deck:', error);
    res.status(500).json({ success: false, error: 'Failed to create deck' });
  }
});

// PUT /api/decks/:id - Update deck
router.put('/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { title, description, isPublic, category, tags } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    db.prepare(`
      UPDATE decks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        is_public = COALESCE(?, is_public),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(title, description, isPublic !== undefined ? (isPublic ? 1 : 0) : null, category, tags ? JSON.stringify(tags) : null, id, userId);

    const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(id);
    res.json({ success: true, data: mapDeckToResponse(deck) });
  } catch (error) {
    console.error('Error updating deck:', error);
    res.status(500).json({ success: false, error: 'Failed to update deck' });
  }
});

// DELETE /api/decks/:id - Delete deck
router.delete('/:id', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { id } = req.params;

  try {
    const result = db.prepare('DELETE FROM decks WHERE id = ? AND user_id = ?').run(id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }
    res.json({ success: true, message: 'Deck deleted' });
  } catch (error) {
    console.error('Error deleting deck:', error);
    res.status(500).json({ success: false, error: 'Failed to delete deck' });
  }
});

export default router;
