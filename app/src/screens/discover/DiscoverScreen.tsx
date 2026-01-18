import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import { fetchPublicDecks, fetchCategories, type PublicDeckWithAuthor, type PublicDeckCategory } from '@/services';

const CATEGORIES = ['All', 'Education', 'Languages', 'Technology', 'Science', 'History', 'Arts', 'Business'];

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [decks, setDecks] = useState<PublicDeckWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const containerMaxWidth = isDesktop ? 1000 : isTablet ? 800 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];
  const deckGridColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  const loadDecks = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 1 : page;
    if (resetPage) {
      setIsLoading(true);
    }

    const response = await fetchPublicDecks({
      search: searchQuery.trim() || undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      page: currentPage,
      limit: 12,
    });

    if (response.success && response.data) {
      if (resetPage) {
        setDecks(response.data.decks);
      } else {
        setDecks(prev => [...prev, ...response.data!.decks]);
      }
      setHasMore(response.data.hasMore);
      setPage(currentPage);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, [searchQuery, selectedCategory, page]);

  useEffect(() => {
    loadDecks(true);
  }, [searchQuery, selectedCategory]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDecks(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      setPage(prev => prev + 1);
      loadDecks(false);
    }
  };

  const handleDeckPress = (deckId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('PublicDeckPreview', { deckId });
  };

  const handleAuthorPress = (authorId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('UserProfile', { userId: authorId });
  };

  const handleCategoryPress = (category: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSelectedCategory(category);
  };

  const renderDeckCard = ({ item, index }: { item: PublicDeckWithAuthor; index: number }) => {
    const cardWidth = isDesktop
      ? `${100 / 3}%`
      : isTablet
        ? '50%'
        : '100%';

    return (
      <View style={{ width: cardWidth, paddingHorizontal: isDesktop || isTablet ? spacing[2] : 0, marginBottom: spacing[4] }}>
        <TouchableOpacity
          style={[styles.deckCard, { backgroundColor: surface, borderColor: border }]}
          onPress={() => handleDeckPress(item.id)}
          activeOpacity={0.7}
        >
          {/* Category Badge */}
          {item.category && (
            <View style={[styles.categoryBadge, { backgroundColor: accent.orange + '20' }]}>
              <Text style={[styles.categoryBadgeText, { color: accent.orange }]}>{item.category}</Text>
            </View>
          )}

          {/* Title & Description */}
          <Text style={[styles.deckTitle, { color: textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.deckDescription, { color: textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Author */}
          <TouchableOpacity
            style={[styles.authorRow, Platform.OS === 'web' && { cursor: 'pointer' } as any]}
            onPress={(e) => {
              e.stopPropagation();
              handleAuthorPress(item.userId);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.authorAvatar, { backgroundColor: accent.orange }]}>
              <Text style={styles.authorInitial}>{item.authorName?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <Text style={[styles.authorName, styles.authorNameLink, { color: accent.blue }]}>
              {item.authorName}
            </Text>
            <Ionicons name="chevron-forward" size={12} color={accent.blue} style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="documents-outline" size={14} color={textSecondary} />
              <Text style={[styles.statText, { color: textSecondary }]}>{item.cardCount} cards</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="download-outline" size={14} color={textSecondary} />
              <Text style={[styles.statText, { color: textSecondary }]}>{formatNumber(item.downloadCount)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color={accent.orange} />
              <Text style={[styles.statText, { color: textSecondary }]}>{item.averageRating.toFixed(1)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: surface, borderColor: border }]}>
        <Ionicons name="search" size={20} color={textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: textPrimary }]}
          placeholder="Search public decks..."
          placeholderTextColor={textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              { backgroundColor: surface, borderColor: border },
              selectedCategory === item && { backgroundColor: accent.orange, borderColor: accent.orange },
            ]}
            onPress={() => handleCategoryPress(item)}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: textSecondary },
                selectedCategory === item && { color: '#FFFFFF' },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results Count */}
      {!isLoading && (
        <Text style={[styles.resultsCount, { color: textSecondary }]}>
          {decks.length} {decks.length === 1 ? 'deck' : 'decks'} found
          {searchQuery && ` for "${searchQuery}"`}
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
        </Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={textSecondary} />
      <Text style={[styles.emptyTitle, { color: textPrimary }]}>No decks found</Text>
      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
        {searchQuery
          ? `Try a different search term or category`
          : `No public decks available in this category`}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={accent.orange} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: isMobile ? insets.top + spacing[2] : spacing[4],
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Discover</Text>
        <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
          Find and import public flashcard decks
        </Text>
      </View>

      {/* Content */}
      <FlatList
        data={decks}
        renderItem={renderDeckCard}
        keyExtractor={(item) => item.id}
        numColumns={deckGridColumns}
        key={deckGridColumns} // Force re-render when columns change
        contentContainerStyle={[
          styles.listContent,
          {
            maxWidth: containerMaxWidth,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: contentPadding,
          },
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={accent.orange}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      {/* Loading Overlay */}
      {isLoading && decks.length === 0 && (
        <View style={[styles.loadingOverlay, { backgroundColor: background }]}>
          <ActivityIndicator size="large" color={accent.orange} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>Loading decks...</Text>
        </View>
      )}
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: spacing[4],
  },
  headerTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.fontWeight.bold,
  },
  headerSubtitle: {
    fontSize: typography.sizes.base,
    marginTop: spacing[1],
  },
  headerContent: {
    marginBottom: spacing[4],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    padding: 0,
    margin: 0,
  },
  categoriesContainer: {
    paddingBottom: spacing[4],
    gap: spacing[2],
  },
  categoryChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing[2],
  },
  categoryChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.fontWeight.medium,
  },
  resultsCount: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[2],
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  deckCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing[4],
    ...shadows.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  categoryBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.medium,
  },
  deckTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[1],
  },
  deckDescription: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing[3],
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  authorInitial: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  authorName: {
    fontSize: typography.sizes.sm,
  },
  authorNameLink: {
    textDecorationLine: 'underline',
    fontWeight: typography.fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statText: {
    fontSize: typography.sizes.sm,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.base,
    marginTop: spacing[4],
  },
  loadingFooter: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
});
