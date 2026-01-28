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
    fileSize: 500 * 1024 * 1024, // 500MB max file size
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

interface ImportedCard {
  front: string;
  back: string;
  frontImage?: string | null;
  backImage?: string | null;
  cardType?: 'flashcard' | 'cloze';
  clozeIndex?: number | null;
}

/**
 * Check if text contains cloze deletion syntax
 */
function hasClozeDelections(text: string): boolean {
  return /\{\{c\d+::[^}]+\}\}/i.test(text);
}

/**
 * Get all unique cloze numbers from text
 */
function getClozeNumbers(text: string): number[] {
  const matches = text.match(/\{\{c(\d+)::/gi);
  if (!matches) return [];

  const numbers = new Set<number>();
  for (const match of matches) {
    const num = parseInt(match.match(/\d+/)?.[0] || '1');
    numbers.add(num);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Create cloze card for a specific cloze number
 * For the tested cloze, show [...] or [hint]
 * For other clozes, show the answer
 */
function createClozeCard(text: string, clozeNum: number): { front: string; back: string } {
  // Extract the answer for the tested cloze (for back of card)
  let answer = '';
  const answerRegex = new RegExp(`\\{\\{c${clozeNum}::([^:}]+)(?:::[^}]*)?\\}\\}`, 'gi');
  const answerMatch = answerRegex.exec(text);
  if (answerMatch) {
    answer = answerMatch[1];
  }

  // Create front: replace tested cloze with [...] or [hint], reveal others
  let front = text;

  // First, replace the tested cloze with blank/hint
  front = front.replace(
    new RegExp(`\\{\\{c${clozeNum}::([^:}]+)(?:::([^}]*))?\\}\\}`, 'gi'),
    (_, _answer, hint) => hint ? `[${hint}]` : '[...]'
  );

  // Then, reveal all other clozes (show the answer)
  front = front.replace(/\{\{c\d+::([^:}]+)(?:::[^}]*)?\}\}/gi, '$1');

  return { front, back: answer };
}

/**
 * Extract image from HTML and return base64 data
 */
function extractImageFromHtml(html: string, mediaMap: Record<string, string>, mediaDir: string): string | null {
  if (!html) return null;

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const imgSrc = match[1];

    // Find the numeric key that maps to this filename
    let numericKey: string | null = null;
    for (const [key, value] of Object.entries(mediaMap)) {
      if (value === imgSrc) {
        numericKey = key;
        break;
      }
    }

    // Build list of paths to try
    const possiblePaths: string[] = [];
    if (numericKey) {
      possiblePaths.push(path.join(mediaDir, numericKey));
    }
    possiblePaths.push(path.join(mediaDir, imgSrc));
    if (!path.extname(imgSrc)) {
      possiblePaths.push(path.join(mediaDir, imgSrc + '.jpg'));
      possiblePaths.push(path.join(mediaDir, imgSrc + '.png'));
    }

    for (const mediaPath of possiblePaths) {
      try {
        if (fs.existsSync(mediaPath)) {
          const fileBuffer = fs.readFileSync(mediaPath);
          const originalName = numericKey ? mediaMap[numericKey] : imgSrc;
          const ext = path.extname(originalName).toLowerCase() || '.jpg';
          const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
          return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        }
      } catch {
        // Continue trying other paths
      }
    }
  }

  return null;
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';

  let text = html.replace(/<img[^>]*>/gi, ''); // Remove img tags first
  text = text.replace(/<[^>]*>/g, '');

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
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Extract images from HTML content and return the image reference and cleaned text
 */
function extractImagesFromHtml(html: string, mediaMap: Record<string, string>, mediaDir: string): { text: string; image: string | null } {
  if (!html) return { text: '', image: null };

  const image = extractImageFromHtml(html, mediaMap, mediaDir);
  let text = stripHtmlTags(html);

  // Note: We do NOT convert cloze syntax here - that's handled separately for cloze cards
  // For non-cloze cards, we show cloze answers in brackets
  if (!hasClozeDelections(html)) {
    // Not a cloze card, no conversion needed
  }

  return { text, image };
}

/**
 * Process Anki note and create card(s)
 * Handles cloze deletions by creating multiple cards from one note
 */
function processAnkiNote(
  fields: string[],
  mediaMap: Record<string, string>,
  mediaDir: string
): ImportedCard[] {
  const cards: ImportedCard[] = [];

  if (fields.length === 0) return cards;

  const rawFront = fields[0] || '';
  const rawBack = fields.length > 1 ? fields[1] : '';

  // Extract images
  const frontImage = extractImageFromHtml(rawFront, mediaMap, mediaDir);
  const backImage = extractImageFromHtml(rawBack, mediaMap, mediaDir);

  // Check if this is a cloze deletion note
  const isCloze = hasClozeDelections(rawFront);

  if (isCloze) {
    // Create a separate card for each cloze number
    const cleanFront = stripHtmlTags(rawFront);
    const clozeNumbers = getClozeNumbers(cleanFront);

    for (const clozeNum of clozeNumbers) {
      const { front, back } = createClozeCard(cleanFront, clozeNum);

      if (front.trim() && back.trim()) {
        cards.push({
          front: front.trim(),
          back: back.trim(),
          frontImage,
          backImage,
          cardType: 'cloze',
          clozeIndex: clozeNum,
        });
      }
    }
  } else {
    // Regular flashcard
    let front = stripHtmlTags(rawFront);
    let back = stripHtmlTags(rawBack);

    // If there are any stray cloze markers (shouldn't happen), convert them
    front = front.replace(/\{\{c\d+::([^:}]+)(?:::[^}]*)?\}\}/gi, '[$1]');
    back = back.replace(/\{\{c\d+::([^:}]+)(?:::[^}]*)?\}\}/gi, '[$1]');

    if (front.trim() || frontImage) {
      cards.push({
        front: front.trim(),
        back: back.trim(),
        frontImage,
        backImage,
        cardType: 'flashcard',
        clozeIndex: null,
      });
    }
  }

  return cards;
}

/**
 * Import an APKG file (Anki deck package)
 * Supports both Anki 2.0 (collection.anki2) and Anki 2.1+ (collection.anki21) formats
 * POST /api/import/apkg
 */
router.post('/apkg', devAuth, (req: Request, res: Response, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed',
      });
    }
    next();
  });
}, async (req: Request, res: Response) => {
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

    const extractedFiles = fs.readdirSync(tempDir);
    console.log('APKG contents:', extractedFiles);

    // Find the SQLite database - support multiple formats
    // Anki 2.0: collection.anki2
    // Anki 2.1+: collection.anki21 or collection.anki2
    const dbFiles = extractedFiles.filter(f =>
      f === 'collection.anki2' || f === 'collection.anki21'
    );

    if (dbFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid APKG file: No Anki collection database found. Supported formats: Anki 2.0+',
      });
    }

    // Prefer newer format if both exist
    const dbFileName = dbFiles.includes('collection.anki21') ? 'collection.anki21' : dbFiles[0];
    const dbPath = path.join(tempDir, dbFileName);
    console.log('Using database:', dbFileName);

    const ankiDb = new Database(dbPath, { readonly: true });

    // Load media mapping (maps numeric filenames to original names)
    let mediaMap: Record<string, string> = {};
    const mediaJsonPath = path.join(tempDir, 'media');
    if (fs.existsSync(mediaJsonPath)) {
      try {
        const mediaContent = fs.readFileSync(mediaJsonPath, 'utf8');
        mediaMap = JSON.parse(mediaContent);
        console.log('Loaded media map with', Object.keys(mediaMap).length, 'entries');
        // Log a few sample entries for debugging
        const sampleEntries = Object.entries(mediaMap).slice(0, 3);
        console.log('Sample media map entries:', sampleEntries);
      } catch (e) {
        console.log('Could not parse media file:', e);
      }
    }

    // Check what media files actually exist in the directory
    const mediaFiles = extractedFiles.filter(f => !f.includes('collection.anki') && f !== 'media');
    console.log('Media files in directory (first 5):', mediaFiles.slice(0, 5));

    // Get deck name - try different methods for different Anki versions
    let deckName = 'Imported Deck';

    // Method 1: Try 'decks' table (Anki 2.1.28+)
    try {
      const tables = ankiDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const tableNames = tables.map(t => t.name);
      console.log('Available tables:', tableNames);

      if (tableNames.includes('decks')) {
        // New format: separate decks table
        const deckRow = ankiDb.prepare('SELECT name FROM decks WHERE id != 1 LIMIT 1').get() as { name: string } | undefined;
        if (deckRow?.name) {
          deckName = deckRow.name;
        }
      } else if (tableNames.includes('col')) {
        // Old format: decks stored in col table as JSON
        const colRow = ankiDb.prepare('SELECT decks FROM col').get() as { decks: string } | undefined;
        if (colRow?.decks) {
          const decksData = JSON.parse(colRow.decks);
          const deckIds = Object.keys(decksData).filter(id => id !== '1');
          if (deckIds.length > 0) {
            deckName = decksData[deckIds[0]].name || 'Imported Deck';
          }
        }
      }
    } catch (e) {
      console.log('Could not extract deck name:', e);
    }

    // Get models (note types) - try different methods
    let models: Record<string, AnkiModel> = {};
    try {
      const tables = ankiDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const tableNames = tables.map(t => t.name);

      if (tableNames.includes('notetypes')) {
        // New format: separate notetypes table
        const notetypeRows = ankiDb.prepare('SELECT id, name, flds FROM notetypes').all() as { id: number; name: string; flds: string }[];
        for (const row of notetypeRows) {
          try {
            const flds = JSON.parse(row.flds);
            models[String(row.id)] = { name: row.name, flds };
          } catch {
            models[String(row.id)] = { name: row.name, flds: [] };
          }
        }
      } else if (tableNames.includes('col')) {
        // Old format: models stored in col table as JSON
        const colRow = ankiDb.prepare('SELECT models FROM col').get() as { models: string } | undefined;
        if (colRow?.models) {
          models = JSON.parse(colRow.models);
        }
      }
    } catch (e) {
      console.log('Could not extract models:', e);
    }

    // Extract notes (cards)
    const notes = ankiDb.prepare('SELECT flds, mid FROM notes').all() as AnkiNote[];
    console.log('Found', notes.length, 'notes');

    const cards: ImportedCard[] = [];

    for (const note of notes) {
      // Fields are separated by \x1f (field separator)
      const fields = note.flds.split('\x1f');

      // Process note and potentially create multiple cards (for cloze deletions)
      const processedCards = processAnkiNote(fields, mediaMap, tempDir);
      cards.push(...processedCards);
    }

    const clozeCards = cards.filter(c => c.cardType === 'cloze').length;
    const regularCards = cards.filter(c => c.cardType !== 'cloze').length;
    console.log(`Processed into ${cards.length} cards (${clozeCards} cloze, ${regularCards} regular)`)

    ankiDb.close();

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    if (cards.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No cards found in the APKG file',
      });
    }

    const cardsWithImages = cards.filter(c => c.frontImage || c.backImage).length;
    console.log(`Successfully imported ${cards.length} cards (${cardsWithImages} with images)`);

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
      error: `Failed to parse APKG file: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
