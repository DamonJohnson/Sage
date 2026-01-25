/**
 * Deck API Service
 *
 * Handles all deck and card CRUD operations with the backend API.
 */

import { Platform } from 'react-native';
import { apiRequest, APIResponse } from './api';
import type { Deck, DeckWithStats, Card } from '@sage/shared';
import { useAuthStore } from '@/store/useAuthStore';

// Get current user ID from auth store
function getUserId(): string {
  const user = useAuthStore.getState().user;
  return user?.id || 'stub-user-1';
}

// Helper to add user ID header to requests
function withUserHeader() {
  return {
    headers: {
      'x-user-id': getUserId(),
    },
  };
}

// ============================================
// DECK OPERATIONS
// ============================================

/**
 * Fetch all decks for the current user
 */
export async function fetchDecks(): Promise<APIResponse<DeckWithStats[]>> {
  const response = await apiRequest<any[]>('GET', '/api/decks', undefined, withUserHeader());

  if (response.success && response.data) {
    // Transform backend response to match frontend types
    const decks: DeckWithStats[] = response.data.map(transformDeckFromAPI);
    return { success: true, data: decks };
  }

  return response as APIResponse<DeckWithStats[]>;
}

/**
 * Fetch a single deck with its cards
 */
export async function fetchDeck(deckId: string): Promise<APIResponse<{ deck: DeckWithStats; cards: Card[] }>> {
  const response = await apiRequest<any>('GET', `/api/decks/${deckId}`, undefined, withUserHeader());

  if (response.success && response.data) {
    const deck = transformDeckFromAPI(response.data);
    const cards = (response.data.cards || []).map(transformCardFromAPI);
    return { success: true, data: { deck, cards } };
  }

  return response as APIResponse<{ deck: DeckWithStats; cards: Card[] }>;
}

/**
 * Create a new deck
 */
export async function createDeck(deckData: {
  title: string;
  description?: string;
  isPublic?: boolean;
  category?: string;
  tags?: string[];
}): Promise<APIResponse<DeckWithStats>> {
  const response = await apiRequest<any>('POST', '/api/decks', deckData, withUserHeader());

  if (response.success && response.data) {
    return { success: true, data: transformDeckFromAPI(response.data) };
  }

  return response as APIResponse<DeckWithStats>;
}

/**
 * Update an existing deck
 */
export async function updateDeckAPI(
  deckId: string,
  updates: Partial<{
    title: string;
    description: string;
    isPublic: boolean;
    category: string;
    tags: string[];
  }>
): Promise<APIResponse<DeckWithStats>> {
  const response = await apiRequest<any>('PUT', `/api/decks/${deckId}`, updates, withUserHeader());

  if (response.success && response.data) {
    return { success: true, data: transformDeckFromAPI(response.data) };
  }

  return response as APIResponse<DeckWithStats>;
}

/**
 * Delete a deck
 */
export async function deleteDeckAPI(deckId: string): Promise<APIResponse<void>> {
  return apiRequest<void>('DELETE', `/api/decks/${deckId}`, undefined, withUserHeader());
}

// ============================================
// CARD OPERATIONS
// ============================================

/**
 * Fetch cards for a deck
 */
export async function fetchCards(deckId: string): Promise<APIResponse<Card[]>> {
  const response = await apiRequest<any[]>('GET', `/api/decks/${deckId}/cards`, undefined, withUserHeader());

  if (response.success && response.data) {
    const cards = response.data.map(transformCardFromAPI);
    return { success: true, data: cards };
  }

  return response as APIResponse<Card[]>;
}

/**
 * Add cards to a deck
 */
export async function addCardsAPI(
  deckId: string,
  cards: Array<{
    front: string;
    back: string;
    frontImage?: string | null;
    backImage?: string | null;
    cardType?: 'flashcard' | 'multiple_choice';
    options?: string[] | null;
    explanation?: string | null;
  }>
): Promise<APIResponse<Card[]>> {
  const response = await apiRequest<any[]>('POST', `/api/decks/${deckId}/cards`, { cards }, withUserHeader());

  if (response.success && response.data) {
    const createdCards = response.data.map(transformCardFromAPI);
    return { success: true, data: createdCards };
  }

  return response as APIResponse<Card[]>;
}

/**
 * Update a card
 */
export async function updateCardAPI(
  deckId: string,
  cardId: string,
  updates: Partial<{
    front: string;
    back: string;
    frontImage: string | null;
    backImage: string | null;
    cardType: 'flashcard' | 'multiple_choice';
    options: string[] | null;
  }>
): Promise<APIResponse<Card>> {
  const response = await apiRequest<any>('PUT', `/api/decks/${deckId}/cards/${cardId}`, updates, withUserHeader());

  if (response.success && response.data) {
    return { success: true, data: transformCardFromAPI(response.data) };
  }

  return response as APIResponse<Card>;
}

/**
 * Delete a card
 */
export async function deleteCardAPI(deckId: string, cardId: string): Promise<APIResponse<void>> {
  return apiRequest<void>('DELETE', `/api/decks/${deckId}/cards/${cardId}`, undefined, withUserHeader());
}

// ============================================
// DATA TRANSFORMERS
// ============================================

/**
 * Transform deck data from API format to frontend format
 * Note: Backend returns camelCase, so we check for both camelCase and snake_case for compatibility
 */
function transformDeckFromAPI(data: any): DeckWithStats {
  const cardCount = data.cardCount ?? data.card_count ?? 0;
  const masteredCount = data.masteredCount ?? data.mastered_count ?? 0;

  return {
    id: data.id,
    userId: data.userId ?? data.user_id,
    title: data.title,
    description: data.description || '',
    isPublic: Boolean(data.isPublic ?? data.is_public),
    cardCount: cardCount,
    downloadCount: data.downloadCount ?? data.download_count ?? 0,
    ratingSum: data.ratingSum ?? data.rating_sum ?? 0,
    ratingCount: data.ratingCount ?? data.rating_count ?? 0,
    createdAt: data.createdAt ?? data.created_at,
    updatedAt: data.updatedAt ?? data.updated_at,
    // Original author tracking (backend returns camelCase)
    originalAuthorId: data.originalAuthorId ?? data.original_author_id ?? null,
    originalAuthorName: data.originalAuthorName ?? data.original_author_name ?? null,
    originalAuthorAvatar: data.originalAuthorAvatar ?? data.original_author_avatar ?? null,
    originalDeckId: data.originalDeckId ?? data.original_deck_id ?? null,
    // Stats fields
    masteredCount: masteredCount,
    learningCount: data.learningCount ?? data.learning_count ?? 0,
    newCount: data.newCount ?? data.new_count ?? 0,
    dueCount: data.dueCount ?? data.due_count ?? 0,
    lastStudied: data.lastStudied ?? data.last_studied ?? null,
    nextReview: data.nextReview ?? data.next_review ?? null,
    masteryLevel: calculateMasteryLevel(masteredCount, cardCount),
  };
}

/**
 * Transform card data from API format to frontend format
 */
function transformCardFromAPI(data: any): Card {
  return {
    id: data.id,
    deckId: data.deck_id || data.deckId,
    front: data.front,
    back: data.back,
    explanation: data.explanation || null,
    frontImage: data.front_image || data.frontImage || null,
    backImage: data.back_image || data.backImage || null,
    cardType: data.card_type || data.cardType || 'flashcard',
    options: typeof data.options === 'string' ? JSON.parse(data.options) : data.options,
    position: data.position || 0,
    createdAt: data.created_at || data.createdAt,
    updatedAt: data.updated_at || data.updatedAt,
  };
}

/**
 * Calculate mastery level based on mastered cards
 */
function calculateMasteryLevel(mastered: number, total: number): 'beginner' | 'intermediate' | 'advanced' | 'mastered' {
  if (total === 0) return 'beginner';
  const ratio = mastered / total;
  if (ratio >= 0.9) return 'mastered';
  if (ratio >= 0.6) return 'advanced';
  if (ratio >= 0.3) return 'intermediate';
  return 'beginner';
}

// ============================================
// IMPORT OPERATIONS
// ============================================

interface ApkgImportResult {
  deckName: string;
  cards: Array<{ front: string; back: string }>;
}

/**
 * Import cards from an APKG file (Anki deck package)
 */
export async function importApkgFile(fileUri: string, fileName?: string, webFile?: File): Promise<APIResponse<ApkgImportResult>> {
  const formData = new FormData();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    console.log('importApkgFile called:', { fileUri, fileName, hasWebFile: !!webFile, platform: Platform.OS });

    // Handle different platforms
    if (Platform.OS === 'web') {
      if (webFile) {
        // Use the File object directly if available
        console.log('Using File object directly:', webFile.name, webFile.size, webFile.type);
        formData.append('file', webFile, fileName || webFile.name);
      } else {
        // Fallback: fetch the blob from the URI
        console.log('No File object, fetching from URI:', fileUri);
        try {
          const response = await fetch(fileUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
          }
          const blob = await response.blob();
          console.log('Got blob:', blob.size, blob.type);
          const file = new File([blob], fileName || 'deck.apkg', { type: 'application/zip' });
          formData.append('file', file);
        } catch (fetchError) {
          console.error('Failed to fetch blob from URI:', fetchError);
          return {
            success: false,
            error: `Failed to read file: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          };
        }
      }
    } else {
      // On native (iOS/Android), use the URI directly with React Native's FormData
      console.log('Native platform, using URI directly');
      formData.append('file', {
        uri: fileUri,
        name: fileName || 'deck.apkg',
        type: 'application/zip',
      } as any);
    }

    console.log('Uploading APKG file to:', `${apiUrl}/api/import/apkg`);

    const importResponse = await fetch(`${apiUrl}/api/import/apkg`, {
      method: 'POST',
      headers: {
        'x-user-id': getUserId(),
      },
      body: formData,
    });

    console.log('APKG import response status:', importResponse.status);

    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      console.error('APKG import error response:', errorText);
      return {
        success: false,
        error: `Server error: ${importResponse.status} - ${errorText}`,
      };
    }

    const data = await importResponse.json();
    console.log('APKG import response:', data);
    return data;
  } catch (error) {
    console.error('APKG import fetch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

export interface TextImportResult {
  deckName: string;
  cards: Array<{ front: string; back: string }>;
  method: 'csv' | 'csv-fallback' | 'ai';
}

/**
 * Import cards from text/CSV content using AI
 */
export async function importTextContent(content: string): Promise<APIResponse<TextImportResult>> {
  return apiRequest<TextImportResult>('POST', '/api/import/text', { content });
}
