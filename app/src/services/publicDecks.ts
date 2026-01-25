/**
 * Public Decks Service
 *
 * API functions for browsing and cloning public decks.
 */

import { apiRequest, APIResponse } from './api';
import type { PublicDeck, Card, DeckWithStats } from '@sage/shared';

export interface PublicDeckWithAuthor extends PublicDeck {
  authorName: string;
  authorAvatar: string | null;
  averageRating: number;
}

export interface PublicDecksResponse {
  decks: PublicDeckWithAuthor[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DeckRating {
  id: string;
  deckId: string;
  userId: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userAvatar?: string | null;
}

export interface DeckReviewsResponse {
  reviews: DeckRating[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  userRating: DeckRating | null;
}

export interface FetchPublicDecksParams {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch public decks from the backend
 * Searches by title and description
 */
export async function fetchPublicDecks(
  params: FetchPublicDecksParams = {}
): Promise<APIResponse<PublicDecksResponse>> {
  const { search, page = 1, limit = 20 } = params;

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));

  const queryString = queryParams.toString();
  const url = `/api/public/decks${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest<PublicDecksResponse>('GET', url);

  if (response.success && response.data) {
    // Transform backend response to match frontend types
    const transformedDecks = response.data.decks.map(transformPublicDeck);
    return {
      success: true,
      data: {
        ...response.data,
        decks: transformedDecks,
      },
    };
  }

  return response;
}

/**
 * Fetch a single public deck's details with preview cards
 */
export async function fetchPublicDeck(
  deckId: string
): Promise<APIResponse<{ deck: PublicDeckWithAuthor; cards: Card[] }>> {
  const response = await apiRequest<{ deck: any; cards: any[] }>('GET', `/api/public/decks/${deckId}`);

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        deck: transformPublicDeck(response.data.deck),
        cards: (response.data.cards || []).map(transformCard),
      },
    };
  }

  return response as APIResponse<{ deck: PublicDeckWithAuthor; cards: Card[] }>;
}

/**
 * Clone a public deck to the user's library
 */
export async function clonePublicDeck(
  deckId: string
): Promise<APIResponse<DeckWithStats>> {
  const response = await apiRequest<any>('POST', `/api/public/decks/${deckId}/clone`);

  if (response.success && response.data) {
    // The backend returns camelCase formatted data
    const deck = response.data;
    return {
      success: true,
      data: {
        id: deck.id,
        userId: deck.userId,
        title: deck.title,
        description: deck.description || '',
        isPublic: Boolean(deck.isPublic),
        cardCount: deck.cardCount || 0,
        downloadCount: deck.downloadCount || 0,
        ratingSum: deck.ratingSum || 0,
        ratingCount: deck.ratingCount || 0,
        createdAt: deck.createdAt,
        updatedAt: deck.updatedAt,
        // Original author tracking for cloned decks
        originalAuthorId: deck.originalAuthorId || null,
        originalAuthorName: deck.originalAuthorName || null,
        originalAuthorAvatar: deck.originalAuthorAvatar || null,
        originalDeckId: deck.originalDeckId || null,
        // Stats for newly cloned deck
        masteredCount: deck.masteredCount || 0,
        learningCount: deck.learningCount || 0,
        newCount: deck.newCount || deck.cardCount || 0,
        dueCount: deck.dueCount || 0,
        lastStudied: deck.lastStudied || null,
        nextReview: deck.nextReview || new Date().toISOString(),
        masteryLevel: 'beginner',
      },
    };
  }

  return response as APIResponse<DeckWithStats>;
}

/**
 * Submit or update a rating and review for a deck
 */
export async function submitDeckRating(
  deckId: string,
  rating: number,
  reviewText?: string
): Promise<APIResponse<DeckRating>> {
  const response = await apiRequest<any>('POST', `/api/public/decks/${deckId}/rate`, {
    rating,
    reviewText: reviewText || null,
  });

  if (response.success && response.data) {
    return {
      success: true,
      data: transformRating(response.data),
    };
  }

  return response as APIResponse<DeckRating>;
}

/**
 * Fetch reviews for a deck
 */
export async function fetchDeckReviews(
  deckId: string,
  page: number = 1,
  limit: number = 20
): Promise<APIResponse<DeckReviewsResponse>> {
  const response = await apiRequest<any>('GET', `/api/public/decks/${deckId}/reviews?page=${page}&limit=${limit}`);

  if (response.success && response.data) {
    return {
      success: true,
      data: {
        reviews: (response.data.reviews || []).map(transformRating),
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
        hasMore: response.data.hasMore,
        userRating: response.data.userRating ? transformRating(response.data.userRating) : null,
      },
    };
  }

  return response as APIResponse<DeckReviewsResponse>;
}

/**
 * Fetch user's own rating for a deck
 */
export async function fetchMyRating(deckId: string): Promise<APIResponse<DeckRating | null>> {
  const response = await apiRequest<any>('GET', `/api/public/decks/${deckId}/my-rating`);

  if (response.success) {
    return {
      success: true,
      data: response.data ? transformRating(response.data) : null,
    };
  }

  return response as APIResponse<DeckRating | null>;
}

/**
 * Delete user's own rating for a deck
 */
export async function deleteDeckRating(deckId: string): Promise<APIResponse<void>> {
  return apiRequest<void>('DELETE', `/api/public/decks/${deckId}/rate`);
}

/**
 * Transform backend rating format to frontend DeckRating
 */
function transformRating(rating: any): DeckRating {
  return {
    id: rating.id,
    deckId: rating.deck_id,
    userId: rating.user_id,
    rating: rating.rating,
    reviewText: rating.review_text || null,
    createdAt: rating.created_at,
    updatedAt: rating.updated_at,
    userName: rating.user_name,
    userAvatar: rating.user_avatar,
  };
}

/**
 * Transform backend deck format to frontend PublicDeckWithAuthor
 */
function transformPublicDeck(deck: any): PublicDeckWithAuthor {
  return {
    id: deck.id,
    userId: deck.user_id,
    title: deck.title,
    description: deck.description || '',
    isPublic: Boolean(deck.is_public),
    cardCount: deck.card_count || 0,
    downloadCount: deck.download_count || 0,
    ratingSum: deck.rating_sum || 0,
    ratingCount: deck.rating_count || 0,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
    // Original author fields (null for public decks being browsed, they're the originals)
    originalAuthorId: deck.original_author_id || null,
    originalAuthorName: deck.original_author_name || null,
    originalAuthorAvatar: deck.original_author_avatar || null,
    originalDeckId: deck.original_deck_id || null,
    // Public deck author info
    authorName: deck.author_name || 'Unknown',
    authorAvatar: deck.author_avatar || null,
    averageRating: deck.average_rating || 0,
  };
}

/**
 * Transform backend card format to frontend Card
 */
function transformCard(card: any): Card {
  return {
    id: card.id,
    deckId: card.deck_id,
    front: card.front,
    back: card.back,
    cardType: card.card_type || 'flashcard',
    options: card.options ? JSON.parse(card.options) : null,
    position: card.position || 0,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
  };
}
