import { Router, Request, Response } from 'express';
import { db } from '../../db/index.js';
import { v4 as uuid } from 'uuid';
import { optionalAuth, getUserId } from '../../middleware/auth.js';

const router = Router();

// Apply optional auth to all routes
router.use(optionalAuth);

// POST /api/decks/:deckId/cards - Add cards to deck
router.post('/:deckId/cards', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckId } = req.params;
  const { cards } = req.body;

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ success: false, error: 'Cards array is required' });
  }

  try {
    // Verify deck ownership
    const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(deckId, userId);
    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    // Get current max position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM cards WHERE deck_id = ?').get(deckId) as { max: number | null };
    let position = (maxPos.max || 0) + 1;

    const insertCard = db.prepare(`
      INSERT INTO cards (id, deck_id, front, back, front_image, back_image, card_type, options, explanation, cloze_index, image_occlusion, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertMany = db.transaction((cardsToInsert: any[]) => {
      const createdCards = [];
      for (const card of cardsToInsert) {
        const id = uuid();
        insertCard.run(
          id,
          deckId,
          card.front,
          card.back,
          card.frontImage || null,
          card.backImage || null,
          card.cardType || 'flashcard',
          card.options ? JSON.stringify(card.options) : null,
          card.explanation || null,
          card.clozeIndex || null,
          card.imageOcclusion ? JSON.stringify(card.imageOcclusion) : null,
          position++
        );
        createdCards.push({
          id,
          deckId,
          front: card.front,
          back: card.back,
          frontImage: card.frontImage || null,
          backImage: card.backImage || null,
          cardType: card.cardType || 'flashcard',
          options: card.options || null,
          explanation: card.explanation || null,
          clozeIndex: card.clozeIndex || null,
          imageOcclusion: card.imageOcclusion || null,
          position: position - 1,
        });
      }
      return createdCards;
    });

    const createdCards = insertMany(cards);

    // Update deck card count
    db.prepare('UPDATE decks SET card_count = card_count + ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(cards.length, deckId);

    res.status(201).json({ success: true, data: createdCards });
  } catch (error) {
    console.error('Error adding cards:', error);
    res.status(500).json({ success: false, error: 'Failed to add cards' });
  }
});

// GET /api/decks/:deckId/cards - Get cards for deck
router.get('/:deckId/cards', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckId } = req.params;

  try {
    const cards = db.prepare(`
      SELECT c.*, cs.state, cs.due, cs.stability, cs.difficulty, cs.reps, cs.lapses
      FROM cards c
      LEFT JOIN card_states cs ON c.id = cs.card_id AND cs.user_id = ?
      WHERE c.deck_id = ?
      ORDER BY c.position
    `).all(userId, deckId);

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cards' });
  }
});

// PUT /api/decks/:deckId/cards/:cardId - Update card
router.put('/:deckId/cards/:cardId', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckId, cardId } = req.params;
  const { front, back, frontImage, backImage, cardType, options, explanation, clozeIndex } = req.body;

  try {
    // Verify deck ownership
    const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(deckId, userId);
    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    db.prepare(`
      UPDATE cards SET
        front = COALESCE(?, front),
        back = COALESCE(?, back),
        front_image = ?,
        back_image = ?,
        card_type = COALESCE(?, card_type),
        options = COALESCE(?, options),
        explanation = ?,
        cloze_index = ?,
        updated_at = datetime('now')
      WHERE id = ? AND deck_id = ?
    `).run(
      front,
      back,
      frontImage !== undefined ? frontImage : null,
      backImage !== undefined ? backImage : null,
      cardType,
      options ? JSON.stringify(options) : null,
      explanation !== undefined ? explanation : null,
      clozeIndex !== undefined ? clozeIndex : null,
      cardId,
      deckId
    );

    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as any;
    res.json({
      success: true,
      data: {
        id: card.id,
        deckId: card.deck_id,
        front: card.front,
        back: card.back,
        frontImage: card.front_image,
        backImage: card.back_image,
        cardType: card.card_type,
        options: card.options ? JSON.parse(card.options) : null,
        explanation: card.explanation || null,
        clozeIndex: card.cloze_index || null,
        position: card.position,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      },
    });
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ success: false, error: 'Failed to update card' });
  }
});

// DELETE /api/decks/:deckId/cards/:cardId - Delete card
router.delete('/:deckId/cards/:cardId', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { deckId, cardId } = req.params;

  try {
    // Verify deck ownership
    const deck = db.prepare('SELECT * FROM decks WHERE id = ? AND user_id = ?').get(deckId, userId);
    if (!deck) {
      return res.status(404).json({ success: false, error: 'Deck not found' });
    }

    const result = db.prepare('DELETE FROM cards WHERE id = ? AND deck_id = ?').run(cardId, deckId);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Card not found' });
    }

    // Update deck card count
    db.prepare('UPDATE decks SET card_count = card_count - 1, updated_at = datetime(\'now\') WHERE id = ?')
      .run(deckId);

    res.json({ success: true, message: 'Card deleted' });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ success: false, error: 'Failed to delete card' });
  }
});

export default router;
