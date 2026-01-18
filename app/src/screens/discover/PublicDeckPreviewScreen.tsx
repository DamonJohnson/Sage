import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { GradientButton } from '@/components/ui';
import { useDeckStore, useAuthStore } from '@/store';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemedColors } from '@/hooks/useThemedColors';
import { spacing, typography, borderRadius, shadows } from '@/theme';
import { moderateContent, sanitizeContent } from '@/utils/contentModeration';
import {
  fetchPublicDeck,
  clonePublicDeck,
  submitDeckRating,
  fetchDeckReviews,
  fetchMyRating,
  type PublicDeckWithAuthor,
  type DeckRating,
} from '@/services';
import type { RootStackScreenProps } from '@/navigation/types';
import type { Card } from '@sage/shared';

export function PublicDeckPreviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RootStackScreenProps<'PublicDeckPreview'>['route']>();
  const { deckId } = route.params;
  const { isDesktop, isTablet, isMobile } = useResponsive();
  const { background, surface, surfaceHover, border, textPrimary, textSecondary, accent } = useThemedColors();

  const { refreshDecks } = useDeckStore();
  const { user } = useAuthStore();

  const [deck, setDeck] = useState<PublicDeckWithAuthor | null>(null);
  const [sampleCards, setSampleCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [hasImported, setHasImported] = useState(false);
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<DeckRating[]>([]);
  const [myRating, setMyRating] = useState<DeckRating | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const containerMaxWidth = isDesktop ? 800 : isTablet ? 600 : '100%';
  const contentPadding = isDesktop ? spacing[8] : isTablet ? spacing[6] : spacing[4];

  // Fetch deck data from API
  useEffect(() => {
    async function loadDeck() {
      setIsLoading(true);
      setLoadError(null);

      const response = await fetchPublicDeck(deckId);

      if (response.success && response.data) {
        setDeck(response.data.deck);
        setSampleCards(response.data.cards.slice(0, 5)); // Show first 5 cards as preview
      } else {
        setLoadError(response.error || 'Failed to load deck');
      }

      setIsLoading(false);
    }

    loadDeck();
  }, [deckId]);

  // Fetch reviews and user's rating
  useEffect(() => {
    async function loadReviews() {
      setIsLoadingReviews(true);

      // Fetch reviews
      const reviewsResponse = await fetchDeckReviews(deckId);
      if (reviewsResponse.success && reviewsResponse.data) {
        setReviews(reviewsResponse.data.reviews);
      }

      // Fetch user's own rating
      const myRatingResponse = await fetchMyRating(deckId);
      if (myRatingResponse.success && myRatingResponse.data) {
        setMyRating(myRatingResponse.data);
        setUserRating(myRatingResponse.data.rating);
        setReviewText(myRatingResponse.data.reviewText || '');
      }

      setIsLoadingReviews(false);
    }

    loadReviews();
  }, [deckId]);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={accent.orange} />
        <Text style={[styles.loadingText, { color: textSecondary, marginTop: spacing[4] }]}>Loading deck...</Text>
      </View>
    );
  }

  // Error state
  if (loadError || !deck) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={textSecondary} />
        <Text style={[styles.errorTitle, { color: textPrimary }]}>{loadError || 'Deck not found'}</Text>
        <GradientButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing[6] }}
        />
      </View>
    );
  }

  const handleImport = async () => {
    setIsSubmitting(true);

    const response = await clonePublicDeck(deckId);

    setIsSubmitting(false);

    if (!response.success || !response.data) {
      Alert.alert('Error', response.error || 'Failed to save deck. Please try again.');
      return;
    }

    const newDeckId = response.data.id;

    // Refresh decks to include the newly cloned deck
    await refreshDecks();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHasImported(true);
    setSavedDeckId(newDeckId);

    Alert.alert(
      'Deck Saved!',
      'The deck has been added to your library. Would you like to rate this deck?',
      [
        {
          text: 'View Deck',
          onPress: () => navigation.navigate('DeckDetail', { deckId: newDeckId }),
        },
        {
          text: 'Rate Now',
          onPress: () => setShowRatingModal(true),
        },
      ]
    );
  };

  const handleRatingSubmit = async () => {
    if (userRating === 0) {
      Alert.alert('Please select a rating');
      return;
    }

    // Validate review text if provided
    if (reviewText.trim()) {
      const sanitized = sanitizeContent(reviewText);
      const moderation = moderateContent(sanitized);

      if (!moderation.isApproved) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        Alert.alert('Review not allowed', moderation.reason || 'Your review could not be posted.');
        return;
      }
    }

    setIsSubmitting(true);

    const response = await submitDeckRating(deckId, userRating, reviewText.trim() || undefined);

    setIsSubmitting(false);

    if (!response.success) {
      Alert.alert('Error', response.error || 'Failed to submit rating');
      return;
    }

    // Update local state
    setMyRating(response.data!);

    // Refresh reviews list
    const reviewsResponse = await fetchDeckReviews(deckId);
    if (reviewsResponse.success && reviewsResponse.data) {
      setReviews(reviewsResponse.data.reviews);
    }

    // Update deck rating info
    if (deck) {
      const newRatingCount = myRating ? deck.ratingCount : deck.ratingCount + 1;
      const newRatingSum = myRating
        ? deck.ratingSum - myRating.rating + userRating
        : deck.ratingSum + userRating;
      setDeck({
        ...deck,
        ratingCount: newRatingCount,
        ratingSum: newRatingSum,
        averageRating: newRatingSum / newRatingCount,
      });
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowRatingModal(false);

    Alert.alert(
      'Thanks for rating!',
      'Your feedback helps other learners find great decks.',
      [
        {
          text: hasImported ? 'Go to Library' : 'OK',
          onPress: () => {
            if (hasImported) {
              navigation.navigate('Main', { screen: 'LibraryTab' });
            }
          },
        },
      ]
    );
  };

  const renderStarRating = (rating: number, interactive: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => interactive && setUserRating(i)}
          disabled={!interactive}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={interactive ? 36 : 16}
            color={i <= rating ? accent.orange : textSecondary}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const handleOpenRatingModal = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Pre-populate with existing rating if user has one
    if (myRating) {
      setUserRating(myRating.rating);
      setReviewText(myRating.reviewText || '');
    } else {
      setUserRating(0);
      setReviewText('');
    }
    setShowRatingModal(true);
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
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Preview</Text>
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
        {/* Deck Info Card */}
        <View style={[styles.deckInfoCard, { backgroundColor: surface }]}>
          {/* Author Row */}
          <TouchableOpacity
            style={[styles.authorRow, Platform.OS === 'web' && { cursor: 'pointer' } as any]}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.navigate('UserProfile', { userId: deck.userId });
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.authorAvatar, { backgroundColor: accent.orange + '20' }]}>
              <Text style={[styles.authorInitial, { color: accent.orange }]}>
                {deck.authorName.charAt(0)}
              </Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, styles.authorNameLink, { color: accent.blue }]}>{deck.authorName}</Text>
              <Text style={[styles.authorMeta, { color: textSecondary }]}>
                {deck.category} • Updated recently
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={accent.blue} />
          </TouchableOpacity>

          {/* Title & Description */}
          <Text style={[styles.deckTitle, { color: textPrimary }]}>{deck.title}</Text>
          <Text style={[styles.deckDescription, { color: textSecondary }]}>{deck.description}</Text>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {deck.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: surfaceHover }]}>
                <Text style={[styles.tagText, { color: textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Stats Row */}
          <View style={[styles.statsRow, { borderTopColor: border }]}>
            <View style={styles.stat}>
              <Ionicons name="documents-outline" size={18} color={accent.orange} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{deck.cardCount}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>cards</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="download-outline" size={18} color={accent.orange} />
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {(deck.downloadCount / 1000).toFixed(1)}k
              </Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>imports</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="star" size={18} color={accent.orange} />
              <Text style={[styles.statValue, { color: textPrimary }]}>{deck.averageRating.toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>({deck.ratingCount})</Text>
            </View>
          </View>

          {/* Import Button - placed inside deck info for prominence */}
          <View style={[styles.importSectionInCard, { borderTopColor: border }]}>
            {hasImported && savedDeckId ? (
              <>
                <View style={[styles.savedIndicator, { backgroundColor: accent.green + '15' }]}>
                  <Ionicons name="checkmark-circle" size={20} color={accent.green} />
                  <Text style={[styles.savedIndicatorText, { color: accent.green }]}>Saved to Library</Text>
                </View>
                <GradientButton
                  title="View in Library"
                  onPress={() => navigation.navigate('Main', { screen: 'LibraryTab' })}
                  size="lg"
                  icon={<Ionicons name="library" size={20} color="#fff" />}
                />
              </>
            ) : (
              <>
                <GradientButton
                  title="Save to My Library"
                  onPress={handleImport}
                  disabled={isSubmitting}
                  size="lg"
                  icon={<Ionicons name="bookmark" size={20} color="#fff" />}
                />
                <Text style={[styles.importHint, { color: textSecondary }]}>
                  This deck will be saved to your library
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Sample Cards Section */}
        <View style={styles.sampleSection}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Sample Cards</Text>
          <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
            Preview {sampleCards.length} of {deck.cardCount} cards
          </Text>

          {sampleCards.map((card, index) => (
            <View key={card.id} style={[styles.sampleCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={[styles.cardNumber, { backgroundColor: accent.orange + '20' }]}>
                <Text style={[styles.cardNumberText, { color: accent.orange }]}>{index + 1}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: textSecondary }]}>FRONT</Text>
                <Text style={[styles.cardText, { color: textPrimary }]}>{card.front}</Text>
                <View style={[styles.cardDivider, { backgroundColor: border }]} />
                <Text style={[styles.cardLabel, { color: textSecondary }]}>BACK</Text>
                <Text style={[styles.cardText, { color: textPrimary }]}>{card.back}</Text>
              </View>
            </View>
          ))}

          {deck.cardCount > sampleCards.length && (
            <View style={[styles.moreCardsHint, { backgroundColor: surfaceHover }]}>
              <Ionicons name="layers-outline" size={20} color={textSecondary} />
              <Text style={[styles.moreCardsText, { color: textSecondary }]}>
                +{deck.cardCount - sampleCards.length} more cards after saving
              </Text>
            </View>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.commentsSection}>
          <View style={styles.reviewsHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Reviews</Text>
              <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.writeReviewBtn, { backgroundColor: accent.orange }]}
              onPress={handleOpenRatingModal}
            >
              <Ionicons name="star" size={16} color="#FFFFFF" />
              <Text style={styles.writeReviewBtnText}>
                {myRating ? 'Edit Review' : 'Write Review'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* User's own rating if exists */}
          {myRating && (
            <View style={[styles.myReviewCard, { backgroundColor: accent.orange + '10', borderColor: accent.orange }]}>
              <View style={styles.myReviewBadge}>
                <Text style={[styles.myReviewBadgeText, { color: accent.orange }]}>Your Review</Text>
              </View>
              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= myRating.rating ? 'star' : 'star-outline'}
                    size={16}
                    color={accent.orange}
                  />
                ))}
              </View>
              {myRating.reviewText && (
                <Text style={[styles.commentContent, { color: textPrimary, marginTop: spacing[2] }]}>
                  {myRating.reviewText}
                </Text>
              )}
              <Text style={[styles.commentTime, { color: textSecondary, marginTop: spacing[2] }]}>
                {formatTimeAgo(myRating.createdAt)}
              </Text>
            </View>
          )}

          {/* Loading indicator */}
          {isLoadingReviews && reviews.length === 0 && (
            <View style={styles.loadingReviews}>
              <ActivityIndicator size="small" color={accent.orange} />
              <Text style={[styles.loadingReviewsText, { color: textSecondary }]}>Loading reviews...</Text>
            </View>
          )}

          {/* Reviews List */}
          {reviews
            .filter((review) => review.userId !== user?.id) // Don't show user's own review in list
            .map((review) => (
              <View key={review.id} style={[styles.commentCard, { backgroundColor: surface }]}>
                <View style={styles.commentHeader}>
                  <View style={[styles.commentAvatar, { backgroundColor: accent.orange + '20' }]}>
                    <Text style={[styles.commentAvatarText, { color: accent.orange }]}>
                      {(review.userName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentMeta}>
                    <Text style={[styles.commentAuthor, { color: textPrimary }]}>{review.userName || 'Anonymous'}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.rating ? 'star' : 'star-outline'}
                          size={12}
                          color={accent.orange}
                        />
                      ))}
                      <Text style={[styles.commentTime, { color: textSecondary, marginLeft: spacing[2] }]}>
                        {formatTimeAgo(review.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
                {review.reviewText && (
                  <Text style={[styles.commentContent, { color: textPrimary }]}>{review.reviewText}</Text>
                )}
              </View>
            ))}

          {reviews.length === 0 && !isLoadingReviews && !myRating && (
            <View style={styles.noCommentsState}>
              <Ionicons name="star-outline" size={32} color={textSecondary} />
              <Text style={[styles.noCommentsText, { color: textSecondary }]}>
                No reviews yet. Be the first to rate this deck!
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: spacing[20] }} />
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.ratingModal, { backgroundColor: surface }]}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowRatingModal(false)}
            >
              <Ionicons name="close" size={24} color={textSecondary} />
            </TouchableOpacity>

            <View style={[styles.ratingIconContainer, { backgroundColor: accent.orange + '15' }]}>
              <Ionicons name="star" size={40} color={accent.orange} />
            </View>

            <Text style={[styles.ratingTitle, { color: textPrimary }]}>
              {myRating ? 'Update your review' : 'Rate this deck'}
            </Text>
            <Text style={[styles.ratingSubtitle, { color: textSecondary }]}>
              How would you rate "{deck.title}"?
            </Text>

            {renderStarRating(userRating, true)}

            {/* Review Text Input */}
            <View style={[styles.reviewInputContainer, { backgroundColor: surfaceHover, borderColor: border }]}>
              <TextInput
                style={[styles.reviewInput, { color: textPrimary }]}
                placeholder="Write a review (optional)..."
                placeholderTextColor={textSecondary}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                maxLength={500}
                numberOfLines={3}
              />
            </View>
            <Text style={[styles.charCount, { color: textSecondary }]}>
              {reviewText.length}/500
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: userRating > 0 ? accent.orange : surfaceHover },
              ]}
              onPress={handleRatingSubmit}
              disabled={isSubmitting || userRating === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.submitButtonText, { color: userRating > 0 ? '#FFFFFF' : textSecondary }]}>
                  {myRating ? 'Update Review' : 'Submit Review'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  errorTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginTop: spacing[4],
  },
  loadingText: {
    fontSize: typography.sizes.base,
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
    paddingBottom: spacing[10],
  },
  deckInfoCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[6],
    ...shadows.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitial: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
  },
  authorInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  authorName: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  authorNameLink: {
    textDecorationLine: 'underline',
  },
  authorMeta: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  deckTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  deckDescription: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    marginBottom: spacing[4],
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing[4],
  },
  tag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    marginBottom: spacing[2],
  },
  tagText: {
    fontSize: typography.sizes.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: spacing[4],
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    marginTop: spacing[1],
  },
  statLabel: {
    fontSize: typography.sizes.xs,
  },
  sampleSection: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing[4],
  },
  sampleCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  cardNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  cardNumberText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing[1],
  },
  cardText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  cardDivider: {
    height: 1,
    marginVertical: spacing[3],
  },
  moreCardsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  moreCardsText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing[2],
  },
  importSection: {
    alignItems: 'center',
  },
  importSectionInCard: {
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing[4],
    marginTop: spacing[4],
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    marginBottom: spacing[3],
  },
  savedIndicatorText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  importHint: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  ratingModal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius['2xl'],
    padding: spacing[6],
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
  },
  ratingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  ratingTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  ratingSubtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: spacing[6],
  },
  starButton: {
    marginHorizontal: spacing[1],
  },
  submitButton: {
    width: '100%',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  // Comments section styles
  commentsSection: {
    marginTop: spacing[8],
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  commentInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    minHeight: 40,
    maxHeight: 100,
    marginRight: spacing[2],
  },
  commentSubmitButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitText: {
    fontSize: typography.sizes.sm,
  },
  commentCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    ...shadows.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  commentMeta: {
    marginLeft: spacing[3],
  },
  commentAuthor: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  commentTime: {
    fontSize: typography.sizes.xs,
    marginTop: 1,
  },
  commentContent: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  noCommentsState: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  noCommentsText: {
    fontSize: typography.sizes.sm,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  // Reviews section styles
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },
  writeReviewBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  myReviewCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  myReviewBadge: {
    marginBottom: spacing[2],
  },
  myReviewBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  loadingReviews: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[2],
  },
  loadingReviewsText: {
    fontSize: typography.sizes.sm,
  },
  reviewInputContainer: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[1],
  },
  reviewInput: {
    fontSize: typography.sizes.base,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: typography.sizes.xs,
    textAlign: 'right',
    marginBottom: spacing[4],
  },
});
