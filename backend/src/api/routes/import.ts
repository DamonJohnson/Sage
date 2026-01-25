import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, optionalAuth, getUserId } from '../../middleware/auth.js';
import { config } from '../../config.js';
import multer from 'multer';

// Development auth middleware - allows x-user-id header in dev mode
function devAuth(req: Request, res: Response, next: NextFunction): void {
  // In development, allow x-user-id header to bypass auth
  if (config.nodeEnv === 'development' && req.headers['x-user-id']) {
    (req as any).authUser = { id: req.headers['x-user-id'] as string, email: 'dev@test.com', name: 'Dev User' };
    next();
    return;
  }
  // Otherwise use normal auth
  requireAuth(req, res, next);
}
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept .apkg files (which are actually ZIP files)
    // Check filename extension or common MIME types for zip files
    const isApkgFile = file.originalname.toLowerCase().endsWith('.apkg');
    const isZipMime = [
      'application/zip',
      'application/x-zip-compressed',
      'application/octet-stream',
    ].includes(file.mimetype);

    if (isApkgFile || isZipMime) {
      cb(null, true);
    } else {
      console.log('Rejected file:', file.originalname, file.mimetype);
      cb(new Error('Only .apkg files are allowed'));
    }
  },
});

interface AnkiNote {
  flds: string;
  mid: number;
}

interface AnkiModel {
  name: string;
  flds: Array<{ name: string }>;
}

/**
 * Import an APKG file (Anki deck package)
 * POST /api/import/apkg
 */
router.post('/apkg', devAuth, upload.single('file'), async (req: Request, res: Response) => {
  const tempDir = path.join(os.tmpdir(), `apkg-${uuid()}`);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    console.log('APKG import: Received file', req.file.originalname, 'size:', req.file.size, 'bytes');

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Extract APKG (it's a ZIP file)
    const zip = new AdmZip(req.file.buffer);
    zip.extractAllTo(tempDir, true);

    // Find the SQLite database (collection.anki2 or collection.anki21)
    const dbFiles = fs.readdirSync(tempDir).filter(f =>
      f === 'collection.anki2' || f === 'collection.anki21'
    );

    if (dbFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid APKG file: No Anki collection database found',
      });
    }

    const dbPath = path.join(tempDir, dbFiles[0]);
    const ankiDb = new Database(dbPath, { readonly: true });

    // Get deck name from the 'decks' column in 'col' table
    let deckName = 'Imported Deck';
    try {
      const colRow = ankiDb.prepare('SELECT decks FROM col').get() as { decks: string } | undefined;
      if (colRow?.decks) {
        const decksData = JSON.parse(colRow.decks);
        // Get the first non-default deck name
        const deckIds = Object.keys(decksData).filter(id => id !== '1');
        if (deckIds.length > 0) {
          deckName = decksData[deckIds[0]].name || 'Imported Deck';
        }
      }
    } catch (e) {
      console.log('Could not extract deck name:', e);
    }

    // Get models (note types) to understand field structure
    let models: Record<string, AnkiModel> = {};
    try {
      const colRow = ankiDb.prepare('SELECT models FROM col').get() as { models: string } | undefined;
      if (colRow?.models) {
        models = JSON.parse(colRow.models);
      }
    } catch (e) {
      console.log('Could not extract models:', e);
    }

    // Extract notes (cards)
    const notes = ankiDb.prepare('SELECT flds, mid FROM notes').all() as AnkiNote[];

    const cards: Array<{ front: string; back: string }> = [];

    for (const note of notes) {
      // Fields are separated by \x1f (field separator)
      const fields = note.flds.split('\x1f');

      // Get the model (note type) for this note
      const model = models[String(note.mid)];
      let front = '';
      let back = '';

      if (fields.length >= 2) {
        // Most cards have at least 2 fields: front and back
        front = stripHtml(fields[0]);
        back = stripHtml(fields[1]);
      } else if (fields.length === 1) {
        // Single field - use it as front, leave back empty
        front = stripHtml(fields[0]);
        back = '';
      }

      // Only add if we have at least a front
      if (front.trim()) {
        cards.push({
          front: front.trim(),
          back: back.trim(),
        });
      }
    }

    ankiDb.close();

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    if (cards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No cards found in the APKG file',
      });
    }

    res.json({
      success: true,
      data: {
        deckName,
        cards,
      },
    });
  } catch (error) {
    console.error('APKG import error:', error);

    // Clean up temp directory on error
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Failed to clean up temp dir:', e);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to parse APKG file',
    });
  }
});

/**
 * Import flashcards from text/CSV content using AI
 * POST /api/import/text
 */
router.post('/text', devAuth, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    // Try simple CSV/TSV parsing first
    const lines = content.trim().split('\n').filter(line => line.trim());
    const simpleCards: Array<{ front: string; back: string }> = [];
    let isStructuredData = true;

    for (const line of lines) {
      // Try comma, tab, or pipe as delimiter
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(',');
      if (parts.length < 2) parts = line.split('|');

      if (parts.length >= 2) {
        const front = parts[0].trim();
        const back = parts.slice(1).join(', ').trim();
        if (front && back) {
          simpleCards.push({ front, back });
        }
      } else {
        isStructuredData = false;
        break;
      }
    }

    // If we successfully parsed structured data with at least 2 cards, return it
    if (isStructuredData && simpleCards.length >= 2) {
      return res.json({
        success: true,
        data: {
          deckName: 'Imported Cards',
          cards: simpleCards,
          method: 'csv',
        },
      });
    }

    // Otherwise, use AI to parse unstructured content
    const hasValidApiKey = config.anthropic.apiKey && !config.anthropic.apiKey.startsWith('stub-');
    if (!hasValidApiKey) {
      // Fallback to simple parsing if no API key
      if (simpleCards.length > 0) {
        return res.json({
          success: true,
          data: {
            deckName: 'Imported Cards',
            cards: simpleCards,
            method: 'csv-fallback',
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Could not parse content. Please format as CSV (front,back) or tab-separated values.',
      });
    }

    const client = new Anthropic({ apiKey: config.anthropic.apiKey });

    const systemPrompt = `You are an expert educator creating flashcards optimized for spaced repetition learning.

## Your Task
Analyze the provided text content and convert it into high-quality study cards.

## CRITICAL: Accuracy & Content Extraction
- ONLY create cards for information explicitly present in the content
- DO NOT make up or infer facts, dates, names, or details
- If the content is already in Q&A format, preserve it
- If it's notes or prose, extract key facts and convert to Q&A
- Focus on the most important, testable information

## Question Style (Front of Card)
- Ask ONE specific, unambiguous question per card
- Keep questions under 15 words when possible
- Use clear question starters: "What", "Why", "How", "Define", "Which"
- Avoid yes/no questions - they're poor for learning

## Answer Style (Back of Card)
- Keep answers CONCISE - 1-2 sentences maximum
- Lead with the key fact or definition
- Avoid unnecessary elaboration or filler words
- Use terminology from the original content

## Card Quality Guidelines
- Each card tests ONE atomic concept
- Cards should be self-contained and independent
- Prioritize foundational knowledge over obscure details
- Create 5-30 cards depending on content density

## Deck Naming
- Suggest a concise, descriptive deck name based on the content topic
- 2-5 words, capitalize appropriately

## Output Format
Return ONLY valid JSON:
{"deckName": "Suggested Title", "cards": [{"front": "question", "back": "answer"}]}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Convert this content into flashcards:\n\n${content.substring(0, 50000)}`,
        },
      ],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== 'text' || !responseContent.text) {
      return res.status(500).json({
        success: false,
        error: 'No response from AI',
      });
    }

    // Parse the JSON response
    let parsed;
    try {
      // Try direct parse
      parsed = JSON.parse(responseContent.text);
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = responseContent.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try finding JSON object
        const objectMatch = responseContent.text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          parsed = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not parse JSON from response');
        }
      }
    }

    const cards = parsed.cards || [];
    if (cards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract any flashcards from the content',
      });
    }

    res.json({
      success: true,
      data: {
        deckName: parsed.deckName || 'Imported Cards',
        cards: cards.map((card: { front: string; back: string }) => ({
          front: card.front,
          back: card.back,
        })),
        method: 'ai',
      },
    });
  } catch (error) {
    console.error('Text import error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import content',
    });
  }
});

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  if (!html) return '';

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export default router;
