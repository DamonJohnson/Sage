/**
 * Sync Service
 *
 * Handles offline-first data synchronization between local storage and the backend.
 * Uses a queue-based approach to handle operations when offline.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest, checkAPIHealth, APIResponse } from './api';

// Storage keys
const SYNC_QUEUE_KEY = 'sage_sync_queue';
const LAST_SYNC_KEY = 'sage_last_sync';
const OFFLINE_DATA_KEY = 'sage_offline_data';

// Sync operation types
export type SyncOperationType =
  | 'CREATE_DECK'
  | 'UPDATE_DECK'
  | 'DELETE_DECK'
  | 'CREATE_CARD'
  | 'UPDATE_CARD'
  | 'DELETE_CARD'
  | 'SUBMIT_REVIEW';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncAt: string | null;
}

export interface OfflineData {
  decks: Record<string, any>;
  cards: Record<string, any>;
  cardStates: Record<string, any>;
  lastUpdated: string;
}

// Sync state
let isOnline = true;
let isSyncing = false;
let syncListeners: ((status: SyncStatus) => void)[] = [];

/**
 * Initialize the sync service and start monitoring network status
 */
export async function initializeSyncService(): Promise<void> {
  // Listen for network changes
  NetInfo.addEventListener((state) => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected ?? false;

    // If we just came back online, try to sync
    if (wasOffline && isOnline) {
      processSyncQueue();
    }

    notifyListeners();
  });

  // Check initial network state
  const networkState = await NetInfo.fetch();
  isOnline = networkState.isConnected ?? false;

  // Try to sync on init if online
  if (isOnline) {
    processSyncQueue();
  }
}

/**
 * Subscribe to sync status changes
 */
export function subscribeSyncStatus(
  listener: (status: SyncStatus) => void
): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

/**
 * Get current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const queue = await getSyncQueue();
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);

  return {
    isOnline,
    isSyncing,
    pendingOperations: queue.length,
    lastSyncAt: lastSync,
  };
}

/**
 * Add an operation to the sync queue
 */
export async function queueSyncOperation(
  type: SyncOperationType,
  payload: Record<string, any>
): Promise<void> {
  const operation: SyncOperation = {
    id: generateId(),
    type,
    payload,
    timestamp: Date.now(),
    retryCount: 0,
  };

  const queue = await getSyncQueue();
  queue.push(operation);
  await saveSyncQueue(queue);

  // Try to process immediately if online
  if (isOnline && !isSyncing) {
    processSyncQueue();
  }

  notifyListeners();
}

/**
 * Process all pending sync operations
 */
export async function processSyncQueue(): Promise<void> {
  if (isSyncing || !isOnline) return;

  isSyncing = true;
  notifyListeners();

  try {
    // Verify API is actually reachable
    const apiHealthy = await checkAPIHealth();
    if (!apiHealthy) {
      console.log('API not reachable, skipping sync');
      return;
    }

    let queue = await getSyncQueue();
    const failedOperations: SyncOperation[] = [];

    for (const operation of queue) {
      try {
        await processOperation(operation);
      } catch (error) {
        console.error(`Sync operation failed:`, operation.type, error);
        operation.retryCount++;

        // Keep operation in queue if under retry limit
        if (operation.retryCount < 3) {
          failedOperations.push(operation);
        } else {
          console.error(`Operation exceeded retry limit, discarding:`, operation);
        }
      }
    }

    // Update queue with failed operations
    await saveSyncQueue(failedOperations);

    // Update last sync time
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } finally {
    isSyncing = false;
    notifyListeners();
  }
}

/**
 * Process a single sync operation
 */
async function processOperation(operation: SyncOperation): Promise<void> {
  const { type, payload } = operation;

  switch (type) {
    case 'CREATE_DECK':
      await apiRequest('POST', '/api/decks', payload);
      break;

    case 'UPDATE_DECK':
      await apiRequest('PUT', `/api/decks/${payload.id}`, payload);
      break;

    case 'DELETE_DECK':
      await apiRequest('DELETE', `/api/decks/${payload.id}`);
      break;

    case 'CREATE_CARD':
      await apiRequest('POST', `/api/decks/${payload.deckId}/cards`, payload);
      break;

    case 'UPDATE_CARD':
      await apiRequest('PUT', `/api/decks/${payload.deckId}/cards/${payload.id}`, payload);
      break;

    case 'DELETE_CARD':
      await apiRequest('DELETE', `/api/decks/${payload.deckId}/cards/${payload.id}`);
      break;

    case 'SUBMIT_REVIEW':
      await apiRequest('POST', '/api/study/review', payload);
      break;

    default:
      console.warn(`Unknown sync operation type: ${type}`);
  }
}

/**
 * Fetch and cache data for offline use
 */
export async function fetchOfflineData(): Promise<void> {
  if (!isOnline) return;

  try {
    // Fetch all user data for offline access
    const [decksResponse, statsResponse] = await Promise.all([
      apiRequest<{ decks: any[] }>('GET', '/api/decks'),
      apiRequest<any>('GET', '/api/study/stats'),
    ]);

    if (decksResponse.success && decksResponse.data) {
      // Build offline data cache
      const offlineData: OfflineData = {
        decks: {},
        cards: {},
        cardStates: {},
        lastUpdated: new Date().toISOString(),
      };

      for (const deck of decksResponse.data.decks) {
        offlineData.decks[deck.id] = deck;

        // Fetch cards for each deck
        const cardsResponse = await apiRequest<{ cards: any[] }>(
          'GET',
          `/api/decks/${deck.id}/cards`
        );

        if (cardsResponse.success && cardsResponse.data) {
          for (const card of cardsResponse.data.cards) {
            offlineData.cards[card.id] = card;
          }
        }
      }

      await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
    }
  } catch (error) {
    console.error('Error fetching offline data:', error);
  }
}

/**
 * Get cached offline data
 */
export async function getOfflineData(): Promise<OfflineData | null> {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Update local offline data (for optimistic updates)
 */
export async function updateOfflineData(
  type: 'deck' | 'card',
  id: string,
  data: Record<string, any> | null
): Promise<void> {
  const offlineData = await getOfflineData();
  if (!offlineData) return;

  if (type === 'deck') {
    if (data === null) {
      delete offlineData.decks[id];
    } else {
      offlineData.decks[id] = { ...offlineData.decks[id], ...data };
    }
  } else if (type === 'card') {
    if (data === null) {
      delete offlineData.cards[id];
    } else {
      offlineData.cards[id] = { ...offlineData.cards[id], ...data };
    }
  }

  offlineData.lastUpdated = new Date().toISOString();
  await AsyncStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
}

/**
 * Force a full sync with the server
 */
export async function forceSync(): Promise<boolean> {
  if (!isOnline) return false;

  await processSyncQueue();
  await fetchOfflineData();

  return true;
}

/**
 * Clear all sync data (for logout)
 */
export async function clearSyncData(): Promise<void> {
  await AsyncStorage.multiRemove([SYNC_QUEUE_KEY, LAST_SYNC_KEY, OFFLINE_DATA_KEY]);
  notifyListeners();
}

// Helper functions

async function getSyncQueue(): Promise<SyncOperation[]> {
  try {
    const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveSyncQueue(queue: SyncOperation[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

function notifyListeners(): void {
  getSyncStatus().then((status) => {
    syncListeners.forEach((listener) => listener(status));
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
