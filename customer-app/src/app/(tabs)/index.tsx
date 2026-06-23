import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeScreen } from '../../components/ui/SafeScreen';
import type { NearbyRestaurant } from '../../lib/api';
import {
  getNearbyRestaurants,
  getPopularRestaurants,
  getTrendingRestaurants,
  getRecentlyOrderedRestaurants,
  getRestaurantsByCategory,
} from '../../lib/api';
import { useAuthStore } from '../../lib/store/auth.store';
import { useLocationStore } from '../../lib/store/location.store';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { icon: '🍕', label: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=200&auto=format&fit=crop' },
  { icon: '🍔', label: 'Burger', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop' },
  { icon: '🍚', label: 'Biryani', image: 'https://images.unsplash.com/photo-1589302168068-964664d93cb0?q=80&w=200&auto=format&fit=crop' },
  { icon: '🥡', label: 'Chinese', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=200&auto=format&fit=crop' },
  { icon: '🍰', label: 'Desserts', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=200&auto=format&fit=crop' },
  { icon: '🥗', label: 'Healthy', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=200&auto=format&fit=crop' },
];

const TAB_BAR_HEIGHT = 60;
const DELIVERY_RADIUS = 50000;

// ─── Sub-components ───────────────────────────────────────────────────────────

function LocationHeader({ city, isLocating, onRetry, firstName }: { city: string | null; isLocating: boolean; onRetry: () => void, firstName: string }) {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>Hello {firstName} 👋</Text>
          <TouchableOpacity style={styles.locationSelector} onPress={onRetry}>
            <Text style={styles.locationIcon}>📍</Text>
            {isLocating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.locationText} numberOfLines={1}>{city ?? 'Detecting location…'}</Text>
            )}
            <Text style={styles.chevron}>▾</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionIcon}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarContainer}>
            <Image source={{ uri: 'https://i.pravatar.cc/150?img=68' }} style={styles.avatarImage} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SearchBar({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.searchContainer} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.searchBar}>
        <Text style={{ fontSize: 18, marginRight: 12 }}>🔍</Text>
        <Text style={styles.searchText}>Restaurant name or dish...</Text>
      </View>
    </TouchableOpacity>
  );
}

function PromoCarousel() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoContainer}>
      <View style={styles.promoCard}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop' }} style={StyleSheet.absoluteFillObject} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.promoTextContainer}>
          <Text style={styles.promoBadge}>FESTIVAL OFFER</Text>
          <Text style={styles.promoTitle}>50% OFF</Text>
          <Text style={styles.promoSubtitle}>Up to ₹100 on your first order</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function CategoryItem({ item, isActive, onPress }: { item: any, isActive: boolean, onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.categoryItem}
      >
        <View style={[styles.categoryImageContainer, isActive && styles.categoryImageActive]}>
          <Image source={{ uri: item.image }} style={styles.categoryImage} />
          {isActive && <View style={styles.categoryActiveOverlay} />}
        </View>
        <Text style={[styles.categoryName, isActive && { color: colors.primary, fontFamily: type.h3.fontFamily }]}>
          {item.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function RestaurantCardLarge({ item, onPress }: { item: NearbyRestaurant; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 20 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  // Prefer cover image if available, else fallback to logo or unsplash generic food
  const coverUrl = item.coverImageUrl || item.logoUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop';
  const logoUrl = item.logoUrl || 'https://ui-avatars.com/api/?name=' + item.name + '&background=random';

  return (
    <Animated.View style={[styles.largeCardContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <View style={styles.largeCardCoverContainer}>
          <Image source={{ uri: coverUrl }} style={styles.largeCardCover} />
          <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />
          
          <View style={styles.topBadgesRow}>
            {item.distance <= 5 && (
              <View style={styles.glassBadge}>
                <Text style={styles.glassBadgeText}>Free Delivery</Text>
              </View>
            )}
            <View style={[styles.glassBadge, { backgroundColor: item.isOpen ? colors.success : colors.danger }]}>
              <Text style={[styles.glassBadgeText, { color: '#FFF' }]}>{item.isOpen ? 'Open Now' : 'Closed'}</Text>
            </View>
          </View>

          <View style={styles.bottomBadgesRow}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>50% OFF</Text>
            </View>
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>{item.deliveryTimeMin ? `${item.deliveryTimeMin} min` : `${item.distance.toFixed(1)} km`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.largeCardDetails}>
          <View style={styles.logoTitleRow}>
            <Image source={{ uri: logoUrl }} style={styles.restaurantLogo} />
            <View style={styles.titleColumn}>
              <Text style={styles.largeCardTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.largeCardCuisine}>{item.cuisineType ?? 'Restaurant'} • {item.distance.toFixed(1)} km</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingScore}>4.5</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { customer, isAuthenticated } = useAuthStore();
  const { lat, lng, city, isLocating, requestLocation } = useLocationStore();
  const insets = useSafeAreaInsets();

  const [nearby, setNearby] = useState<NearbyRestaurant[]>([]);
  const [popular, setPopular] = useState<NearbyRestaurant[]>([]);
  const [categoryResults, setCategoryResults] = useState<NearbyRestaurant[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null) {
      requestLocation();
    }
  }, []);

  const fetchAll = useCallback(async (userLat: number, userLng: number) => {
    try {
      setError(null);
      const [nearbyData, popularData] = await Promise.all([
        getNearbyRestaurants(userLat, userLng, DELIVERY_RADIUS),
        getPopularRestaurants(userLat, userLng, DELIVERY_RADIUS),
      ]);
      setNearby(nearbyData);
      setPopular(popularData);
    } catch {
      setError('Could not load restaurants. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (lat !== null && lng !== null) {
      setLoading(true);
      fetchAll(lat, lng);
    }
  }, [lat, lng, fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    setActiveCategory(null);
    setCategoryResults(null);
    if (lat !== null && lng !== null) {
      fetchAll(lat, lng);
    } else {
      requestLocation();
      setRefreshing(false);
    }
  };

  const handleCategoryPress = async (categoryLabel: string) => {
    if (activeCategory === categoryLabel) {
      setActiveCategory(null);
      setCategoryResults(null);
      return;
    }
    setActiveCategory(categoryLabel);
    try {
      const results = await getRestaurantsByCategory(categoryLabel, lat ?? undefined, lng ?? undefined, DELIVERY_RADIUS);
      setCategoryResults(results);
    } catch {
      setCategoryResults([]);
    }
  };

  const goToRestaurant = (id: string) => router.push(`/restaurant/${id}`);
  const firstName = customer?.name?.split(' ')[0] ?? 'there';
  const displayList = categoryResults ?? nearby;
  const displayTitle = activeCategory ? `${activeCategory} Restaurants` : 'Restaurants to explore';

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={styles.background}>
        <LinearGradient colors={[colors.primaryTint, colors.surfaceAlt, colors.surfaceAlt]} style={StyleSheet.absoluteFillObject} />
      </View>
      
      <LocationHeader city={city} isLocating={isLocating} onRetry={requestLocation} firstName={firstName} />
      <SearchBar onPress={() => router.push('/(tabs)/search')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}
      >
        <PromoCarousel />

        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeaderSimple}>
            <Text style={styles.sectionTitle}>What's on your mind?</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
            {CATEGORIES.map((item) => (
              <CategoryItem
                key={item.label}
                item={item}
                isActive={activeCategory === item.label}
                onPress={() => handleCategoryPress(item.label)}
              />
            ))}
          </ScrollView>
        </View>

        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading deliciousness...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && (
          <>
            <SectionHeader
              title={displayTitle}
              onSeeAll={activeCategory ? () => { setActiveCategory(null); setCategoryResults(null); } : undefined}
            />
            {displayList.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={{fontSize: 40}}>🍽️</Text>
                <Text style={styles.emptyText}>
                  {activeCategory ? `No ${activeCategory} restaurants nearby` : 'No restaurants found'}
                </Text>
              </View>
            ) : (
              displayList.map((item) => (
                <RestaurantCardLarge key={item.id} item={item} onPress={() => goToRestaurant(item.id)} />
              ))
            )}
            
            {popular.length > 0 && !activeCategory && (
              <>
                <SectionHeader title="Popular Around You" />
                {popular.map((item) => (
                   <RestaurantCardLarge key={'pop-'+item.id} item={item} onPress={() => goToRestaurant(item.id)} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    paddingTop: space.md,
  },
  headerContainer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  greetingText: {
    ...type.h2,
    color: colors.ink,
    marginBottom: 4,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    ...type.bodyMedium,
    color: colors.muted,
    maxWidth: '80%',
  },
  chevron: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  actionIcon: {
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    ...cardShadow,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.surface,
    ...cardShadow,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    height: 54,
    borderRadius: radius.xl,
    ...cardShadow,
  },
  searchText: {
    ...type.body,
    color: colors.muted,
  },
  promoContainer: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  promoCard: {
    width: width - space.lg * 2,
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: space.lg,
  },
  promoTextContainer: {
    zIndex: 2,
  },
  promoBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  promoTitle: {
    ...type.display,
    color: '#FFF',
    lineHeight: 34,
  },
  promoSubtitle: {
    ...type.bodyMedium,
    color: '#FFF',
    opacity: 0.9,
  },
  categoriesSection: {
    marginTop: space.sm,
  },
  sectionHeaderSimple: {
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  categoriesRow: {
    paddingHorizontal: space.lg,
    gap: space.lg,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  categoryImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...cardShadow,
    marginBottom: space.sm,
  },
  categoryImageActive: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryActiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  categoryName: {
    ...type.caption,
    color: colors.ink,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  sectionTitle: {
    ...type.h2,
    color: colors.ink,
  },
  seeAll: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  largeCardContainer: {
    marginHorizontal: space.lg,
    marginBottom: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...cardShadow,
  },
  largeCardCoverContainer: {
    height: 200,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  largeCardCover: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: space.md,
  },
  glassBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  glassBadgeText: {
    fontSize: 12,
    fontFamily: type.h3.fontFamily,
    color: colors.ink,
  },
  bottomBadgesRow: {
    position: 'absolute',
    bottom: space.md,
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  offerBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  offerBadgeText: {
    fontSize: 13,
    fontFamily: type.h1.fontFamily,
    color: colors.surface,
  },
  timeBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    ...cardShadow,
  },
  timeBadgeText: {
    fontSize: 12,
    fontFamily: type.h3.fontFamily,
    color: colors.ink,
  },
  largeCardDetails: {
    padding: space.md,
  },
  logoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantLogo: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.borderSubtle,
    marginRight: space.md,
  },
  titleColumn: {
    flex: 1,
  },
  largeCardTitle: {
    ...type.h2,
    color: colors.ink,
    marginBottom: 2,
  },
  largeCardCuisine: {
    ...type.body,
    color: colors.muted,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginLeft: space.sm,
  },
  ratingStar: {
    color: '#FFF',
    fontSize: 12,
    marginRight: 4,
  },
  ratingScore: {
    color: '#FFF',
    fontFamily: type.h3.fontFamily,
    fontSize: 13,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  loadingText: {
    ...type.bodyMedium,
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
  emptySection: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
  },
  emptyText: {
    ...type.h3,
    color: colors.muted,
    textAlign: 'center',
    marginTop: space.md,
  },
});
