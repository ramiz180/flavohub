import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeScreen } from '@/components/ui/SafeScreen';
import type { NearbyRestaurant } from '@/lib/api';
import { getNearbyRestaurants } from '@/lib/api';
import { Colors } from '@/constants/Colors';

// DEV: hardcoded Bangalore coords — Burger Barn is seeded here
const DEV_LAT = 12.9716;
const DEV_LNG = 77.5946;

export default function HomeScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = async () => {
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
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  const renderRestaurantCard = ({ item }: { item: NearbyRestaurant }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/restaurant/${item.id}`)}
      activeOpacity={0.8}
    >
      {/* Cover image or placeholder */}
      <View style={styles.cardImage}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.cardImageInner} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImageEmoji}>🍽️</Text>
          </View>
        )}
      </View>

      {/* Card content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardCuisine}>{item.cuisineType}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>📍 {item.city}</Text>
          <Text style={styles.cardDistance}>
            {item.distance === 0 ? 'Nearby' : `${item.distance.toFixed(1)} km`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding restaurants near you...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FlavoHub</Text>
        <Text style={styles.headerSubtitle}>What are you craving today?</Text>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRestaurants}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.id}
          renderItem={renderRestaurantCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No restaurants found nearby</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh or try again later</Text>
            </View>
          }
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#687280',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  cardImageInner: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E8',
  },
  cardImageEmoji: {
    fontSize: 48,
  },
  cardContent: {
    padding: 14,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardCuisine: {
    fontSize: 13,
    color: '#687280',
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#687280',
  },
  cardDistance: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#687280',
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#687280',
    textAlign: 'center',
  },
});
