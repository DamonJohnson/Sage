import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ProgressBar } from '@/components/ui';
import { useAuthStore, useDeckStore, useStudyStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import {
  loadStudyHistory,
  getOverallStats,
  getRatingDistribution,
  formatStudyTime,
  type DailyStudyRecord,
  type OverallStudyStats,
  type StudyHistoryData,
} from '@/services';

interface DayData {
  date: Date;
  cardsStudied: number;
  intensity: number;
  isSignupDay: boolean;
  isFuture: boolean;
  record: DailyStudyRecord | null;
}

export function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { decks } = useDeckStore();
  const { stats } = useStudyStore();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryData | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStudyStats | null>(null);
  const [calendarOffset, setCalendarOffset] = useState(0); // Offset in weeks (0 = current, negative = past)
  const [statsTimePeriod, setStatsTimePeriod] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [showMasteryInfo, setShowMasteryInfo] = useState(false);

  // Load study history on mount
  useEffect(() => {
    async function loadData() {
      const history = await loadStudyHistory();
      const stats = await getOverallStats();
      setStudyHistory(history);
      setOverallStats(stats);
    }
    loadData();
  }, []);

  // Responsive values
  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);
  const totalMastered = decks.reduce((sum, d) => sum + d.masteredCount, 0);
  const totalLearning = decks.reduce((sum, d) => sum + d.learningCount, 0);
  const totalNew = decks.reduce((sum, d) => sum + d.newCount, 0);
  const masteryPercentage = totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  // User signup date
  const signupDate = useMemo(() => {
    if (user?.createdAt) {
      const date = new Date(user.createdAt);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    return null;
  }, [user?.createdAt]);

  // Helper to format date as YYYY-MM-DD for record lookup
  const getDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Generate calendar data (52 weeks with offset support)
  const calendarData = useMemo(() => {
    const weeks = 52;
    const data: DayData[][] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from 52 weeks ago, aligned to Monday, with offset applied
    const startDate = new Date(today);
    // Get to the Monday of the current week
    const currentDay = today.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Sunday is 0, need 6 days back
    // Apply offset (negative offset = further back in time)
    startDate.setDate(today.getDate() - daysFromMonday - ((weeks - 1) * 7) + (calendarOffset * 7));

    const dailyRecords = studyHistory?.dailyRecords || {};

    for (let week = 0; week < weeks; week++) {
      const weekData: DayData[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (week * 7) + day);
        const isFuture = date > today;

        // Check if this is the signup day
        const isSignupDay = signupDate
          ? date.getTime() === signupDate.getTime()
          : false;

        // Get real data from study history
        const dateKey = getDateKey(date);
        const record = dailyRecords[dateKey] || null;
        const cardsStudied = isFuture ? 0 : (record?.cardsStudied || 0);
        const intensity = isFuture ? 0 : cardsStudied === 0 ? 0 : Math.min(4, Math.ceil(cardsStudied / 10));

        weekData.push({
          date,
          cardsStudied,
          intensity,
          isSignupDay,
          isFuture,
          record,
        });
      }
      data.push(weekData);
    }
    return data;
  }, [signupDate, studyHistory, calendarOffset]);

  // Get date range for calendar header
  const calendarDateRange = useMemo(() => {
    if (calendarData.length === 0) return '';
    const firstWeek = calendarData[0];
    const lastWeek = calendarData[calendarData.length - 1];
    if (!firstWeek || !lastWeek) return '';

    const startDate = firstWeek[0]?.date;
    const endDate = lastWeek[6]?.date;
    if (!startDate || !endDate) return '';

    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
    const startStr = startDate.toLocaleDateString(undefined, formatOptions);
    const endStr = endDate.toLocaleDateString(undefined, formatOptions);

    if (startStr === endStr) return startStr;
    return `${startStr} - ${endStr}`;
  }, [calendarData]);

  // Check if we can navigate forward (can't go past today)
  const canNavigateForward = calendarOffset < 0;

  // Get month labels for calendar
  const monthLabels = useMemo(() => {
    const months: { label: string; position: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;

    calendarData.forEach((week, weekIndex) => {
      // Check the first day (Monday) of each week
      const firstDay = week[0];
      if (firstDay && firstDay.date.getMonth() !== lastMonth) {
        lastMonth = firstDay.date.getMonth();
        months.push({ label: monthNames[lastMonth], position: weekIndex });
      }
    });

    return months;
  }, [calendarData]);

  // Calculate stats for the selected time period
  const filteredStats = useMemo(() => {
    if (!studyHistory?.dailyRecords) {
      return { cardsStudied: 0, studyTimeMs: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } };
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let daysBack = 0;

    switch (statsTimePeriod) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case 'all': daysBack = 0; break;
    }

    const cutoffDate = daysBack > 0 ? new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000) : null;

    let totalCards = 0;
    let totalTime = 0;
    const ratings = { again: 0, hard: 0, good: 0, easy: 0 };

    Object.entries(studyHistory.dailyRecords).forEach(([dateStr, record]) => {
      const recordDate = new Date(dateStr);
      if (cutoffDate && recordDate < cutoffDate) return;

      totalCards += record.cardsStudied;
      totalTime += record.studyTimeMs;
      ratings.again += record.ratings.again;
      ratings.hard += record.ratings.hard;
      ratings.good += record.ratings.good;
      ratings.easy += record.ratings.easy;
    });

    return { cardsStudied: totalCards, studyTimeMs: totalTime, ratings };
  }, [studyHistory, statsTimePeriod]);

  // Get rating distribution for self-assessment card
  const ratingDistribution = useMemo(() => {
    const { ratings } = filteredStats;
    const total = ratings.again + ratings.hard + ratings.good + ratings.easy;
    if (total === 0) {
      return { again: 0, hard: 0, good: 0, easy: 0 };
    }
    return {
      again: Math.round((ratings.again / total) * 100),
      hard: Math.round((ratings.hard / total) * 100),
      good: Math.round((ratings.good / total) * 100),
      easy: Math.round((ratings.easy / total) * 100),
    };
  }, [filteredStats]);

  const getIntensityColor = (intensity: number) => {
    const colors = [
      surfaceHover,
      accent.orange + '30',
      accent.orange + '50',
      accent.orange + '80',
      accent.orange,
    ];
    return colors[intensity];
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString(undefined, options);
  };

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: isMobile ? insets.top : 0 }]}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
          paddingHorizontal: contentPadding,
        }
      ]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Statistics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Stats */}
        <View style={[styles.todayCard, { backgroundColor: surface }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>Today</Text>
          <View style={styles.todayStats}>
            <View style={styles.todayStat}>
              <Text style={[styles.todayStatValue, { color: accent.orange }]}>{stats.reviewedToday}</Text>
              <Text style={[styles.todayStatLabel, { color: textSecondary }]}>Reviewed</Text>
            </View>
            <View style={styles.todayStat}>
              <Text style={[styles.todayStatValue, { color: accent.orange }]}>{stats.dueToday}</Text>
              <Text style={[styles.todayStatLabel, { color: textSecondary }]}>Due</Text>
            </View>
            <View style={styles.todayStat}>
              <Text style={[styles.todayStatValue, { color: accent.orange }]}>{stats.studyTimeToday}m</Text>
              <Text style={[styles.todayStatLabel, { color: textSecondary }]}>Time</Text>
            </View>
          </View>
        </View>

        {/* Mastery Card */}
        <View style={[styles.masteryCard, { backgroundColor: surface }]}>
          <View style={styles.masteryContent}>
            <View style={styles.masteryInfo}>
              <Ionicons name="school" size={28} color={accent.green} />
              <View style={styles.masteryTextContainer}>
                <View style={styles.masteryTitleRow}>
                  <Text style={[styles.masteryTitle, { color: textPrimary }]}>Overall Mastery</Text>
                  <TouchableOpacity
                    onPress={() => setShowMasteryInfo(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}}
                  >
                    <Ionicons name="information-circle-outline" size={18} color={textSecondary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.masteryDescription, { color: textSecondary }]}>
                  Cards you can recall reliably for 3+ weeks
                </Text>
              </View>
            </View>
            <Text style={[styles.masteryValue, { color: accent.green }]}>{masteryPercentage}%</Text>
          </View>
          <ProgressBar value={masteryPercentage} variant="mastered" height="md" />
        </View>

        {/* Streak Card */}
        <View style={[styles.streakCard, { backgroundColor: surface }]}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Ionicons name="flame" size={28} color={accent.orange} />
              <Text style={[styles.streakValue, { color: textPrimary }]}>{user?.streakCurrent || 0}</Text>
              <Text style={[styles.streakLabel, { color: textSecondary }]}>Current Streak</Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: border }]} />
            <View style={styles.streakItem}>
              <Ionicons name="trophy" size={28} color={accent.orange} />
              <Text style={[styles.streakValue, { color: textPrimary }]}>{user?.streakLongest || 0}</Text>
              <Text style={[styles.streakLabel, { color: textSecondary }]}>Best Streak</Text>
            </View>
          </View>
        </View>

        {/* Activity Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: surface }]}>
          <View style={styles.calendarHeader}>
            <Text style={[styles.cardTitle, { color: textPrimary, marginBottom: 0 }]}>Activity</Text>
            <View style={styles.calendarNavigation}>
              <TouchableOpacity
                style={[styles.calendarNavButton, { backgroundColor: surfaceHover }]}
                onPress={() => setCalendarOffset(prev => prev - 52)}
              >
                <Ionicons name="chevron-back" size={18} color={textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.calendarSubtitle, { color: textSecondary }]}>{calendarDateRange}</Text>
              <TouchableOpacity
                style={[
                  styles.calendarNavButton,
                  { backgroundColor: surfaceHover },
                  !canNavigateForward && { opacity: 0.4 },
                ]}
                onPress={() => canNavigateForward && setCalendarOffset(prev => Math.min(0, prev + 52))}
                disabled={!canNavigateForward}
              >
                <Ionicons name="chevron-forward" size={18} color={textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Month Labels - scrollable with calendar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarScrollContent}
          >
            <View>
              {/* Month Labels */}
              <View style={styles.monthLabelsRow}>
                <View style={{ width: 32 }} />
                {monthLabels.map((month, idx) => (
                  <Text
                    key={idx}
                    style={[
                      styles.monthLabel,
                      { color: textSecondary, left: 32 + month.position * 15 },
                    ]}
                  >
                    {month.label}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarContainer}>
                {/* Day Labels - Monday first */}
                <View style={styles.dayLabels}>
                  <Text style={[styles.dayLabel, { color: textSecondary }]}>Mon</Text>
                  <Text style={[styles.dayLabel, { color: textSecondary }]}></Text>
                  <Text style={[styles.dayLabel, { color: textSecondary }]}>Wed</Text>
                  <Text style={[styles.dayLabel, { color: textSecondary }]}></Text>
                  <Text style={[styles.dayLabel, { color: textSecondary }]}>Fri</Text>
                  <Text style={[styles.dayLabel, { color: textSecondary }]}></Text>
                  <Text style={[styles.dayLabel, { color: textSecondary }]}>Sun</Text>
                </View>

                {/* Calendar Weeks */}
                <View style={styles.calendar}>
                  {calendarData.map((week, weekIndex) => (
                    <View key={weekIndex} style={styles.calendarWeek}>
                      {week.map((day, dayIndex) => (
                        <Pressable
                          key={dayIndex}
                          style={[
                            styles.calendarDay,
                            { backgroundColor: day.isFuture ? 'transparent' : getIntensityColor(day.intensity) },
                            day.isFuture && { borderWidth: 1, borderColor: border, borderStyle: 'dashed' },
                            day.isSignupDay && { borderWidth: 2, borderColor: accent.blue },
                          ]}
                          onPress={() => !day.isFuture && setSelectedDay(day)}
                          disabled={day.isFuture}
                        >
                          {day.isSignupDay && (
                            <Ionicons name="star" size={8} color={accent.blue} style={styles.signupStar} />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Legend */}
          <View style={styles.calendarLegendContainer}>
            <View style={styles.calendarLegend}>
              <Text style={[styles.legendText, { color: textSecondary }]}>Less</Text>
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={i}
                  style={[styles.legendDay, { backgroundColor: getIntensityColor(i) }]}
                />
              ))}
              <Text style={[styles.legendText, { color: textSecondary }]}>More</Text>
            </View>
          </View>
        </View>

        {/* Day Details Modal */}
        <Modal
          visible={selectedDay !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedDay(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectedDay(null)}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              {selectedDay && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: textPrimary }]}>
                      {formatDate(selectedDay.date)}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedDay(null)}>
                      <Ionicons name="close" size={24} color={textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {selectedDay.isSignupDay && (
                    <View style={[styles.signupBanner, { backgroundColor: accent.blue + '15' }]}>
                      <Ionicons name="star" size={18} color={accent.blue} />
                      <Text style={[styles.signupBannerText, { color: accent.blue }]}>
                        You joined Sage on this day!
                      </Text>
                    </View>
                  )}

                  <View style={styles.modalStats}>
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatValue, { color: accent.orange }]}>
                        {selectedDay.cardsStudied}
                      </Text>
                      <Text style={[styles.modalStatLabel, { color: textSecondary }]}>
                        Cards Studied
                      </Text>
                    </View>
                    <View style={[styles.modalStatDivider, { backgroundColor: border }]} />
                    <View style={styles.modalStatItem}>
                      <Text style={[styles.modalStatValue, { color: textPrimary }]}>
                        {selectedDay.record ? formatStudyTime(selectedDay.record.studyTimeMs) : '0m'}
                      </Text>
                      <Text style={[styles.modalStatLabel, { color: textSecondary }]}>
                        Study Time
                      </Text>
                    </View>
                  </View>

                  {/* Self-assessment breakdown */}
                  {selectedDay.record && selectedDay.cardsStudied > 0 && (
                    <View style={[styles.assessmentBreakdown, { borderTopColor: border }]}>
                      <Text style={[styles.assessmentTitle, { color: textSecondary }]}>
                        Self-Assessment
                      </Text>
                      <View style={styles.assessmentRow}>
                        <View style={styles.assessmentItem}>
                          <View style={[styles.assessmentDot, { backgroundColor: accent.red }]} />
                          <Text style={[styles.assessmentLabel, { color: textSecondary }]}>Again</Text>
                          <Text style={[styles.assessmentValue, { color: textPrimary }]}>
                            {selectedDay.record.ratings.again}
                          </Text>
                        </View>
                        <View style={styles.assessmentItem}>
                          <View style={[styles.assessmentDot, { backgroundColor: accent.orange }]} />
                          <Text style={[styles.assessmentLabel, { color: textSecondary }]}>Hard</Text>
                          <Text style={[styles.assessmentValue, { color: textPrimary }]}>
                            {selectedDay.record.ratings.hard}
                          </Text>
                        </View>
                        <View style={styles.assessmentItem}>
                          <View style={[styles.assessmentDot, { backgroundColor: accent.green }]} />
                          <Text style={[styles.assessmentLabel, { color: textSecondary }]}>Good</Text>
                          <Text style={[styles.assessmentValue, { color: textPrimary }]}>
                            {selectedDay.record.ratings.good}
                          </Text>
                        </View>
                        <View style={styles.assessmentItem}>
                          <View style={[styles.assessmentDot, { backgroundColor: accent.green }]} />
                          <Text style={[styles.assessmentLabel, { color: textSecondary }]}>Easy</Text>
                          <Text style={[styles.assessmentValue, { color: textPrimary }]}>
                            {selectedDay.record.ratings.easy}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {selectedDay.cardsStudied === 0 && !selectedDay.isSignupDay && (
                    <Text style={[styles.noActivityText, { color: textSecondary }]}>
                      No study activity on this day
                    </Text>
                  )}
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Card Progress */}
        <View style={[styles.progressCard, { backgroundColor: surface }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: textPrimary, marginBottom: 0 }]}>Card Progress</Text>
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <View style={[styles.progressDot, { backgroundColor: accent.green }]} />
              <Text style={[styles.progressLabel, { color: textSecondary }]}>Mastered</Text>
              <Text style={[styles.progressValue, { color: textPrimary }]}>{totalMastered}</Text>
            </View>
            <ProgressBar
              value={totalCards > 0 ? (totalMastered / totalCards) * 100 : 0}
              variant="mastered"
              height="sm"
            />
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <View style={[styles.progressDot, { backgroundColor: accent.orange }]} />
              <Text style={[styles.progressLabel, { color: textSecondary }]}>Learning</Text>
              <Text style={[styles.progressValue, { color: textPrimary }]}>{totalLearning}</Text>
            </View>
            <ProgressBar
              value={totalCards > 0 ? (totalLearning / totalCards) * 100 : 0}
              variant="learning"
              height="sm"
            />
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <View style={[styles.progressDot, { backgroundColor: accent.red }]} />
              <Text style={[styles.progressLabel, { color: textSecondary }]}>New</Text>
              <Text style={[styles.progressValue, { color: textPrimary }]}>{totalNew}</Text>
            </View>
            <ProgressBar
              value={totalCards > 0 ? (totalNew / totalCards) * 100 : 0}
              variant="new"
              height="sm"
            />
          </View>

          <View style={[styles.totalCards, { borderTopColor: border }]}>
            <Text style={[styles.totalCardsText, { color: textSecondary }]}>Total: {totalCards} cards</Text>
          </View>
        </View>

        {/* Overall Self-Assessment Distribution */}
        <View style={[styles.assessmentCard, { backgroundColor: surface }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: textPrimary, marginBottom: 0 }]}>Self-Assessment</Text>
            <View style={styles.timePeriodChips}>
              {(['7d', '30d', '90d', 'all'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.timePeriodChip,
                    { backgroundColor: statsTimePeriod === period ? accent.orange : surfaceHover },
                  ]}
                  onPress={() => setStatsTimePeriod(period)}
                >
                  <Text
                    style={[
                      styles.timePeriodChipText,
                      { color: statsTimePeriod === period ? '#fff' : textSecondary },
                    ]}
                  >
                    {period === 'all' ? 'All' : period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={[styles.assessmentSubtitle, { color: textSecondary }]}>
            How you've rated your recall {statsTimePeriod === 'all' ? 'across all sessions' : `in the last ${statsTimePeriod}`}
          </Text>

          <View style={styles.assessmentBars}>
            <View style={styles.assessmentBarRow}>
              <View style={styles.assessmentBarLabel}>
                <View style={[styles.assessmentDot, { backgroundColor: accent.red }]} />
                <Text style={[styles.assessmentBarText, { color: textSecondary }]}>Again</Text>
              </View>
              <View style={[styles.assessmentBarTrack, { backgroundColor: surfaceHover }]}>
                <View style={[styles.assessmentBarFill, { backgroundColor: accent.red, width: `${ratingDistribution.again}%` }]} />
              </View>
              <Text style={[styles.assessmentBarValue, { color: textPrimary }]}>{ratingDistribution.again}%</Text>
            </View>

            <View style={styles.assessmentBarRow}>
              <View style={styles.assessmentBarLabel}>
                <View style={[styles.assessmentDot, { backgroundColor: accent.orange }]} />
                <Text style={[styles.assessmentBarText, { color: textSecondary }]}>Hard</Text>
              </View>
              <View style={[styles.assessmentBarTrack, { backgroundColor: surfaceHover }]}>
                <View style={[styles.assessmentBarFill, { backgroundColor: accent.orange, width: `${ratingDistribution.hard}%` }]} />
              </View>
              <Text style={[styles.assessmentBarValue, { color: textPrimary }]}>{ratingDistribution.hard}%</Text>
            </View>

            <View style={styles.assessmentBarRow}>
              <View style={styles.assessmentBarLabel}>
                <View style={[styles.assessmentDot, { backgroundColor: accent.green }]} />
                <Text style={[styles.assessmentBarText, { color: textSecondary }]}>Good</Text>
              </View>
              <View style={[styles.assessmentBarTrack, { backgroundColor: surfaceHover }]}>
                <View style={[styles.assessmentBarFill, { backgroundColor: accent.green, width: `${ratingDistribution.good}%` }]} />
              </View>
              <Text style={[styles.assessmentBarValue, { color: textPrimary }]}>{ratingDistribution.good}%</Text>
            </View>

            <View style={styles.assessmentBarRow}>
              <View style={styles.assessmentBarLabel}>
                <View style={[styles.assessmentDot, { backgroundColor: accent.green }]} />
                <Text style={[styles.assessmentBarText, { color: textSecondary }]}>Easy</Text>
              </View>
              <View style={[styles.assessmentBarTrack, { backgroundColor: surfaceHover }]}>
                <View style={[styles.assessmentBarFill, { backgroundColor: accent.green + '80', width: `${ratingDistribution.easy}%` }]} />
              </View>
              <Text style={[styles.assessmentBarValue, { color: textPrimary }]}>{ratingDistribution.easy}%</Text>
            </View>
          </View>
        </View>

        <View style={{ height: spacing[20] }} />

        {/* Mastery Info Modal */}
        <Modal
          visible={showMasteryInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMasteryInfo(false)}
        >
          <Pressable
            style={styles.infoModalOverlay}
            onPress={() => setShowMasteryInfo(false)}
          >
            <Pressable
              style={[styles.infoModalContent, { backgroundColor: surface }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.infoModalHeader}>
                <View style={styles.infoModalTitleRow}>
                  <Ionicons name="school" size={24} color={accent.green} />
                  <Text style={[styles.infoModalTitle, { color: textPrimary }]}>What is Mastery?</Text>
                </View>
                <TouchableOpacity onPress={() => setShowMasteryInfo(false)}>
                  <Ionicons name="close" size={24} color={textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.infoModalText, { color: textSecondary }]}>
                Mastery measures the percentage of cards you've truly learned. A card is considered "mastered" when you can reliably recall it for at least 3 weeks without reviewing.
              </Text>
              <Text style={[styles.infoModalText, { color: textSecondary, marginTop: spacing[3] }]}>
                The more consistently you study and rate cards as "Good" or "Easy", the faster they'll reach mastery status. Cards you forget will return to the learning phase.
              </Text>
              <TouchableOpacity
                style={[styles.infoModalButton, { backgroundColor: accent.orange }]}
                onPress={() => setShowMasteryInfo(false)}
              >
                <Text style={styles.infoModalButtonText}>Got it</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
  },
  todayCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.md,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[4],
  },
  todayStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  todayStat: {
    alignItems: 'center',
  },
  todayStatValue: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
  },
  todayStatLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  masteryCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  masteryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  masteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  masteryTextContainer: {
    flex: 1,
  },
  masteryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  masteryTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  masteryDescription: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  masteryValue: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
  },
  streakCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  streakRow: {
    flexDirection: 'row',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    marginTop: spacing[2],
  },
  streakLabel: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[1],
  },
  streakDivider: {
    width: 1,
    marginHorizontal: spacing[4],
  },
  calendarCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  calendarNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  calendarNavButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarSubtitle: {
    fontSize: typography.sizes.sm,
    minWidth: 140,
    textAlign: 'center',
  },
  calendarScrollContent: {
    paddingRight: spacing[4],
  },
  monthLabelsRow: {
    flexDirection: 'row',
    position: 'relative',
    height: 18,
    marginBottom: spacing[2],
  },
  monthLabel: {
    position: 'absolute',
    fontSize: typography.sizes.xs,
  },
  calendarContainer: {
    flexDirection: 'row',
  },
  dayLabels: {
    width: 28,
    justifyContent: 'space-between',
    marginRight: spacing[1],
    paddingVertical: 1,
  },
  dayLabel: {
    fontSize: 10,
    height: 13,
    lineHeight: 13,
  },
  calendar: {
    flexDirection: 'row',
    gap: 3,
  },
  calendarWeek: {
    flexDirection: 'column',
    gap: 3,
  },
  calendarDay: {
    width: 13,
    height: 13,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 100ms ease',
      } as any,
    }),
  },
  signupStar: {
    position: 'absolute',
  },
  calendarLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing[4],
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDay: {
    width: 13,
    height: 13,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    marginHorizontal: spacing[1],
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    ...shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing[3],
  },
  signupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  signupBannerText: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[4],
  },
  modalStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  modalStatValue: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
  },
  modalStatLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  modalStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing[2],
  },
  noActivityText: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    paddingVertical: spacing[4],
  },
  // Modal assessment breakdown
  assessmentBreakdown: {
    borderTopWidth: 1,
    marginTop: spacing[4],
    paddingTop: spacing[4],
  },
  assessmentTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  assessmentItem: {
    alignItems: 'center',
    gap: spacing[1],
  },
  assessmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assessmentLabel: {
    fontSize: typography.sizes.xs,
  },
  assessmentValue: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  progressCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  timePeriodChips: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  timePeriodChip: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  timePeriodChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
  },
  progressItem: {
    marginBottom: spacing[4],
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing[2],
  },
  progressLabel: {
    flex: 1,
    fontSize: typography.sizes.sm,
  },
  progressValue: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  totalCards: {
    marginTop: spacing[2],
    paddingTop: spacing[4],
    borderTopWidth: 1,
  },
  totalCardsText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  assessmentCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    ...shadows.sm,
  },
  assessmentSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[4],
    marginTop: -spacing[2],
  },
  assessmentBars: {
    gap: spacing[3],
  },
  assessmentBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  assessmentBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
    gap: spacing[2],
  },
  assessmentBarText: {
    fontSize: typography.sizes.sm,
  },
  assessmentBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  assessmentBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  assessmentBarValue: {
    width: 40,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  infoModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    ...shadows.xl,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  infoModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  infoModalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  infoModalText: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  infoModalButton: {
    marginTop: spacing[5],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  infoModalButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
});
