# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
npm install   # or pnpm install

# Start development server (http://localhost:5173)
npm run dev   # or pnpm dev

# Build for production
npm run build # or pnpm build
```

Note: There are no test or lint commands configured in this project yet.

## Technology Stack

- **React 18** with TypeScript
- **Vite 6** for build tooling and dev server
- **Tailwind CSS v4** for styling
- **Radix UI / shadcn/ui** for accessible component primitives (50+ components in `src/app/components/ui/`)
- **MUI Material** for additional UI components
- **Recharts** for data visualization
- **React Hook Form** for form handling
- **motion/react** for animations
- **react-dnd** for drag-and-drop functionality

Path alias: `@` → `./src`

## Architecture

### Routing & State
The app uses a custom view-based routing system via `useState` in `App.tsx`. No external router or state management library is used. Views are selected by setting a `currentView` state variable.

### Directory Structure

- **`src/app/App.tsx`** - Main application component, handles view routing and deck selection
- **`src/app/views/`** - Page-level components (Dashboard, StudyMode, FlashcardSetView, Settings, Social, etc.)
- **`src/app/views/creation-modes/`** - Different deck creation methods (Manual, AI Generate, PDF Upload, Image-to-Card, Import)
- **`src/app/components/`** - Reusable components (StudyCard, FlashcardSetCard, StreakCalendar, ProgressBar)
- **`src/app/components/ui/`** - shadcn/ui base components
- **`src/app/data/mockData.ts`** - Mock flashcard decks and sample data
- **`src/styles/`** - Global CSS including theme variables

### Key Components

- **StudyMode** (`views/StudyMode.tsx`) - Interactive study session with 3D card flip animations and spaced repetition logic (Hard/Good/Easy ratings with interval scheduling)
- **Dashboard** (`views/Dashboard.tsx`) - Home view with study statistics, streak tracking, and quick actions
- **FlashcardSetView** (`views/FlashcardSetView.tsx`) - Deck detail view with card management

### Data Model

Flashcard decks contain cards with statuses: `'new' | 'review' | 'mastered'`. Cards can be standard flashcards or multiple-choice format.

### Design System

CSS custom properties in `src/styles/theme.css`:
- Primary: Teal (#14b8a6)
- Secondary: Coral (#ff7f66)
- Status colors: Mastered (green), Review (amber), New (red)
- Dark mode support is pre-configured
