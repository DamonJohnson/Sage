import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { DeckCard } from '@/components/deck';
import { useDeckStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import type { DeckWithStats } from '@sage/shared';

// Reusable hover hook
function useHoverState() {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};
  return { isHovered, webProps };
}

type SortOption = 'recent' | 'alphabetical' | 'progress' | 'due';
type FilterOption = 'all' | 'due' | 'mastered';

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { decks } = useDeckStore();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Hover states
  const discoverBtn = useHoverState();
  const clearSearchBtn = useHoverState();
  const sortBtn = useHoverState();
  const createBtn = useHoverState();
  const browseBtn = useHoverState();

  const webButtonStyle = Platform.OS === 'web' ? {
    cursor: 'pointer' as const,
    transition: 'transform 150ms ease, background-color 150ms ease, border-color 150ms ease',
  } : {};

  // Responsive values
  const containerMaxWidth = isDesktop ? 1200 : isTablet ? 900 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];
  const deckGridColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  // Helper function to filter and sort decks
  const filterAndSortDecks = (deckList: DeckWithStats[]) => {
    let result = [...deckList];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (filterBy === 'due') {
      result = result.filter((d) => d.dueCount > 0);
    } else if (filterBy === 'mastered') {
      result = result.filter((d) => d.masteryLevel === 'mastered');
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => {
          const aDate = a.lastStudied ? new Date(a.lastStudied).getTime() : 0;
          const bDate = b.lastStudied ? new Date(b.lastStudied).getTime() : 0;
          return bDate - aDate;
        });
        break;
      case 'alphabetical':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'progress':
        result.sort((a, b) => {
          const aProgress = a.cardCount > 0 ? a.masteredCount / a.cardCount : 0;
          const bProgress = b.cardCount > 0 ? b.masteredCount / b.cardCount : 0;
          return bProgress - aProgress;
        });
        break;
      case 'due':
        result.sort((a, b) => b.dueCount - a.dueCount);
        break;
    }

    return result;
  };

  // Separate decks into My Created Decks (created by user) and Saved Public Decks (cloned from others)
  const { myDecks, savedDecks } = useMemo(() => {
    const my: DeckWithStats[] = [];
    const saved: DeckWithStats[] = [];

    decks.forEach((deck) => {
      // If deck has originalAuthorId, it's a saved/cloned deck
      if (deck.originalAuthorId && deck.originalAuthorName) {
        saved.push(deck);
      } else {
        my.push(deck);
      }
    });

    return {
      myDecks: filterAndSortDecks(my),
      savedDecks: filterAndSortDecks(saved),
    };
  }, [decks, searchQuery, sortBy, filterBy]);

  const totalDecks = myDecks.length + savedDecks.length;

  const handleDeckPress = (deckId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('DeckDetail', { deckId });
  };

  const handleAuthorPress = (authorId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('UserProfile', { userId: authorId });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: isMobile ? insets.top : spacing[6],
          paddingHorizontal: contentPadding,
          maxWidth: containerMaxWidth,
          alignSelf: 'center',
          width: '100%',
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: textPrimary }, isDesktop && styles.titleDesktop]}>Library</Text>
        <TouchableOpacity
          style={[
            styles.discoverButton,
            { backgroundColor: discoverBtn.isHovered ? surfaceHover : surface, borderColor: discoverBtn.isHovered ? accent.orange : border },
            webButtonStyle,
          ]}
          onPress={() => navigation.navigate('Social', {})}
          {...discoverBtn.webProps}
        >
          <Ionicons name="people-outline" size={22} color={accent.orange} />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={[styles.headerContainer, isDesktop && styles.headerContainerDesktop]}>
        {/* Search */}
        <View style={[
          styles.searchContainer,
          { backgroundColor: surface, borderColor: border },
          isDesktop && styles.searchContainerDesktop
        ]}>
          <Ionicons name="search" size={18} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="Search decks..."
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={Platform.OS === 'web' ? { cursor: 'pointer' } as any : undefined}
              {...clearSearchBtn.webProps}
            >
              <Ionicons name="close-circle" size={18} color={clearSearchBtn.isHovered ? accent.orange : textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter and Sort Row */}
        <View style={[styles.filterSortRow, isDesktop && styles.filterSortRowDesktop]}>
          {/* Filter Chips */}
          <View style={styles.filterRow}>
            <ScrollableChips
              options={[
                { key: 'all', label: 'All' },
                { key: 'due', label: 'Due' },
                { key: 'mastered', label: 'Mastered' },
              ]}
              selected={filterBy}
              onSelect={(key) => setFilterBy(key as FilterOption)}
              surface={surface}
              surfaceHover={surfaceHover}
              border={border}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              accent={accent}
            />
          </View>

          {/* Sort */}
          <View style={styles.sortRow}>
            <Text style={[styles.resultCount, { color: textSecondary }]}>
              {totalDecks} deck{totalDecks !== 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={[
                styles.sortButton,
                Platform.OS === 'web' && { cursor: 'pointer', transition: 'opacity 150ms ease' } as any,
              ]}
              onPress={() => {
                const options: SortOption[] = ['recent', 'alphabetical', 'progress', 'due'];
                const currentIndex = options.indexOf(sortBy);
                setSortBy(options[(currentIndex + 1) % options.length]);
              }}
              {...sortBtn.webProps}
            >
              <Ionicons name="swap-vertical" size={16} color={sortBtn.isHovered ? accent.orange : textSecondary} />
              <Text style={[styles.sortText, { color: sortBtn.isHovered ? accent.orange : textSecondary }]}>
                {sortBy === 'recent' && 'Recent'}
                {sortBy === 'alphabetical' && 'A-Z'}
                {sortBy === 'progress' && 'Progress'}
                {sortBy === 'due' && 'Due'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* My Created Decks Section - Always visible */}
      <View style={styles.deckSection}>
        <View style={[styles.sectionHeader, { borderBottomColor: border }]}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="person" size={18} color={accent.orange} />
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>My Created Decks</Text>
          </View>
          <Text style={[styles.sectionCount, { color: textSecondary }]}>
            {myDecks.length} deck{myDecks.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {myDecks.length > 0 ? (
          <View style={[
            styles.deckGrid,
            {
              flexDirection: deckGridColumns > 1 ? 'row' : 'column',
              flexWrap: 'wrap',
            }
          ]}>
            {myDecks.map((deck) => (
              <View
                key={deck.id}
                style={{
                  width: deckGridColumns > 1 ? `${100 / deckGridColumns - 2}%` : '100%',
                  marginRight: deckGridColumns > 1 ? '2%' : 0,
                  marginBottom: spacing[4],
                }}
              >
                <DeckCard
                  deck={deck}
                  onPress={() => handleDeckPress(deck.id)}
                  onAuthorPress={handleAuthorPress}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.sectionEmptyState, { backgroundColor: surface, borderColor: border }]}>
            <Ionicons name="create-outline" size={32} color={textSecondary} />
            <Text style={[styles.sectionEmptyText, { color: textSecondary }]}>
              {searchQuery ? 'No matching decks' : 'No decks created yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={[styles.sectionEmptyButton, { backgroundColor: accent.orange }]}
                onPress={() => navigation.navigate('CreateTab' as never)}
              >
                <Text style={styles.sectionEmptyButtonText}>Create Deck</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Saved Public Decks Section - Always visible */}
      <View style={styles.deckSection}>
        <View style={[styles.sectionHeader, { borderBottomColor: border }]}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="bookmark" size={18} color={accent.blue} />
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Saved Public Decks</Text>
          </View>
          <Text style={[styles.sectionCount, { color: textSecondary }]}>
            {savedDecks.length} deck{savedDecks.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {savedDecks.length > 0 ? (
          <View style={[
            styles.deckGrid,
            {
              flexDirection: deckGridColumns > 1 ? 'row' : 'column',
              flexWrap: 'wrap',
            }
          ]}>
            {savedDecks.map((deck) => (
              <View
                key={deck.id}
                style={{
                  width: deckGridColumns > 1 ? `${100 / deckGridColumns - 2}%` : '100%',
                  marginRight: deckGridColumns > 1 ? '2%' : 0,
                  marginBottom: spacing[4],
                }}
              >
                <DeckCard
                  deck={deck}
                  onPress={() => handleDeckPress(deck.id)}
                  onAuthorPress={handleAuthorPress}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.sectionEmptyState, { backgroundColor: surface, borderColor: border }]}>
            <Ionicons name="compass-outline" size={32} color={textSecondary} />
            <Text style={[styles.sectionEmptyText, { color: textSecondary }]}>
              {searchQuery ? 'No matching decks' : 'No saved decks yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={[styles.sectionEmptyButton, { backgroundColor: accent.blue }]}
                onPress={() => navigation.navigate('DiscoverTab' as never)}
              >
                <Text style={styles.sectionEmptyButtonText}>Browse Public Decks</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Bottom spacing */}
      <View style={{ height: spacing[20] }} />
    </ScrollView>
  );
}

// Helper component for filter chips with hover
function ChipButton({
  option,
  isSelected,
  onSelect,
  surface,
  surfaceHover,
  border,
  textSecondary,
  accent,
}: {
  option: { key: string; label: string };
  isSelected: boolean;
  onSelect: () => void;
  surface: string;
  surfaceHover: string;
  border: string;
  textSecondary: string;
  accent: { orange: string };
}) {
  const [isHovered, setIsHovered] = useState(false);
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? accent.orange : (isHovered ? surfaceHover : surface),
          borderColor: isSelected ? accent.orange : (isHovered ? accent.orange : border),
        },
        Platform.OS === 'web' && { cursor: 'pointer', transition: 'background-color 150ms ease, border-color 150ms ease' } as any,
      ]}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
        onSelect();
      }}
      {...webProps}
    >
      <Text style={[
        styles.chipText,
        { color: isSelected ? '#fff' : (isHovered ? accent.orange : textSecondary) }
      ]}>
        {option.label}
      </Text>
    </TouchableOpacity>
  );
}

// Helper component for filter chips
function ScrollableChips({
  options,
  selected,
  onSelect,
  surface,
  surfaceHover,
  border,
  textPrimary,
  textSecondary,
  accent,
}: {
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
  surface: string;
  surfaceHover: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: { orange: string; blue: string; green: string; red: string };
}) {
  return (
    <View style={styles.chipsContainer}>
      {options.map((option) => (
        <ChipButton
          key={option.key}
          option={option}
          isSelected={selected === option.key}
          onSelect={() => onSelect(option.key)}
          surface={surface}
          surfaceHover={surfaceHover}
          border={border}
          textSecondary={textSecondary}
          accent={accent}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[4],
  },
  btnHovered: {
    transform: [{ scale: 1.02 }],
    ...shadows.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.semibold,
  },
  titleDesktop: {
    fontSize: typography.sizes['3xl'],
  },
  discoverButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    marginBottom: spacing[4],
  },
  headerContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: Platform.OS === 'ios' ? spacing[2.5] : spacing[2],
    marginBottom: spacing[3],
    borderWidth: 1,
  },
  searchContainerDesktop: {
    flex: 1,
    maxWidth: 400,
    marginBottom: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    marginLeft: spacing[2],
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  filterSortRow: {
    flexDirection: 'column',
  },
  filterSortRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
  },
  filterRow: {
    marginBottom: spacing[3],
  },
  chipsContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    marginRight: spacing[2],
    borderWidth: 1,
  },
  chipText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[4],
  },
  resultCount: {
    fontSize: typography.sizes.base,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: typography.sizes.base,
    marginLeft: spacing[1],
  },
  deckSection: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[3],
    marginBottom: spacing[4],
    borderBottomWidth: 1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionCount: {
    fontSize: typography.sizes.sm,
  },
  sectionEmptyState: {
    alignItems: 'center',
    padding: spacing[8],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  sectionEmptyText: {
    fontSize: typography.sizes.base,
    marginTop: spacing[3],
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  sectionEmptyButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
  },
  sectionEmptyButtonText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  deckGrid: {
    marginTop: spacing[2],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing[4],
  },
  emptySubtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[5],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  browseButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.fontWeight.medium,
  },
});
