import { Router, Request, Response } from 'express';
import { requireAuth, getUserId } from '../../middleware/auth.js';
import multer from 'multer';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept .apkg files (which are actually ZIP files)
    if (file.originalname.endsWith('.apkg') || file.mimetype === 'application/zip') {
      cb(null, true);
    } else {
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
router.post('/apkg', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  const tempDir = path.join(os.tmpdir(), `apkg-${uuid()}`);

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

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
