import Database, { Database as DatabaseType } from 'better-sqlite3';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(config.dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
export function initializeDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      oauth_provider TEXT,
      oauth_id TEXT,
      streak_current INTEGER DEFAULT 0,
      streak_longest INTEGER DEFAULT 0,
      last_study_date TEXT,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Decks table
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_public INTEGER DEFAULT 0,
      category TEXT,
      tags TEXT DEFAULT '[]',
      card_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      rating_sum INTEGER DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      original_author_id TEXT,
      original_author_name TEXT,
      original_author_avatar TEXT,
      original_deck_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Cards table
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      front_image TEXT,
      back_image TEXT,
      card_type TEXT DEFAULT 'flashcard',
      options TEXT,
      cloze_index INTEGER,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    -- Card States (FSRS data)
    CREATE TABLE IF NOT EXISTS card_states (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      stability REAL DEFAULT 1.0,
      difficulty REAL DEFAULT 5.0,
      elapsed_days REAL DEFAULT 0,
      scheduled_days REAL DEFAULT 0,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      state TEXT DEFAULT 'new',
      due TEXT DEFAULT (datetime('now')),
      last_review TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(card_id, user_id),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Review Logs
    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      state TEXT NOT NULL,
      elapsed_days REAL,
      scheduled_days REAL,
      review_time_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Sessions
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      cards_studied INTEGER DEFAULT 0,
      cards_correct INTEGER DEFAULT 0,
      time_spent_ms INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Daily Study Records (aggregated daily stats for sync)
    CREATE TABLE IF NOT EXISTS daily_study_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      cards_studied INTEGER DEFAULT 0,
      study_time_ms INTEGER DEFAULT 0,
      ratings_again INTEGER DEFAULT 0,
      ratings_hard INTEGER DEFAULT 0,
      ratings_good INTEGER DEFAULT 0,
      ratings_easy INTEGER DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- User Follows (social connections)
    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- User Profiles (additional social info)
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      bio TEXT DEFAULT '',
      activity_public INTEGER DEFAULT 1,
      total_cards_studied INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- User Activity Feed
    CREATE TABLE IF NOT EXISTS user_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      deck_id TEXT,
      deck_title TEXT,
      cards_studied INTEGER,
      study_time_minutes INTEGER,
      streak_days INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Deck Ratings & Reviews
    CREATE TABLE IF NOT EXISTS deck_ratings (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(deck_id, user_id),
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
    CREATE INDEX IF NOT EXISTS idx_decks_is_public ON decks(is_public);
    CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_card_states_user_card ON card_states(user_id, card_id);
    CREATE INDEX IF NOT EXISTS idx_card_states_due ON card_states(user_id, due);
    CREATE INDEX IF NOT EXISTS idx_review_logs_user ON review_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_daily_study_records_user_date ON daily_study_records(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_deck_ratings_deck ON deck_ratings(deck_id);
    CREATE INDEX IF NOT EXISTS idx_deck_ratings_user ON deck_ratings(user_id);
  `);

  // Migration: Add original author columns if they don't exist
  try {
    db.exec(`ALTER TABLE decks ADD COLUMN original_author_id TEXT`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE decks ADD COLUMN original_author_name TEXT`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE decks ADD COLUMN original_author_avatar TEXT`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE decks ADD COLUMN original_deck_id TEXT`);
  } catch (e) { /* Column already exists */ }

  // Migration: Add image columns to cards if they don't exist
  try {
    db.exec(`ALTER TABLE cards ADD COLUMN front_image TEXT`);
  } catch (e) { /* Column already exists */ }
  try {
    db.exec(`ALTER TABLE cards ADD COLUMN back_image TEXT`);
  } catch (e) { /* Column already exists */ }

  // Migration: Add password_hash column for email/password auth
  try {
    db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  } catch (e) { /* Column already exists */ }

  // Migration: Add explanation column to cards
  try {
    db.exec(`ALTER TABLE cards ADD COLUMN explanation TEXT`);
  } catch (e) { /* Column already exists */ }

  // Migration: Add cloze_index column to cards (for cloze deletion cards)
  try {
    db.exec(`ALTER TABLE cards ADD COLUMN cloze_index INTEGER`);
  } catch (e) { /* Column already exists */ }

  // Migration: Add image_occlusion column to cards (for image occlusion cards)
  try {
    db.exec(`ALTER TABLE cards ADD COLUMN image_occlusion TEXT`);
  } catch (e) { /* Column already exists */ }

  // Seed demo users for social features (insert if they don't exist)
  const demoUsers = [
    { id: 'user-sarah', email: 'sarah@example.com', name: 'Sarah Chen', streak: 15, longest: 30, bio: 'Medical student, loves anatomy flashcards' },
    { id: 'user-alex', email: 'alex@example.com', name: 'Alex Rivera', streak: 22, longest: 45, bio: 'Language learner - Spanish, Japanese, French' },
    { id: 'user-jordan', email: 'jordan@example.com', name: 'Jordan Kim', streak: 5, longest: 20, bio: 'Computer science major, preparing for interviews' },
    { id: 'user-emma', email: 'emma@example.com', name: 'Emma Thompson', streak: 12, longest: 35, bio: 'History buff and trivia lover' },
    { id: 'user-marcus', email: 'marcus@example.com', name: 'Marcus Johnson', streak: 8, longest: 25, bio: 'Learning music theory one card at a time' },
  ];

  const checkUser = db.prepare('SELECT id FROM users WHERE id = ?');
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, name, streak_current, streak_longest)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertProfile = db.prepare(`
    INSERT OR IGNORE INTO user_profiles (user_id, bio, activity_public)
    VALUES (?, ?, 1)
  `);

  let usersCreated = 0;
  for (const user of demoUsers) {
    const existing = checkUser.get(user.id);
    if (!existing) {
      insertUser.run(user.id, user.email, user.name, user.streak, user.longest);
      insertProfile.run(user.id, user.bio);
      usersCreated++;
    }
  }

  if (usersCreated > 0) {
    console.log(`Created ${usersCreated} demo users for social features`);
  }

  console.log('Database initialized successfully');
}
