import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { getNearbyRestaurants, type NearbyRestaurant } from '../../lib/api';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

const DEV_LAT = 12.9716;
const DEV_LNG = 77.5946;

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const all = await getNearbyRestaurants(DEV_LAT, DEV_LNG, 50);
      const filtered = all.filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.cuisineType.toLowerCase().includes(query.toLowerCase()),
      );
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants or cuisines..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setResults([]);
              setSearched(false);
            }}
          >
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={styles.emptyText}>No results for "{query}"</Text>
        </View>
      ) : !searched ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48 }}>🍽️</Text>
          <Text style={styles.hintText}>Search for your favourite food or restaurant</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={() => router.push(`/restaurant/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.resultIcon}>
                <Text style={{ fontSize: 28 }}>🍽️</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultMeta}>
                  {item.cuisineType} · {item.city}
                </Text>
              </View>
              <Text style={styles.resultChevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerTitle: {
    ...type.title,
    color: colors.ink,
    textAlign: 'center',
  },
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
  clearBtn: {
    fontSize: 16,
    color: colors.muted,
    padding: space.xs,
  },
  list: {
    padding: space.lg,
    gap: space.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...cardShadow,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: space.md,
  },
  resultName: {
    ...type.title,
    color: colors.ink,
  },
  resultMeta: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  resultChevron: {
    fontSize: 20,
    color: colors.muted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  emptyText: {
    ...type.body,
    color: colors.muted,
    marginTop: space.md,
    textAlign: 'center',
  },
  hintText: {
    ...type.body,
    color: colors.muted,
    marginTop: space.md,
    textAlign: 'center',
  },
});
