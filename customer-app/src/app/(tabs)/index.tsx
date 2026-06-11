import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../../components/ui/SafeScreen';
import type { NearbyRestaurant } from '../../lib/api';
import { getNearbyRestaurants } from '../../lib/api';
import { useAuthStore } from '../../lib/store/auth.store';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

const DEV_LAT = 12.9716;
const DEV_LNG = 77.5946;

const CATEGORIES = [
  { icon: '🍕', label: 'Pizza' },
  { icon: '🍔', label: 'Burger' },
  { icon: '🍚', label: 'Biryani' },
  { icon: '🥡', label: 'Chinese' },
  { icon: '🍰', label: 'Desserts' },
  { icon: '🥗', label: 'Healthy' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { customer } = useAuthStore();
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    try {
      setError(null);
      const data = await getNearbyRestaurants(DEV_LAT, DEV_LNG, 10);
      setRestaurants(data);
    } catch {
      setError('Could not load restaurants. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  const filtered = restaurants.filter(
    (r) =>
      search.trim() === '' ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisineType.toLowerCase().includes(search.toLowerCase()),
  );

  const renderRestaurantCard = ({ item }: { item: NearbyRestaurant }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.85}
    >
      {/* Cover */}
      <View style={styles.cardCover}>
        <Text style={styles.cardCoverEmoji}>🍽️</Text>
        {/* Distance badge */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>
            {item.distance === 0 ? 'Nearby' : `${item.distance.toFixed(1)} km`}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          {/* Rating placeholder */}
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>⭐ 4.5</Text>
          </View>
        </View>

        <Text style={styles.cardCuisine}>{item.cuisineType}</Text>

        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>📍 {item.city}</Text>
          <View style={styles.freeDeliveryBadge}>
            <Text style={styles.freeDeliveryText}>Free delivery</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const firstName = customer?.name?.split(' ')[0] ?? 'there';

  return (
    <SafeScreen>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderRestaurantCard}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View>
            {/* Top bar */}
            <View style={styles.topBar}>
              <View>
                <Text style={styles.greeting}>Hey {firstName} 👋</Text>
                <Text style={styles.tagline}>What are you craving today?</Text>
              </View>
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search food, restaurants, cuisines"
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Promo banner */}
            <View style={styles.promoBanner}>
              <View style={styles.promoContent}>
                <Text style={styles.promoDiscount}>50% OFF</Text>
                <Text style={styles.promoSub}>On your first order</Text>
                <TouchableOpacity style={styles.promoBtn}>
                  <Text style={styles.promoBtnText}>ORDER NOW</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.promoEmoji}>🍱</Text>
            </View>

            {/* Category chips */}
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.label}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRow}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.categoryChip}>
                  <View style={styles.categoryIcon}>
                    <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  </View>
                  <Text style={styles.categoryLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />

            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Restaurants</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            {/* Loading / error states */}
            {loading && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Finding restaurants near you...</Text>
              </View>
            )}
            {error && !loading && (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchRestaurants}>
                  <Text style={styles.retryText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.centered}>
              <Text style={{ fontSize: 48 }}>🔍</Text>
              <Text style={styles.emptyText}>No restaurants found</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 32,
    backgroundColor: colors.surfaceAlt,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.surface,
  },
  greeting: {
    ...type.h3,
    color: colors.ink,
  },
  tagline: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: space.sm,
  },
  searchInput: {
    flex: 1,
    ...type.body,
    color: colors.ink,
  },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    marginHorizontal: space.lg,
    marginBottom: space.lg,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1,
  },
  promoDiscount: {
    ...type.h1,
    color: colors.surface,
  },
  promoSub: {
    ...type.caption,
    color: colors.surface,
    opacity: 0.9,
    marginTop: 2,
  },
  promoBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    alignSelf: 'flex-start',
    marginTop: space.sm,
  },
  promoBtnText: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    color: colors.primary,
  },
  promoEmoji: {
    fontSize: 56,
    marginLeft: space.md,
  },
  categoriesRow: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  categoryChip: {
    alignItems: 'center',
    width: 64,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  categoryLabel: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.xs,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  sectionTitle: {
    ...type.h3,
    color: colors.ink,
  },
  seeAll: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    overflow: 'hidden',
    ...cardShadow,
  },
  cardCover: {
    height: 160,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCoverEmoji: {
    fontSize: 56,
  },
  distanceBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    ...cardShadow,
  },
  distanceBadgeText: {
    ...type.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  cardContent: {
    padding: space.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    ...type.title,
    color: colors.ink,
    flex: 1,
    marginRight: space.sm,
  },
  ratingPill: {
    backgroundColor: colors.secondary,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  ratingText: {
    ...type.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  cardCuisine: {
    ...type.caption,
    color: colors.muted,
    marginTop: 3,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
  },
  cardMetaText: {
    ...type.caption,
    color: colors.muted,
  },
  freeDeliveryBadge: {
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  freeDeliveryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 14,
    color: colors.secondary,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  loadingText: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.sm,
  },
  errorText: {
    ...type.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: space.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
  },
  retryText: {
    ...type.bodyMedium,
    color: colors.surface,
  },
  emptyText: {
    ...type.body,
    color: colors.muted,
    marginTop: space.md,
  },
});
