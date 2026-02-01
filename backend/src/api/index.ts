import { Router } from 'express';
import authRouter from './routes/auth.js';
import decksRouter from './routes/decks.js';
import cardsRouter from './routes/cards.js';
import studyRouter from './routes/study.js';
import aiRouter from './routes/ai.js';
import publicRouter from './routes/public.js';
import socialRouter from './routes/social.js';
import importRouter from './routes/import.js';
import waitlistRouter from './routes/waitlist.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
router.use('/auth', authRouter);
router.use('/decks', decksRouter);
router.use('/decks', cardsRouter); // Cards are nested under decks
router.use('/study', studyRouter);
router.use('/ai', aiRouter);
router.use('/public', publicRouter);
router.use('/social', socialRouter);
router.use('/import', importRouter);
router.use('/waitlist', waitlistRouter);

export default router;
