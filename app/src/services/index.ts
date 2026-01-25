/**
 * Services
 *
 * API and service layer for the Sage app.
 */

// API Client
export {
  default as api,
  apiRequest,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  checkAPIHealth,
  type APIResponse,
} from './api';

// Authentication
export {
  useGoogleAuth,
  signInWithGoogle,
  signInWithGoogleAccessToken,
  signInWithApple,
  signUpWithEmail,
  signInWithEmail,
  devLogin,
  getCurrentUser,
  updateProfile,
  completeProfileSetup,
  deleteAccount,
  signOut,
  isAppleSignInAvailable,
  performAppleSignIn,
  type User,
  type AuthResponse,
  type ProfileResponse,
  type GoogleUserInfo,
} from './auth';

// AI Generation
export {
  generateFromTopic,
  generateFromText,
  generateMockCards,
  explainConcept,
  generateFromConcept,
  type GeneratedCard,
  type GenerateFromTopicParams,
  type GenerateFromTextParams,
  type GenerateCardsResponse,
  type ExplainConceptParams,
  type ExplainConceptResponse,
  type GenerateFromConceptParams,
  type GenerateFromConceptResponse,
} from './ai';

// Study / FSRS
export {
  getDueCards,
  reviewCard,
  getStudyStats,
  startStudySession,
  endStudySession,
  formatInterval,
  getRatingLabel,
  getRatingColor,
  type FSRSState,
  type Rating,
  type FSRSCardState,
  type DueCard,
  type GetDueCardsParams,
  type GetDueCardsResponse,
  type ReviewCardParams,
  type ReviewCardResponse,
  type StudyStats,
} from './study';

// Sound Effects
export {
  playSound,
  playCelebrationSound,
  initializeAudio,
  cleanupSounds,
  type SoundType,
} from './sound';

// Sync / Offline
export {
  initializeSyncService,
  subscribeSyncStatus,
  getSyncStatus,
  queueSyncOperation,
  processSyncQueue,
  fetchOfflineData,
  getOfflineData,
  updateOfflineData,
  forceSync,
  clearSyncData,
  type SyncOperationType,
  type SyncOperation,
  type SyncStatus,
  type OfflineData,
} from './sync';

// Decks & Cards
export {
  fetchDecks,
  fetchDeck,
  fetchCards,
  createDeck,
  updateDeckAPI,
  deleteDeckAPI,
  addCardsAPI,
  updateCardAPI,
  deleteCardAPI,
  importApkgFile,
  importTextContent,
} from './decks';

// Public Decks (Discover)
export {
  fetchPublicDecks,
  fetchPublicDeck,
  clonePublicDeck,
  submitDeckRating,
  fetchDeckReviews,
  fetchMyRating,
  deleteDeckRating,
  type PublicDeckWithAuthor,
  type PublicDecksResponse,
  type FetchPublicDecksParams,
  type DeckRating,
  type DeckReviewsResponse,
} from './publicDecks';

// Study History
export {
  loadStudyHistory,
  saveStudyHistory,
  recordRating,
  recordSessionEnd,
  getDailyRecord,
  getRecentRecords,
  getOverallStats,
  getCalendarData,
  syncStudyHistory,
  clearStudyHistory,
  getRatingDistribution,
  formatStudyTime,
  type DailyStudyRecord,
  type OverallStudyStats,
  type StudyHistoryData,
} from './studyHistory';

// Social
export {
  discoverUsers,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getUserProfile,
  getActivityFeed,
  updateSocialProfile,
  type SocialUserProfile,
  type SocialActivity,
  type DiscoverUsersParams,
} from './social';
