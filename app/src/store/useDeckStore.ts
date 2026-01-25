import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Deck, DeckWithStats, Card } from '@sage/shared';
import {
  fetchDecks,
  fetchDeck,
  fetchCards,
  createDeck,
  updateDeckAPI,
  deleteDeckAPI,
  addCardsAPI,
  updateCardAPI,
  deleteCardAPI,
} from '@/services/decks';

interface DeckState {
  decks: DeckWithStats[];
  cards: Record<string, Card[]>;
  isLoading: boolean;
  error: string | null;
  lastFetched: string | null;

  // Actions
  loadDecks: () => Promise<void>;
  refreshDecks: () => Promise<void>;
  getDeck: (id: string) => DeckWithStats | undefined;
  getCards: (deckId: string) => Card[];
  loadCards: (deckId: string) => Promise<Card[]>;
  getPublicDecksByUser: (userId: string) => DeckWithStats[];
  addDeck: (deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateDeck: (id: string, updates: Partial<Deck>) => Promise<boolean>;
  deleteDeck: (id: string) => Promise<boolean>;
  cloneDeck: (sourceDeck: DeckWithStats, sourceCards: Card[]) => Promise<string | null>;
  addCard: (deckId: string, card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'position'>) => Promise<boolean>;
  addCards: (deckId: string, cards: Array<Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'position' | 'deckId'>>) => Promise<boolean>;
  updateCard: (deckId: string, cardId: string, updates: Partial<Card>) => Promise<boolean>;
  deleteCard: (deckId: string, cardId: string) => Promise<boolean>;
  updateDeckLastStudied: (deckId: string) => void;
  clearError: () => void;
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      decks: [],
      cards: {},
      isLoading: false,
      error: null,
      lastFetched: null,

      loadDecks: async () => {
        // Only load if we haven't fetched recently (within 5 minutes)
        const lastFetched = get().lastFetched;
        if (lastFetched) {
          const timeSinceLastFetch = Date.now() - new Date(lastFetched).getTime();
          if (timeSinceLastFetch < 5 * 60 * 1000 && get().decks.length > 0) {
            return; // Use cached data
          }
        }

        await get().refreshDecks();
      },

      refreshDecks: async () => {
        set({ isLoading: true, error: null });

        const response = await fetchDecks();

        if (response.success && response.data) {
          set({
            decks: response.data,
            isLoading: false,
            lastFetched: new Date().toISOString(),
          });
        } else {
          set({
            isLoading: false,
            error: response.error || 'Failed to load decks',
          });
        }
      },

      getDeck: (id) => get().decks.find((d) => d.id === id),

      getCards: (deckId) => get().cards[deckId] || [],

      loadCards: async (deckId) => {
        // Check if we already have cards cached
        const cachedCards = get().cards[deckId];
        if (cachedCards && cachedCards.length > 0) {
          return cachedCards;
        }

        const response = await fetchCards(deckId);

        if (response.success && response.data) {
          set((state) => ({
            cards: {
              ...state.cards,
              [deckId]: response.data!,
            },
          }));
          return response.data;
        }

        return [];
      },

      getPublicDecksByUser: (userId) => get().decks.filter((d) => d.userId === userId && d.isPublic),

      addDeck: async (deckData) => {
        set({ isLoading: true, error: null });

        const response = await createDeck({
          title: deckData.title,
          description: deckData.description,
          isPublic: deckData.isPublic,
        });

        if (response.success && response.data) {
          const newDeck = response.data;
          set((state) => ({
            decks: [...state.decks, newDeck],
            cards: { ...state.cards, [newDeck.id]: [] },
            isLoading: false,
          }));
          return newDeck.id;
        }

        set({
          isLoading: false,
          error: response.error || 'Failed to create deck',
        });
        return null;
      },

      updateDeck: async (id, updates) => {
        const response = await updateDeckAPI(id, {
          title: updates.title,
          description: updates.description,
          isPublic: updates.isPublic,
        });

        if (response.success && response.data) {
          set((state) => ({
            decks: state.decks.map((d) =>
              d.id === id ? { ...d, ...response.data } : d
            ),
          }));
          return true;
        }

        set({ error: response.error || 'Failed to update deck' });
        return false;
      },

      deleteDeck: async (id) => {
        const response = await deleteDeckAPI(id);

        if (response.success) {
          set((state) => {
            const { [id]: _, ...remainingCards } = state.cards;
            return {
              decks: state.decks.filter((d) => d.id !== id),
              cards: remainingCards,
            };
          });
          return true;
        }

        set({ error: response.error || 'Failed to delete deck' });
        return false;
      },

      cloneDeck: async (sourceDeck, sourceCards) => {
        // First create the deck
        const deckResponse = await createDeck({
          title: sourceDeck.title,
          description: sourceDeck.description,
          isPublic: false, // Cloned decks are private
        });

        if (!deckResponse.success || !deckResponse.data) {
          set({ error: deckResponse.error || 'Failed to clone deck' });
          return null;
        }

        const newDeck = deckResponse.data;

        // Then add the cards
        if (sourceCards.length > 0) {
          const cardsToAdd = sourceCards.map((card) => ({
            front: card.front,
            back: card.back,
            cardType: card.cardType,
            options: card.options,
          }));

          const cardsResponse = await addCardsAPI(newDeck.id, cardsToAdd);

          if (cardsResponse.success && cardsResponse.data) {
            set((state) => ({
              decks: [...state.decks, { ...newDeck, cardCount: cardsResponse.data!.length }],
              cards: { ...state.cards, [newDeck.id]: cardsResponse.data! },
            }));
          } else {
            // Deck created but cards failed - still add the deck
            set((state) => ({
              decks: [...state.decks, newDeck],
              cards: { ...state.cards, [newDeck.id]: [] },
            }));
          }
        } else {
          set((state) => ({
            decks: [...state.decks, newDeck],
            cards: { ...state.cards, [newDeck.id]: [] },
          }));
        }

        return newDeck.id;
      },

      addCard: async (deckId, cardData) => {
        const response = await addCardsAPI(deckId, [{
          front: cardData.front,
          back: cardData.back,
          frontImage: cardData.frontImage,
          backImage: cardData.backImage,
          cardType: cardData.cardType,
          options: cardData.options,
        }]);

        if (response.success && response.data && response.data.length > 0) {
          const newCard = response.data[0];
          set((state) => ({
            cards: {
              ...state.cards,
              [deckId]: [...(state.cards[deckId] || []), newCard],
            },
            decks: state.decks.map((d) =>
              d.id === deckId
                ? { ...d, cardCount: d.cardCount + 1, newCount: d.newCount + 1 }
                : d
            ),
          }));
          return true;
        }

        set({ error: response.error || 'Failed to add card' });
        return false;
      },

      addCards: async (deckId, cards) => {
        const cardsToAdd = cards.map((card) => ({
          front: card.front,
          back: card.back,
          frontImage: card.frontImage,
          backImage: card.backImage,
          cardType: card.cardType,
          options: card.options,
          explanation: card.explanation,
        }));

        const response = await addCardsAPI(deckId, cardsToAdd);

        if (response.success && response.data) {
          set((state) => ({
            cards: {
              ...state.cards,
              [deckId]: [...(state.cards[deckId] || []), ...response.data!],
            },
            decks: state.decks.map((d) =>
              d.id === deckId
                ? {
                    ...d,
                    cardCount: d.cardCount + response.data!.length,
                    newCount: d.newCount + response.data!.length,
                  }
                : d
            ),
          }));
          return true;
        }

        set({ error: response.error || 'Failed to add cards' });
        return false;
      },

      updateCard: async (deckId, cardId, updates) => {
        const response = await updateCardAPI(deckId, cardId, {
          front: updates.front,
          back: updates.back,
          frontImage: updates.frontImage,
          backImage: updates.backImage,
          cardType: updates.cardType,
          options: updates.options,
        });

        if (response.success && response.data) {
          set((state) => ({
            cards: {
              ...state.cards,
              [deckId]: (state.cards[deckId] || []).map((c) =>
                c.id === cardId ? { ...c, ...response.data } : c
              ),
            },
          }));
          return true;
        }

        set({ error: response.error || 'Failed to update card' });
        return false;
      },

      deleteCard: async (deckId, cardId) => {
        const response = await deleteCardAPI(deckId, cardId);

        if (response.success) {
          set((state) => ({
            cards: {
              ...state.cards,
              [deckId]: (state.cards[deckId] || []).filter((c) => c.id !== cardId),
            },
            decks: state.decks.map((d) =>
              d.id === deckId ? { ...d, cardCount: Math.max(0, d.cardCount - 1) } : d
            ),
          }));
          return true;
        }

        set({ error: response.error || 'Failed to delete card' });
        return false;
      },

      updateDeckLastStudied: (deckId) => {
        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === deckId
              ? { ...deck, lastStudied: new Date().toISOString() }
              : deck
          ),
        }));
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'sage-decks',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist decks and cards, not loading state
      partialize: (state) => ({
        decks: state.decks,
        cards: state.cards,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
