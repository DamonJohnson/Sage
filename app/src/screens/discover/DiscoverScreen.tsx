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
import { spacing, typography, borderRadius } from '@/theme';
import { fetchPublicDecks, type PublicDeckWithAuthor } from '@/services';
import { PublicDeckCard } from '@/components/deck';
import { Footer } from '@/components/layout';

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, border, textPrimary, textSecondary, accent } = useThemedColors();

  const [searchQuery, setSearchQuery] = useState('');
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
  }, [searchQuery, page]);

  useEffect(() => {
    loadDecks(true);
  }, [searchQuery]);

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

  const renderDeckCard = ({ item }: { item: PublicDeckWithAuthor }) => {
    const cardWidth = isDesktop
      ? `${100 / 3}%`
      : isTablet
        ? '50%'
        : '100%';

    return (
      <View style={{ width: cardWidth, paddingHorizontal: isDesktop || isTablet ? spacing[2] : 0, marginBottom: spacing[4] }}>
        <PublicDeckCard
          deck={item}
          onPress={() => handleDeckPress(item.id)}
          onAuthorPress={handleAuthorPress}
        />
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
          placeholder="Search by title or description..."
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

      {/* Results Count */}
      {!isLoading && (
        <Text style={[styles.resultsCount, { color: textSecondary }]}>
          {decks.length} {decks.length === 1 ? 'deck' : 'decks'} found
          {searchQuery && ` for "${searchQuery}"`}
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
          ? `Try a different search term`
          : `No public decks available yet`}
      </Text>
    </View>
  );

  const renderFooter = () => {
    return (
      <View>
        {hasMore && (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" color={accent.orange} />
          </View>
        )}
        <View style={{ marginTop: spacing[6] }}>
          <Footer />
        </View>
        <View style={{ height: spacing[10] }} />
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
  resultsCount: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[2],
  },
  listContent: {
    paddingBottom: spacing[20],
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
