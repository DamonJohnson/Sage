/**
 * Database Seed Script
 *
 * Populates the database with sample data for testing and development.
 * Run with: npx tsx src/db/seed.ts
 */

import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path matches config.ts
const dbPath = path.join(__dirname, '../../data/sage.db');
console.log('Using database:', dbPath);
const db = new Database(dbPath);

// Demo users (must match the IDs in index.ts)
const demoUsers = [
  { id: 'user-sarah', email: 'sarah@example.com', name: 'Sarah Chen', bio: 'Medical student, loves anatomy flashcards' },
  { id: 'user-alex', email: 'alex@example.com', name: 'Alex Rivera', bio: 'Language learner - Spanish, Japanese, French' },
  { id: 'user-jordan', email: 'jordan@example.com', name: 'Jordan Kim', bio: 'Computer science major, preparing for interviews' },
  { id: 'user-emma', email: 'emma@example.com', name: 'Emma Thompson', bio: 'History buff and trivia lover' },
  { id: 'user-marcus', email: 'marcus@example.com', name: 'Marcus Johnson', bio: 'Learning music theory one card at a time' },
];

// Sample decks with cards - each linked to a demo user
const sampleDecks = [
  {
    title: 'Human Anatomy Basics',
    description: 'Essential anatomy flashcards for medical students and healthcare professionals. Covers major body systems and structures.',
    category: 'Science',
    tags: ['anatomy', 'medicine', 'biology', 'MCAT'],
    downloadCount: 6200,
    ratingSum: 2800,
    ratingCount: 620,
    userId: 'user-sarah', // Sarah Chen - medical student
    cards: [
      { front: 'What are the four chambers of the heart?', back: 'Right atrium, Right ventricle, Left atrium, Left ventricle. Blood flows: RA -> RV -> Lungs -> LA -> LV -> Body' },
      { front: 'Name the bones of the arm', back: 'Humerus (upper arm), Radius (lateral forearm), Ulna (medial forearm). "The radius rotates around the ulna."' },
      { front: 'What is the function of the cerebellum?', back: 'Coordinates voluntary movements, balance, and motor learning. Located at the back of the brain, below the cerebrum.' },
      { front: 'List the major parts of the digestive system', back: 'Mouth -> Esophagus -> Stomach -> Small intestine (duodenum, jejunum, ileum) -> Large intestine -> Rectum -> Anus' },
      { front: 'What are the three types of muscle tissue?', back: '1. Skeletal (voluntary, striated)\n2. Cardiac (involuntary, striated)\n3. Smooth (involuntary, non-striated)' },
      { front: 'Name the lobes of the brain', back: 'Frontal (reasoning, motor), Parietal (sensory), Temporal (hearing, memory), Occipital (vision)' },
    ],
  },
  {
    title: 'Japanese Hiragana & Katakana',
    description: 'Learn all Japanese syllabary characters with mnemonics and example words. Perfect for beginners starting their Japanese journey.',
    category: 'Languages',
    tags: ['japanese', 'hiragana', 'katakana', 'beginner'],
    downloadCount: 8700,
    ratingSum: 3800,
    ratingCount: 820,
    userId: 'user-alex', // Alex Rivera - language learner
    cards: [
      { front: 'あ - a', back: 'Hiragana for "a" - Looks like a person practicing an "A"rt form' },
      { front: 'い - i', back: 'Hiragana for "i" - Two vertical strokes like the "i" in "igloo"' },
      { front: 'う - u', back: 'Hiragana for "u" - Looks like a person bowing (sounds like "oo")' },
      { front: 'え - e', back: 'Hiragana for "e" - Looks like an "E"legant flowing line' },
      { front: 'お - o', back: 'Hiragana for "o" - Looks like a person holding an "o"range' },
      { front: 'ア - a', back: 'Katakana for "a" - Angular version, like an "A"rrow' },
      { front: 'イ - i', back: 'Katakana for "i" - Two straight strokes' },
      { front: 'ウ - u', back: 'Katakana for "u" - Looks like a "U"-turn sign' },
      { front: 'エ - e', back: 'Katakana for "e" - Three horizontal lines' },
      { front: 'オ - o', back: 'Katakana for "o" - Looks like a plus sign with a line' },
    ],
  },
  {
    title: 'Spanish for Travelers',
    description: 'Essential Spanish phrases and vocabulary for your next trip. Learn practical conversational Spanish quickly.',
    category: 'Languages',
    tags: ['spanish', 'travel', 'beginner', 'conversation'],
    downloadCount: 4500,
    ratingSum: 2000,
    ratingCount: 450,
    userId: 'user-alex', // Alex Rivera - language learner
    cards: [
      { front: 'Hello / Hi', back: 'Hola' },
      { front: 'Good morning', back: 'Buenos días' },
      { front: 'Good afternoon', back: 'Buenas tardes' },
      { front: 'Good night', back: 'Buenas noches' },
      { front: 'Please', back: 'Por favor' },
      { front: 'Thank you', back: 'Gracias' },
      { front: 'Where is...?', back: '¿Dónde está...?' },
      { front: 'How much does it cost?', back: '¿Cuánto cuesta?' },
      { front: 'I don\'t understand', back: 'No entiendo' },
      { front: 'Can you help me?', back: '¿Puede ayudarme?' },
    ],
  },
  {
    title: 'Data Structures & Algorithms',
    description: 'Essential CS concepts for coding interviews. Covers Big O, common data structures, and algorithm patterns.',
    category: 'Technology',
    tags: ['programming', 'interviews', 'computer-science', 'algorithms'],
    downloadCount: 5400,
    ratingSum: 2400,
    ratingCount: 540,
    userId: 'user-jordan', // Jordan Kim - CS major
    cards: [
      { front: 'What is Big O notation?', back: 'A way to describe the performance or complexity of an algorithm. Describes the worst-case scenario in terms of time or space as input grows.' },
      { front: 'What is O(1)?', back: 'Constant time - operation takes same time regardless of input size. Example: Array access by index, HashMap lookup.' },
      { front: 'What is O(n)?', back: 'Linear time - time grows proportionally with input. Example: Linear search, iterating through an array once.' },
      { front: 'What is O(log n)?', back: 'Logarithmic time - time grows slowly as input increases. Example: Binary search, balanced BST operations.' },
      { front: 'What is a Hash Table?', back: 'Data structure that maps keys to values using a hash function. Average O(1) for insert, delete, lookup. Handles collisions via chaining or open addressing.' },
      { front: 'What is a Binary Search Tree?', back: 'Tree where left child < parent < right child. Average O(log n) for operations. Can degrade to O(n) if unbalanced.' },
      { front: 'What is BFS vs DFS?', back: 'BFS (Breadth-First): Uses queue, explores level by level. Good for shortest path.\nDFS (Depth-First): Uses stack/recursion, explores as deep as possible. Good for path finding, topological sort.' },
      { front: 'What is Dynamic Programming?', back: 'Optimization technique that solves complex problems by breaking into overlapping subproblems. Uses memoization (top-down) or tabulation (bottom-up).' },
    ],
  },
  {
    title: 'World War II Key Events',
    description: 'Major events, battles, and turning points of World War II. Essential for history students and enthusiasts.',
    category: 'History',
    tags: ['WWII', 'history', 'world-history', 'military'],
    downloadCount: 3800,
    ratingSum: 1700,
    ratingCount: 380,
    userId: 'user-emma', // Emma Thompson - history buff
    cards: [
      { front: 'When did WWII begin and end?', back: 'September 1, 1939 (Germany invades Poland) to September 2, 1945 (Japan surrenders). European theater ended May 8, 1945 (V-E Day).' },
      { front: 'What was D-Day?', back: 'June 6, 1944 - Allied invasion of Normandy, France. Largest amphibious military operation in history. Began the liberation of Western Europe.' },
      { front: 'What was the Battle of Stalingrad?', back: 'August 1942 - February 1943. Major defeat for Nazi Germany on the Eastern Front. Turning point of the war in Europe.' },
      { front: 'What was the Manhattan Project?', back: 'Secret US research project (1942-1946) that developed the first atomic bombs. Led by J. Robert Oppenheimer. Resulted in bombings of Hiroshima and Nagasaki.' },
      { front: 'What was the Holocaust?', back: 'Systematic genocide of 6 million Jews and millions of others by Nazi Germany. Included concentration camps, mass shootings, and gas chambers.' },
      { front: 'What was Pearl Harbor?', back: 'December 7, 1941 - Surprise Japanese attack on US naval base in Hawaii. Led to US entry into WWII. "A date which will live in infamy."' },
    ],
  },
  {
    title: 'Ancient Civilizations',
    description: 'Explore the great civilizations of the ancient world - Egypt, Greece, Rome, and more.',
    category: 'History',
    tags: ['ancient-history', 'civilizations', 'world-history'],
    downloadCount: 2900,
    ratingSum: 1300,
    ratingCount: 290,
    userId: 'user-emma', // Emma Thompson - history buff
    cards: [
      { front: 'When were the Egyptian pyramids built?', back: 'The Great Pyramid of Giza was built around 2560 BCE during the reign of Pharaoh Khufu. It took approximately 20 years to complete.' },
      { front: 'What was the Roman Republic?', back: 'Period of ancient Rome (509-27 BCE) with elected officials and a Senate. Ended when Augustus became the first Emperor.' },
      { front: 'Who was Alexander the Great?', back: 'King of Macedon (356-323 BCE) who created one of the largest empires in history, stretching from Greece to India. Never lost a battle.' },
      { front: 'What was the Silk Road?', back: 'Ancient network of trade routes connecting East and West (130 BCE - 1453 CE). Named for the lucrative silk trade. Spread ideas, religions, and technologies.' },
      { front: 'What was Athenian democracy?', back: 'Direct democracy in ancient Athens (5th century BCE). Male citizens voted directly on legislation. Excluded women, slaves, and non-citizens.' },
    ],
  },
  {
    title: 'Music Theory Fundamentals',
    description: 'Learn the basics of music theory - notes, scales, chords, and rhythm. Perfect for beginners and intermediate musicians.',
    category: 'Arts',
    tags: ['music', 'theory', 'piano', 'guitar'],
    downloadCount: 3200,
    ratingSum: 1500,
    ratingCount: 340,
    userId: 'user-marcus', // Marcus Johnson - music theory learner
    cards: [
      { front: 'What are the notes in the C major scale?', back: 'C - D - E - F - G - A - B - C\nNo sharps or flats. The "white keys" starting from C.' },
      { front: 'What is a major chord?', back: 'A three-note chord built with a root, major 3rd (4 semitones), and perfect 5th (7 semitones). Sounds "happy" or "bright".' },
      { front: 'What is a minor chord?', back: 'A three-note chord built with a root, minor 3rd (3 semitones), and perfect 5th (7 semitones). Sounds "sad" or "dark".' },
      { front: 'What is 4/4 time signature?', back: 'Four beats per measure, quarter note gets one beat. Also called "common time". Most popular time signature in Western music.' },
      { front: 'What is the Circle of Fifths?', back: 'A visual representation of key relationships. Moving clockwise adds sharps (G, D, A, E, B, F#, C#). Moving counterclockwise adds flats (F, Bb, Eb, Ab, Db, Gb).' },
      { front: 'What is an interval?', back: 'The distance between two pitches. Named by counting letter names (2nd, 3rd, etc.) and quality (major, minor, perfect, augmented, diminished).' },
      { front: 'What is tempo?', back: 'The speed of music, measured in BPM (beats per minute). Common markings: Largo (slow), Andante (walking), Allegro (fast), Presto (very fast).' },
    ],
  },
];

function seed() {
  console.log('Seeding database with demo data...');

  // First, clean up old seed data (decks from old sample users that no longer exist)
  const oldSeedEmails = ['studypro@sage.app', 'nihongomaster@sage.app', 'cloudguru@sage.app', 'medschool@sage.app', 'historygeek@sage.app'];

  // Find and delete decks from old seed users
  for (const email of oldSeedEmails) {
    const oldUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (oldUser) {
      // Delete cards from their decks first
      db.prepare(`
        DELETE FROM cards WHERE deck_id IN (SELECT id FROM decks WHERE user_id = ?)
      `).run(oldUser.id);
      // Delete their decks
      db.prepare('DELETE FROM decks WHERE user_id = ?').run(oldUser.id);
      // Delete the old user
      db.prepare('DELETE FROM users WHERE id = ?').run(oldUser.id);
      console.log(`Cleaned up old seed user: ${email}`);
    }
  }

  // Ensure demo users exist (they should be created in index.ts, but let's be safe)
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, streak_current, streak_longest, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertProfile = db.prepare(`
    INSERT OR IGNORE INTO user_profiles (user_id, bio, activity_public)
    VALUES (?, ?, 1)
  `);

  const streaks = [15, 22, 5, 12, 8];
  const longestStreaks = [30, 45, 20, 35, 25];

  for (let i = 0; i < demoUsers.length; i++) {
    const user = demoUsers[i];
    insertUser.run(user.id, user.email, user.name, streaks[i], longestStreaks[i]);
    insertProfile.run(user.id, user.bio);
  }
  console.log(`Ensured ${demoUsers.length} demo users exist`);

  // Check if we already have seeded decks for demo users
  const existingDemoDecks = db.prepare(`
    SELECT COUNT(*) as count FROM decks WHERE user_id IN ('user-sarah', 'user-alex', 'user-jordan', 'user-emma', 'user-marcus') AND is_public = 1
  `).get() as { count: number };

  if (existingDemoDecks.count > 0) {
    console.log(`Found ${existingDemoDecks.count} existing demo decks, skipping deck creation`);
    console.log('To re-seed decks, first delete them manually');
    return;
  }

  // Insert sample decks and cards
  const insertDeck = db.prepare(`
    INSERT INTO decks (id, user_id, title, description, is_public, category, tags, card_count, download_count, rating_sum, rating_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertCard = db.prepare(`
    INSERT INTO cards (id, deck_id, front, back, card_type, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'flashcard', ?, datetime('now'), datetime('now'))
  `);

  let totalCards = 0;
  for (const deck of sampleDecks) {
    const deckId = uuid();

    insertDeck.run(
      deckId,
      deck.userId,
      deck.title,
      deck.description,
      deck.category,
      JSON.stringify(deck.tags),
      deck.cards.length,
      deck.downloadCount,
      deck.ratingSum,
      deck.ratingCount
    );

    for (let i = 0; i < deck.cards.length; i++) {
      const card = deck.cards[i];
      insertCard.run(uuid(), deckId, card.front, card.back, i);
    }

    totalCards += deck.cards.length;
    console.log(`  Created deck: "${deck.title}" by ${demoUsers.find(u => u.id === deck.userId)?.name}`);
  }

  console.log(`\nInserted ${sampleDecks.length} sample decks with ${totalCards} cards`);
  console.log('Database seeded successfully!');
}

// Run seed
seed();
