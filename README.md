# Sage - Cross-Platform Flashcard App

A modern flashcard study application with spaced repetition (FSRS algorithm), AI-powered card generation, and ChatGPT plugin integration.

## Features

- **Cross-Platform**: iOS, Android, and Web via React Native
- **Spaced Repetition**: FSRS algorithm for optimal learning
- **AI Generation**: Create flashcards from any topic using OpenAI
- **Offline-First**: WatermelonDB for local storage with sync capability
- **ChatGPT Plugin**: Study directly from ChatGPT conversations
- **Beautiful UI**: React Native Paper with custom theming

## Project Structure

```
/sage-app
├── /app                  # React Native application
│   ├── /src
│   │   ├── /components   # Reusable UI components
│   │   ├── /screens      # Screen components
│   │   ├── /navigation   # React Navigation setup
│   │   ├── /store        # Zustand state management
│   │   ├── /theme        # Design system
│   │   └── App.tsx
│   └── package.json
│
├── /backend              # Express API server
│   ├── /src
│   │   ├── /api          # Route handlers
│   │   ├── /services     # Business logic (FSRS, AI)
│   │   ├── /db           # SQLite database
│   │   ├── /openapi      # ChatGPT plugin spec
│   │   └── server.ts
│   └── package.json
│
├── /shared               # Shared TypeScript types
│   └── types.ts
│
└── package.json          # Root workspace config
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- Xcode (for iOS development)
- Android Studio (for Android development)
- Expo Go app on your phone (for quick testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/damonjohnson/sage-app.git
cd sage-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start both app and backend
npm run dev
```

### Running the App

**All platforms from one terminal:**

```bash
cd app
npm run dev
```

This opens Expo DevTools. From there:
- Press `w` for **Web** browser
- Press `i` for **iOS Simulator** (Mac only)
- Press `a` for **Android Emulator**
- Scan QR code with **Expo Go** app for physical devices

**Backend only:**

```bash
cd backend
npm run dev
```

Server runs at http://localhost:3001

## Tech Stack

### Frontend
- React Native 0.73 + Expo
- React Navigation 6
- React Native Paper (Material Design 3)
- Zustand (state management)
- React Native Reanimated (animations)

### Backend
- Node.js + Express + TypeScript
- SQLite (dev) / PostgreSQL (prod-ready)
- FSRS spaced repetition algorithm
- OpenAI integration

### ChatGPT Plugin
- OpenAPI 3.1 specification
- Full study session support
- Deck management via conversation

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/decks` | GET/POST | List/create decks |
| `/api/decks/:id` | GET/PUT/DELETE | Deck operations |
| `/api/decks/:id/cards` | GET/POST | Card operations |
| `/api/study/due` | GET | Get due cards |
| `/api/study/review` | POST | Submit review |
| `/api/study/stats` | GET | Learning statistics |
| `/api/ai/generate-from-topic` | POST | AI card generation |
| `/api/public/decks` | GET | Browse public decks |

## Environment Variables

See `.env.example` for all configuration options. Key variables:

- `OPENAI_API_KEY`: Required for AI card generation
- `JWT_SECRET`: Required for authentication
- `DB_PATH`: SQLite database location

## Development Notes

### Adding a New Screen

1. Create screen in `/app/src/screens/<category>/`
2. Add to navigation in `/app/src/navigation/types.ts`
3. Register in `RootNavigator.tsx` or `TabNavigator.tsx`

### Styling

Uses a design system defined in `/app/src/theme/`:
- `colors.ts` - Color palette
- `typography.ts` - Font styles
- `spacing.ts` - Spacing scale and shadows

### State Management

Zustand stores in `/app/src/store/`:
- `useAuthStore` - User and settings
- `useDeckStore` - Decks and cards
- `useStudyStore` - Study session state

## License

MIT
