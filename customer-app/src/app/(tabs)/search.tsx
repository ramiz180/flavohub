import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { searchRestaurants, type NearbyRestaurant, type FoodSearchResult } from '../../lib/api';
import { useLocationStore } from '../../lib/store/location.store';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultSection =
  | { title: string; type: 'restaurant'; data: NearbyRestaurant[] }
  | { title: string; type: 'food'; data: FoodSearchResult[] };

// ─── Popular Search Terms ─────────────────────────────────────────────────────

const QUICK_SEARCHES = ['Biryani', 'Pizza', 'Burger', 'Chinese', 'Dessert', 'Rolls', 'South Indian'];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { lat, lng } = useLocationStore();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<ResultSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const handleSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true);
    setSearched(true);
    try {
      const result = await searchRestaurants(q, lat ?? undefined, lng ?? undefined, 50);
      const newSections: ResultSection[] = [];

      if (result.restaurants.length > 0) {
        newSections.push({ title: 'Restaurants', type: 'restaurant', data: result.restaurants });
      }
      if (result.foods.length > 0) {
        newSections.push({ title: 'Food Items', type: 'food', data: result.foods });
      }

      setSections(newSections);
      setTotalResults(result.restaurants.length + result.foods.length);
    } catch {
      setSections([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  const clearSearch = () => {
    setQuery('');
    setSections([]);
    setSearched(false);
    setTotalResults(0);
  };

  const renderRestaurantItem = ({ item }: { item: NearbyRestaurant }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.resultIconWrap}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.resultIcon} />
        ) : (
          <Text style={{ fontSize: 26 }}>🍽️</Text>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {item.cuisineType ?? 'Restaurant'} · {item.city}
        </Text>
        <View style={styles.resultBadgeRow}>
          <View style={[styles.openBadge, { backgroundColor: item.isOpen ? colors.secondary : '#9CA3AF' }]}>
            <Text style={styles.openBadgeText}>{item.isOpen ? 'Open' : 'Closed'}</Text>
          </View>
          {item.distance > 0 && (
            <Text style={styles.distText}>{item.distance.toFixed(1)} km</Text>
          )}
        </View>
      </View>
      <Text style={styles.resultChevron}>›</Text>
    </TouchableOpacity>
  );

  const renderFoodItem = ({ item }: { item: FoodSearchResult }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => router.push(`/restaurant/${item.restaurantId}`)}
      activeOpacity={0.8}
    >
      <View style={styles.resultIconWrap}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.resultIcon} />
        ) : (
          <Text style={{ fontSize: 26 }}>🍴</Text>
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {item.restaurantName} · {item.restaurantCity}
        </Text>
        <Text style={styles.priceText}>₹{parseInt(item.price, 10)}</Text>
      </View>
      <Text style={styles.resultChevron}>›</Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: ResultSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {section.type === 'restaurant' ? '🏪 ' : '🍴 '}{section.title}
      </Text>
      <Text style={styles.sectionCount}>{section.data.length} results</Text>
    </View>
  );

  return (
    <SafeScreen>
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* ── Search Bar ──────────────────────────────────────────── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search food, restaurants, cuisines…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch(query)}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : !searched ? (
        // Quick search suggestions
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>Popular Searches</Text>
          <View style={styles.suggestionsRow}>
            {QUICK_SEARCHES.map((term) => (
              <TouchableOpacity
                key={term}
                style={styles.suggestionChip}
                onPress={() => handleSearch(term)}
                activeOpacity={0.75}
              >
                <Text style={styles.suggestionText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.emptyHero}>
            <Text style={{ fontSize: 56 }}>🍽️</Text>
            <Text style={styles.hintText}>Search for your favourite food or restaurant</Text>
          </View>
        </View>
      ) : totalResults === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={styles.emptyText}>No results for "{query}"</Text>
          <Text style={styles.emptySubText}>Try a different keyword</Text>
        </View>
      ) : (
        <SectionList
          sections={sections as any}
          keyExtractor={(item: any) => item.id}
          renderSectionHeader={renderSectionHeader as any}
          renderItem={({ item, section }: any) =>
            (section as ResultSection).type === 'restaurant'
              ? renderRestaurantItem({ item: item as NearbyRestaurant })
              : renderFoodItem({ item: item as FoodSearchResult })
          }
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 32) + 16 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
              </Text>
            </View>
          }
          stickySectionHeadersEnabled
        />
      )}
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerTitle: { ...type.title, color: colors.ink, textAlign: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    height: 48,
    ...cardShadow,
  },
  searchIcon: { fontSize: 16, marginRight: space.sm },
  searchInput: { flex: 1, ...type.body, color: colors.ink },
  clearBtn: { fontSize: 16, color: colors.muted, padding: space.xs },
  // Suggestions
  suggestionsWrap: { paddingHorizontal: space.lg },
  suggestionsLabel: { ...type.bodyMedium, color: colors.ink, marginBottom: space.sm },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  suggestionChip: {
    backgroundColor: colors.primaryTint,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  suggestionText: { ...type.caption, color: colors.primary, fontWeight: '600' as const },
  emptyHero: { alignItems: 'center', paddingTop: space.xxl },
  // Results
  resultsHeader: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  resultsCount: { ...type.caption, color: colors.muted },
  list: { paddingBottom: 32 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionTitle: { ...type.bodyMedium, color: colors.ink },
  sectionCount: { ...type.caption, color: colors.muted },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  resultIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resultIcon: { width: 52, height: 52 },
  resultInfo: { flex: 1, marginLeft: space.md },
  resultName: { ...type.title, color: colors.ink },
  resultMeta: { ...type.caption, color: colors.muted, marginTop: 2 },
  resultBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: space.sm },
  openBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  openBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' as const },
  distText: { ...type.caption, color: colors.muted },
  priceText: { ...type.caption, color: colors.primary, fontWeight: '700' as const, marginTop: 4 },
  resultChevron: { fontSize: 20, color: colors.muted, marginLeft: space.sm },
  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  loadingText: { ...type.caption, color: colors.muted, marginTop: space.sm },
  emptyText: { ...type.body, color: colors.muted, marginTop: space.md, textAlign: 'center' },
  emptySubText: { ...type.caption, color: colors.muted, marginTop: space.xs, textAlign: 'center' },
  hintText: { ...type.body, color: colors.muted, marginTop: space.md, textAlign: 'center' },
});
