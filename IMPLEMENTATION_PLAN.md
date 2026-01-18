# Sage Cross-Platform Implementation Plan

## Executive Summary

Transform the existing React/Vite flashcard prototype into a production-ready cross-platform application with:
- React Native + React Native Web for iOS/Android/Web
- Node.js/Express backend with FSRS spaced repetition
- ChatGPT plugin with full study capabilities
- OAuth authentication (Google, Apple)
- WatermelonDB for offline-capable local storage

---

## 1. Repository Structure

```
/sage-app
├── /app                          # React Native application
│   ├── /src
│   │   ├── /components           # Reusable UI components
│   │   │   ├── /ui               # Base UI primitives (Button, Card, Input, etc.)
│   │   │   ├── /study            # StudyCard, RatingButtons, ProgressBar
│   │   │   ├── /deck             # DeckCard, DeckList, DeckHeader
│   │   │   ├── /navigation       # TabBar, Sidebar, Header
│   │   │   └── /common           # Modal, Toast, Loading, EmptyState
│   │   ├── /screens              # Screen components
│   │   │   ├── /auth             # Login, Register, OAuth callbacks
│   │   │   ├── /dashboard        # Home screen
│   │   │   ├── /library          # Deck library
│   │   │   ├── /study            # StudyMode, QuizMode
│   │   │   ├── /create           # CreateDeck hub + modes
│   │   │   ├── /discover         # Browse public decks
│   │   │   ├── /profile          # User profile, stats
│   │   │   └── /settings         # App settings
│   │   ├── /navigation           # React Navigation configuration
│   │   │   ├── RootNavigator.tsx
│   │   │   ├── TabNavigator.tsx
│   │   │   ├── AuthNavigator.tsx
│   │   │   └── types.ts
│   │   ├── /services             # API clients
│   │   │   ├── api.ts            # Axios instance + interceptors
│   │   │   ├── auth.ts           # OAuth flows
│   │   │   ├── decks.ts          # Deck CRUD
│   │   │   ├── cards.ts          # Card operations
│   │   │   ├── srs.ts            # SRS API calls
│   │   │   └── sync.ts           # Offline sync logic
│   │   ├── /store                # Zustand state management
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useDeckStore.ts
│   │   │   ├── useStudyStore.ts
│   │   │   ├── useSettingsStore.ts
│   │   │   └── index.ts
│   │   ├── /db                   # WatermelonDB setup
│   │   │   ├── schema.ts
│   │   │   ├── models/
│   │   │   │   ├── Deck.ts
│   │   │   │   ├── Card.ts
│   │   │   │   ├── Review.ts
│   │   │   │   └── User.ts
│   │   │   └── index.ts
│   │   ├── /hooks                # Custom React hooks
│   │   │   ├── useStudySession.ts
│   │   │   ├── useDueCards.ts
│   │   │   ├── useSync.ts
│   │   │   └── useTheme.ts
│   │   ├── /utils                # Shared utilities
│   │   │   ├── fsrs.ts           # FSRS algorithm (client reference)
│   │   │   ├── constants.ts
│   │   │   ├── formatting.ts
│   │   │   └── validation.ts
│   │   ├── /theme                # Design system
│   │   │   ├── colors.ts
│   │   │   ├── typography.ts
│   │   │   ├── spacing.ts
│   │   │   └── index.ts
│   │   ├── /assets               # Images, fonts
│   │   └── App.tsx
│   ├── /ios                      # iOS native code
│   ├── /android                  # Android native code
│   ├── /web                      # Web-specific config
│   ├── app.json
│   ├── metro.config.js
│   ├── babel.config.js
│   └── package.json
│
├── /backend                      # Express API server
│   ├── /src
│   │   ├── /api                  # Route handlers
│   │   │   ├── /routes
│   │   │   │   ├── auth.ts
│   │   │   │   ├── decks.ts
│   │   │   │   ├── cards.ts
│   │   │   │   ├── study.ts
│   │   │   │   ├── public.ts
│   │   │   │   └── ai.ts
│   │   │   ├── /middleware
│   │   │   │   ├── auth.ts
│   │   │   │   ├── validation.ts
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── errorHandler.ts
│   │   │   └── index.ts
│   │   ├── /models               # Database models
│   │   │   ├── User.ts
│   │   │   ├── Deck.ts
│   │   │   ├── Card.ts
│   │   │   ├── Review.ts
│   │   │   └── index.ts
│   │   ├── /services             # Business logic
│   │   │   ├── fsrs.ts           # FSRS implementation
│   │   │   ├── ai.ts             # OpenAI integration
│   │   │   ├── oauth.ts          # OAuth providers
│   │   │   └── sync.ts           # Client sync handling
│   │   ├── /openapi              # ChatGPT plugin
│   │   │   ├── spec.yaml         # OpenAPI 3.1 specification
│   │   │   ├── plugin.json       # ChatGPT plugin manifest
│   │   │   └── handlers.ts       # Plugin-specific handlers
│   │   ├── /db                   # Database setup
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── index.ts
│   │   ├── /utils
│   │   │   ├── jwt.ts
│   │   │   └── validation.ts
│   │   ├── config.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
├── /shared                       # Shared types & constants
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── constants.ts              # Shared constants
│   └── package.json
│
├── package.json                  # Root workspace config
├── .env.example
├── docker-compose.yml            # Local dev with PostgreSQL
├── README.md
└── CLAUDE.md
```

---

## 2. Technology Stack

### Frontend (React Native)

| Category | Technology | Rationale |
|----------|------------|-----------|
| Framework | React Native 0.73+ | Cross-platform, mature ecosystem |
| Web | React Native Web | Unified codebase for web |
| Navigation | React Navigation 6 | Industry standard, bottom tabs + stack |
| UI Library | React Native Paper 5 | Material Design 3, accessible, customizable |
| State | Zustand | Lightweight, TypeScript-first, no boilerplate |
| Database | WatermelonDB | SQLite-based, reactive, offline-first, sync-ready |
| Animation | react-native-reanimated 3 | 60fps, worklet-based, matrix transforms |
| Gestures | react-native-gesture-handler | Native gesture system |
| Forms | react-hook-form | Performant, minimal re-renders |
| HTTP | Axios | Interceptors, request/response handling |
| Auth | expo-auth-session | OAuth flows for Google/Apple |
| Icons | @expo/vector-icons | Comprehensive icon sets |

### Backend (Node.js)

| Category | Technology | Rationale |
|----------|------------|-----------|
| Runtime | Node.js 20 LTS | Stability, performance |
| Framework | Express 4 | Simple, flexible, well-documented |
| Language | TypeScript 5 | Type safety, better DX |
| Database | SQLite (dev) / PostgreSQL (prod) | Easy local dev, scalable prod |
| ORM | Drizzle ORM | Type-safe, lightweight, SQL-first |
| Validation | Zod | Schema validation, TypeScript inference |
| Auth | Passport.js | OAuth strategies, session handling |
| AI | OpenAI SDK | GPT-4o for card generation |
| Docs | OpenAPI 3.1 | ChatGPT plugin compatibility |

---

## 3. Navigation Architecture

### Mobile (Bottom Tabs + Stack)

```
TabNavigator (Bottom)
├── Home Tab → DashboardStack
│   ├── Dashboard (home)
│   ├── DeckView (deck details)
│   └── StudyMode (study session)
├── Library Tab → LibraryStack
│   ├── Library (deck grid)
│   ├── DeckView
│   └── StudyMode
├── Create Tab → CreateStack
│   ├── CreateDeckHub
│   ├── AIGenerateMode
│   ├── ManualMode
│   ├── PDFUploadMode
│   └── ImageToCardMode
├── Discover Tab → DiscoverStack
│   ├── BrowseDecks
│   └── DeckPreview
└── Profile Tab → ProfileStack
    ├── Profile
    ├── Statistics
    ├── Achievements
    └── Settings
```

### Tablet/Desktop (Sidebar + Content)

```
SidebarLayout
├── Sidebar (persistent, collapsible)
│   ├── Home
│   ├── Library
│   ├── Spaced Repetition
│   │   ├── Daily Review
│   │   ├── Due Cards
│   │   └── Statistics
│   ├── Discover
│   └── Profile/Settings
└── ContentArea
    └── [Active Screen]
```

### Responsive Breakpoints

| Breakpoint | Layout | Navigation |
|------------|--------|------------|
| < 768px | Mobile | Bottom tabs |
| 768-1024px | Tablet | Collapsible sidebar + bottom tabs |
| > 1024px | Desktop | Persistent sidebar |

---

## 4. Database Schema

### WatermelonDB (Client) & PostgreSQL (Server)

```typescript
// User
{
  id: string (UUID)
  email: string
  name: string
  avatar_url: string | null
  oauth_provider: 'google' | 'apple'
  oauth_id: string
  streak_current: number
  streak_longest: number
  last_study_date: string | null
  settings: JSON
  created_at: timestamp
  updated_at: timestamp
}

// Deck
{
  id: string (UUID)
  user_id: string (FK)
  title: string
  description: string
  is_public: boolean
  category: string | null
  tags: string[]
  card_count: number
  download_count: number (for public)
  rating_sum: number
  rating_count: number
  created_at: timestamp
  updated_at: timestamp
  synced_at: timestamp | null
}

// Card
{
  id: string (UUID)
  deck_id: string (FK)
  front: string
  back: string
  card_type: 'flashcard' | 'multiple_choice'
  options: JSON | null  // for multiple choice
  position: number
  created_at: timestamp
  updated_at: timestamp
}

// CardState (FSRS scheduling data)
{
  id: string (UUID)
  card_id: string (FK)
  user_id: string (FK)

  // FSRS fields
  stability: number      // Memory stability
  difficulty: number     // Card difficulty (0-10)
  elapsed_days: number   // Days since last review
  scheduled_days: number // Days until next review
  reps: number           // Total repetitions
  lapses: number         // Times forgotten
  state: 'new' | 'learning' | 'review' | 'relearning'
  due: timestamp         // Next review date
  last_review: timestamp | null

  created_at: timestamp
  updated_at: timestamp
}

// ReviewLog (for analytics & FSRS optimization)
{
  id: string (UUID)
  card_id: string (FK)
  user_id: string (FK)
  rating: 1 | 2 | 3 | 4  // Again, Hard, Good, Easy
  state: 'new' | 'learning' | 'review' | 'relearning'
  elapsed_days: number
  scheduled_days: number
  review_time_ms: number
  created_at: timestamp
}
```

---

## 5. FSRS Algorithm Implementation

### Core FSRS Parameters (Backend)

```typescript
// /backend/src/services/fsrs.ts

interface FSRSParams {
  request_retention: number  // Target retention rate (default: 0.9)
  maximum_interval: number   // Max days between reviews (default: 36500)
  w: number[]               // 17 optimizable parameters
}

const DEFAULT_PARAMS: FSRSParams = {
  request_retention: 0.9,
  maximum_interval: 36500,
  w: [
    0.4, 0.6, 2.4, 5.8,     // Initial stability for each rating
    4.93, 0.94, 0.86, 0.01, // Difficulty parameters
    1.49, 0.14, 0.94,       // Stability parameters
    2.18, 0.05, 0.34,       // Recall parameters
    1.26, 0.29, 2.61        // Forgetting parameters
  ]
}

interface SchedulingInfo {
  card: CardState
  reviewLog: ReviewLog
  nextStates: {
    again: CardState
    hard: CardState
    good: CardState
    easy: CardState
  }
}

function schedule(card: CardState, now: Date): SchedulingInfo
function review(card: CardState, rating: Rating, now: Date): CardState
```

### API Endpoints

```
POST /api/study/schedule
  Body: { card_ids: string[] }
  Returns: { cards: SchedulingInfo[] }

POST /api/study/review
  Body: { card_id: string, rating: 1|2|3|4, review_time_ms: number }
  Returns: { card_state: CardState, next_due: string }

GET /api/study/due
  Query: { limit?: number }
  Returns: { cards: Card[], count: number }

GET /api/study/stats
  Returns: { reviewed_today: number, due_today: number, streak: number, ... }
```

---

## 6. API Design

### Authentication

```
POST /api/auth/google          # Google OAuth
POST /api/auth/apple           # Apple OAuth
POST /api/auth/refresh         # Refresh JWT
POST /api/auth/logout          # Invalidate session
GET  /api/auth/me              # Current user
```

### Decks

```
GET    /api/decks              # List user's decks
POST   /api/decks              # Create deck
GET    /api/decks/:id          # Get deck with cards
PUT    /api/decks/:id          # Update deck
DELETE /api/decks/:id          # Delete deck
POST   /api/decks/:id/clone    # Clone public deck to library
```

### Cards

```
GET    /api/decks/:deckId/cards           # List cards
POST   /api/decks/:deckId/cards           # Add card(s)
PUT    /api/decks/:deckId/cards/:cardId   # Update card
DELETE /api/decks/:deckId/cards/:cardId   # Delete card
POST   /api/decks/:deckId/cards/reorder   # Reorder cards
```

### Public Decks

```
GET  /api/public/decks         # Browse public decks
GET  /api/public/decks/:id     # Preview public deck
POST /api/public/decks/:id/rate  # Rate a deck
GET  /api/public/categories    # List categories
GET  /api/public/trending      # Trending decks
```

### AI Generation

```
POST /api/ai/generate-from-topic
  Body: { topic: string, count: number, difficulty: string }
  Returns: { cards: GeneratedCard[] }

POST /api/ai/generate-from-text
  Body: { text: string, count: number }
  Returns: { cards: GeneratedCard[] }

POST /api/ai/generate-from-pdf
  Body: FormData with PDF file
  Returns: { cards: GeneratedCard[] }

POST /api/ai/generate-from-image
  Body: FormData with image file
  Returns: { cards: GeneratedCard[] }
```

### Sync

```
POST /api/sync/push
  Body: { changes: Change[] }
  Returns: { conflicts: Conflict[], server_time: timestamp }

POST /api/sync/pull
  Body: { last_sync: timestamp }
  Returns: { changes: Change[], server_time: timestamp }
```

---

## 7. ChatGPT Plugin Design

### Plugin Manifest (`/.well-known/ai-plugin.json`)

```json
{
  "schema_version": "v1",
  "name_for_human": "Sage Flashcards",
  "name_for_model": "sage_flashcards",
  "description_for_human": "Create, study, and manage flashcard decks with spaced repetition.",
  "description_for_model": "Plugin for managing flashcard decks and studying with spaced repetition. Can create decks from topics, study cards with SRS ratings, browse public decks, and track learning progress. Use this when users want to learn or memorize information.",
  "auth": {
    "type": "oauth",
    "client_url": "https://api.sage.app/oauth/authorize",
    "scope": "read write",
    "authorization_url": "https://api.sage.app/oauth/token"
  },
  "api": {
    "type": "openapi",
    "url": "https://api.sage.app/openapi.yaml"
  }
}
```

### Key Plugin Operations

```yaml
# Study Session Flow
/plugin/study/start:
  post:
    summary: Start a study session
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              deck_id: { type: string }
              card_limit: { type: integer, default: 20 }
    responses:
      200:
        description: First card to study
        content:
          application/json:
            schema:
              type: object
              properties:
                session_id: { type: string }
                card: { $ref: '#/components/schemas/StudyCard' }
                progress: { type: object }

/plugin/study/answer:
  post:
    summary: Submit answer and get next card
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              session_id: { type: string }
              card_id: { type: string }
              rating: { type: integer, enum: [1, 2, 3, 4] }
    responses:
      200:
        description: Next card or session complete
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/NextCard'
                - $ref: '#/components/schemas/SessionComplete'

# Deck Management
/plugin/decks:
  get:
    summary: List user's decks with study stats
  post:
    summary: Create a new deck (optionally with AI)

/plugin/decks/{id}/cards:
  get:
    summary: Get cards from a deck
  post:
    summary: Add cards to deck

# Quick Actions
/plugin/generate:
  post:
    summary: Generate flashcards from a topic
    description: |
      Creates a new deck with AI-generated flashcards.
      User provides a topic and optional parameters.

/plugin/stats:
  get:
    summary: Get learning statistics and streak info
```

### ChatGPT Conversation Examples

**Example 1: Study Session**
```
User: "I want to study my Spanish vocabulary deck"

ChatGPT: [Calls /plugin/study/start with Spanish deck]
"Let's study Spanish! Here's your first card:

**Front:** ¿Cómo estás?

Think about the answer, then tell me when you're ready to see it."

User: "I'm ready"

ChatGPT: "**Answer:** How are you?

How well did you remember this?
1. Again (forgot)
2. Hard (struggled)
3. Good (some effort)
4. Easy (instant recall)"

User: "3"

ChatGPT: [Calls /plugin/study/answer with rating 3]
"Great! Next review in 2 days.

Next card (3/20):
**Front:** Buenos días..."
```

**Example 2: Create Deck**
```
User: "Create flashcards about the French Revolution"

ChatGPT: [Calls /plugin/generate]
"I've created a deck with 15 cards about the French Revolution:

📚 **French Revolution** (15 cards)

Sample cards:
• What year did the French Revolution begin? → 1789
• What was the Bastille? → A medieval fortress and prison...
• Who was Maximilien Robespierre? → A radical leader...

Would you like to start studying, add more cards, or make changes?"
```

---

## 8. Component Migration Strategy

### From Prototype → React Native

| Prototype Component | React Native Component | Changes |
|---------------------|------------------------|---------|
| `StudyCard.tsx` | `components/study/StudyCard.tsx` | Reanimated 3D flip, Paper Surface |
| `FlashcardSetCard.tsx` | `components/deck/DeckCard.tsx` | Paper Card, native styling |
| `ProgressBar.tsx` | `components/ui/ProgressBar.tsx` | Native View + animated width |
| `StreakCalendar.tsx` | `components/common/StreakCalendar.tsx` | FlatList grid, SVG-free |
| `Button.tsx` | `components/ui/Button.tsx` | Paper Button with custom styling |
| `Modal.tsx` | `components/common/Modal.tsx` | Paper Modal/Portal |
| `AppSidebar.tsx` | `components/navigation/Sidebar.tsx` | DrawerContent + responsive |

### New Components Needed

| Component | Purpose |
|-----------|---------|
| `TabBar.tsx` | Custom bottom tab bar matching design |
| `RatingButtons.tsx` | Hard/Good/Easy buttons with haptics |
| `CardFlip.tsx` | Reanimated 3D matrix transform |
| `SyncIndicator.tsx` | Offline/syncing status |
| `EmptyState.tsx` | Empty list placeholders |
| `SkeletonLoader.tsx` | Loading skeletons |

---

## 9. Theme & Design System

### Colors (from prototype)

```typescript
// /app/src/theme/colors.ts

export const colors = {
  // Primary palette
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',  // Main teal
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  // Secondary (coral)
  secondary: {
    500: '#ff7f66',
    600: '#ff6b4d',
  },

  // Status colors
  status: {
    new: '#ef4444',      // Red
    learning: '#f59e0b', // Amber
    review: '#f59e0b',   // Amber
    mastered: '#10b981', // Green
  },

  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Semantic
  background: '#f8f9fa',
  surface: '#ffffff',
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
}
```

### Typography

```typescript
// /app/src/theme/typography.ts

export const typography = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },

  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}
```

### Spacing

```typescript
// /app/src/theme/spacing.ts

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
}

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
}
```

---

## 10. Key Improvements Over Prototype

### Architectural Improvements

| Area | Prototype | New Implementation |
|------|-----------|-------------------|
| Routing | useState-based | React Navigation (deep links, gestures) |
| State | Local useState | Zustand stores (persistent, reactive) |
| Data | Mock data only | WatermelonDB + API sync |
| SRS | Basic intervals | Full FSRS with optimization |
| Auth | None | OAuth (Google, Apple) |
| Offline | None | Full offline support |

### UX Improvements

1. **Haptic feedback** on card ratings and button presses
2. **Pull-to-refresh** on all list screens
3. **Swipe gestures** for card navigation
4. **Deep linking** to specific decks/cards
5. **Push notifications** for daily review reminders
6. **Widget support** (iOS/Android) for quick stats

### Performance Improvements

1. **Lazy loading** screens with React.lazy
2. **Image caching** with FastImage
3. **List virtualization** with FlashList
4. **Background sync** for offline changes
5. **Optimistic updates** for instant feedback

---

## 11. Implementation Phases

### Phase 1: Foundation (Current)
- [ ] Set up monorepo structure
- [ ] Initialize React Native project with Expo
- [ ] Configure React Native Paper theme
- [ ] Set up navigation structure
- [ ] Implement base UI components
- [ ] Set up WatermelonDB schema

### Phase 2: Core Features
- [ ] Dashboard screen
- [ ] Library screen with deck grid
- [ ] Deck detail view
- [ ] Study mode with 3D flip animation
- [ ] FSRS rating system
- [ ] Basic local storage

### Phase 3: Backend & Sync
- [ ] Express server setup
- [ ] Database migrations
- [ ] Auth endpoints (OAuth)
- [ ] Deck/Card CRUD APIs
- [ ] FSRS service implementation
- [ ] Client-server sync

### Phase 4: AI & Creation
- [ ] AI generation endpoints
- [ ] Topic-based generation UI
- [ ] PDF upload processing
- [ ] Image-to-card flow
- [ ] Manual card creation

### Phase 5: Social & Discovery
- [ ] Public deck browsing
- [ ] Deck import/clone
- [ ] Rating system
- [ ] User profiles

### Phase 6: ChatGPT Plugin
- [ ] OpenAPI specification
- [ ] Plugin manifest
- [ ] Study session endpoints
- [ ] Plugin OAuth flow
- [ ] Testing & submission

### Phase 7: Polish & Launch
- [ ] Push notifications
- [ ] Widgets
- [ ] App Store assets
- [ ] Performance optimization
- [ ] Beta testing

---

## 12. Questions Resolved

| Question | Decision |
|----------|----------|
| Navigation | Bottom tabs (mobile), sidebar (tablet/desktop) |
| SRS Location | API-first with FSRS |
| AI Provider | OpenAI (backend-only) |
| ChatGPT Plugin | Full access with study capabilities |
| UI Library | React Native Paper |
| Local Storage | WatermelonDB |
| Auth | OAuth (Google, Apple) - integrate now |
| Repo Structure | Single repo with /app and /backend |
| 3D Animation | react-native-reanimated matrix transforms |

---

## 13. Files to Create First

1. `package.json` (root workspace)
2. `/app/package.json`
3. `/backend/package.json`
4. `/shared/types.ts`
5. `/app/src/theme/index.ts`
6. `/app/src/navigation/RootNavigator.tsx`
7. `/app/src/components/ui/Button.tsx`
8. `/app/src/components/study/StudyCard.tsx`
9. `/app/src/screens/dashboard/DashboardScreen.tsx`
10. `/backend/src/server.ts`

---

## Awaiting Approval

Please review this plan and let me know:

1. **Approve as-is** - I'll begin implementation
2. **Modifications needed** - Specify what to change
3. **Questions** - I'll clarify any points

Once approved, I'll start with Phase 1 and provide code for your review.
remove t