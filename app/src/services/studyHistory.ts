/**
 * Study History Service
 *
 * Handles tracking and persisting study statistics between sessions.
 * Uses local storage for offline support with API sync when available.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, APIResponse } from './api';

// Storage keys
const STUDY_HISTORY_KEY = 'sage_study_history';
const STUDY_STATS_KEY = 'sage_study_stats';

// Types
export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD format
  cardsStudied: number;
  studyTimeMs: number;
  ratings: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  sessions: number;
}

export interface OverallStudyStats {
  totalCardsStudied: number;
  totalStudyTimeMs: number;
  totalRatings: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  streakCurrent: number;
  streakLongest: number;
  lastStudyDate: string | null;
  firstStudyDate: string | null;
}

export interface StudyHistoryData {
  dailyRecords: Record<string, DailyStudyRecord>; // keyed by date string
  overallStats: OverallStudyStats;
  lastSynced: string | null;
}

// Default empty stats
const DEFAULT_OVERALL_STATS: OverallStudyStats = {
  totalCardsStudied: 0,
  totalStudyTimeMs: 0,
  totalRatings: { again: 0, hard: 0, good: 0, easy: 0 },
  streakCurrent: 0,
  streakLongest: 0,
  lastStudyDate: null,
  firstStudyDate: null,
};

const DEFAULT_HISTORY: StudyHistoryData = {
  dailyRecords: {},
  overallStats: DEFAULT_OVERALL_STATS,
  lastSynced: null,
};

// Helper to get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to get date string from Date object
function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Calculate streak from daily records
function calculateStreak(records: Record<string, DailyStudyRecord>, today: string): { current: number; longest: number } {
  const sortedDates = Object.keys(records)
    .filter(date => records[date].cardsStudied > 0)
    .sort((a, b) => b.localeCompare(a)); // Most recent first

  if (sortedDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Check if studied today or yesterday (streak is still valid)
  const todayDate = new Date(today);
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = getDateString(yesterday);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  // Calculate current streak (must include today or yesterday)
  if (sortedDates[0] === today || sortedDates[0] === yesterdayString) {
    let checkDate = new Date(sortedDates[0]);

    for (const dateStr of sortedDates) {
      const recordDate = new Date(dateStr);

      if (lastDate === null) {
        tempStreak = 1;
        lastDate = recordDate;
      } else {
        const dayDiff = Math.round((lastDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          tempStreak++;
          lastDate = recordDate;
        } else {
          break;
        }
      }
    }
    currentStreak = tempStreak;
  }

  // Calculate longest streak
  tempStreak = 0;
  lastDate = null;

  for (const dateStr of sortedDates) {
    const recordDate = new Date(dateStr);

    if (lastDate === null) {
      tempStreak = 1;
      lastDate = recordDate;
    } else {
      const dayDiff = Math.round((lastDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        tempStreak++;
        lastDate = recordDate;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        lastDate = recordDate;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Load study history from local storage
 */
export async function loadStudyHistory(): Promise<StudyHistoryData> {
  try {
    const stored = await AsyncStorage.getItem(STUDY_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading study history:', error);
  }
  return DEFAULT_HISTORY;
}

/**
 * Save study history to local storage
 */
export async function saveStudyHistory(data: StudyHistoryData): Promise<void> {
  try {
    await AsyncStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving study history:', error);
  }
}

/**
 * Record a card rating
 */
export async function recordRating(
  rating: 1 | 2 | 3 | 4,
  studyTimeMs: number = 0
): Promise<StudyHistoryData> {
  const history = await loadStudyHistory();
  const today = getTodayString();

  // Get or create today's record
  if (!history.dailyRecords[today]) {
    history.dailyRecords[today] = {
      date: today,
      cardsStudied: 0,
      studyTimeMs: 0,
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      sessions: 0,
    };
  }

  const todayRecord = history.dailyRecords[today];

  // Update today's record
  todayRecord.cardsStudied++;
  todayRecord.studyTimeMs += studyTimeMs;

  // Update rating counts
  const ratingKey = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' }[rating] as keyof typeof todayRecord.ratings;
  todayRecord.ratings[ratingKey]++;

  // Update overall stats
  history.overallStats.totalCardsStudied++;
  history.overallStats.totalStudyTimeMs += studyTimeMs;
  history.overallStats.totalRatings[ratingKey]++;
  history.overallStats.lastStudyDate = today;

  if (!history.overallStats.firstStudyDate) {
    history.overallStats.firstStudyDate = today;
  }

  // Recalculate streaks
  const streaks = calculateStreak(history.dailyRecords, today);
  history.overallStats.streakCurrent = streaks.current;
  history.overallStats.streakLongest = Math.max(streaks.longest, history.overallStats.streakLongest);

  // Save and return
  await saveStudyHistory(history);
  return history;
}

/**
 * Record end of a study session
 */
export async function recordSessionEnd(sessionTimeMs: number): Promise<StudyHistoryData> {
  const history = await loadStudyHistory();
  const today = getTodayString();

  if (history.dailyRecords[today]) {
    history.dailyRecords[today].sessions++;
  }

  await saveStudyHistory(history);
  return history;
}

/**
 * Get daily record for a specific date
 */
export async function getDailyRecord(date: string): Promise<DailyStudyRecord | null> {
  const history = await loadStudyHistory();
  return history.dailyRecords[date] || null;
}

/**
 * Get records for the last N days
 */
export async function getRecentRecords(days: number): Promise<DailyStudyRecord[]> {
  const history = await loadStudyHistory();
  const records: DailyStudyRecord[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getDateString(date);

    if (history.dailyRecords[dateStr]) {
      records.push(history.dailyRecords[dateStr]);
    }
  }

  return records;
}

/**
 * Get overall statistics
 */
export async function getOverallStats(): Promise<OverallStudyStats> {
  const history = await loadStudyHistory();
  return history.overallStats;
}

/**
 * Get calendar data for the activity view (last 52 weeks)
 */
export async function getCalendarData(weeks: number = 52): Promise<Record<string, DailyStudyRecord>> {
  const history = await loadStudyHistory();
  const result: Record<string, DailyStudyRecord> = {};
  const today = new Date();

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getDateString(date);

    if (history.dailyRecords[dateStr]) {
      result[dateStr] = history.dailyRecords[dateStr];
    }
  }

  return result;
}

/**
 * Sync study history with backend (when online)
 */
export async function syncStudyHistory(): Promise<APIResponse<StudyHistoryData>> {
  const localHistory = await loadStudyHistory();

  try {
    // Try to sync with backend
    const response = await apiRequest<StudyHistoryData>('POST', '/api/study/history/sync', {
      localHistory,
      lastSynced: localHistory.lastSynced,
    });

    if (response.success && response.data) {
      // Merge backend data with local data
      const mergedHistory = mergeHistories(localHistory, response.data);
      mergedHistory.lastSynced = new Date().toISOString();
      await saveStudyHistory(mergedHistory);
      return { success: true, data: mergedHistory };
    }

    return response;
  } catch (error) {
    // If offline, just return local data
    return { success: true, data: localHistory };
  }
}

/**
 * Merge two history records (for sync conflicts)
 */
function mergeHistories(local: StudyHistoryData, remote: StudyHistoryData): StudyHistoryData {
  const merged: StudyHistoryData = {
    dailyRecords: { ...remote.dailyRecords },
    overallStats: { ...remote.overallStats },
    lastSynced: new Date().toISOString(),
  };

  // Merge daily records - take the one with more cards studied
  for (const [date, localRecord] of Object.entries(local.dailyRecords)) {
    const remoteRecord = merged.dailyRecords[date];
    if (!remoteRecord || localRecord.cardsStudied > remoteRecord.cardsStudied) {
      merged.dailyRecords[date] = localRecord;
    }
  }

  // Recalculate overall stats from merged daily records
  merged.overallStats = recalculateOverallStats(merged.dailyRecords);

  return merged;
}

/**
 * Recalculate overall stats from daily records
 */
function recalculateOverallStats(records: Record<string, DailyStudyRecord>): OverallStudyStats {
  const stats: OverallStudyStats = {
    totalCardsStudied: 0,
    totalStudyTimeMs: 0,
    totalRatings: { again: 0, hard: 0, good: 0, easy: 0 },
    streakCurrent: 0,
    streakLongest: 0,
    lastStudyDate: null,
    firstStudyDate: null,
  };

  const dates = Object.keys(records).sort();

  if (dates.length > 0) {
    stats.firstStudyDate = dates[0];
    stats.lastStudyDate = dates[dates.length - 1];
  }

  for (const record of Object.values(records)) {
    stats.totalCardsStudied += record.cardsStudied;
    stats.totalStudyTimeMs += record.studyTimeMs;
    stats.totalRatings.again += record.ratings.again;
    stats.totalRatings.hard += record.ratings.hard;
    stats.totalRatings.good += record.ratings.good;
    stats.totalRatings.easy += record.ratings.easy;
  }

  const streaks = calculateStreak(records, getTodayString());
  stats.streakCurrent = streaks.current;
  stats.streakLongest = streaks.longest;

  return stats;
}

/**
 * Clear all study history (for testing/reset)
 */
export async function clearStudyHistory(): Promise<void> {
  await AsyncStorage.removeItem(STUDY_HISTORY_KEY);
}

/**
 * Get rating distribution percentages
 */
export function getRatingDistribution(stats: OverallStudyStats): {
  again: number;
  hard: number;
  good: number;
  easy: number;
} {
  const total = stats.totalRatings.again + stats.totalRatings.hard +
                stats.totalRatings.good + stats.totalRatings.easy;

  if (total === 0) {
    return { again: 0, hard: 0, good: 0, easy: 0 };
  }

  return {
    again: Math.round((stats.totalRatings.again / total) * 100),
    hard: Math.round((stats.totalRatings.hard / total) * 100),
    good: Math.round((stats.totalRatings.good / total) * 100),
    easy: Math.round((stats.totalRatings.easy / total) * 100),
  };
}

/**
 * Format study time for display
 */
export function formatStudyTime(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
