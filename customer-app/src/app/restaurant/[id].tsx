import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '@/components/ui/SafeScreen';
import type { Restaurant, MenuCategory, MenuItem } from '@/lib/api';
import { getRestaurantById, getRestaurantMenu } from '@/lib/api';
import { Colors } from '@/constants/Colors';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [rest, menuData] = await Promise.all([getRestaurantById(id), getRestaurantMenu(id)]);
        setRestaurant(rest);
        setMenu(menuData);
      } catch {
        setError('Could not load restaurant. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => console.log('Add to cart:', item.id, item.name)}
    >
      <View style={styles.menuItem}>
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.menuItemDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.menuItemPrice}>₹{parseInt(item.price, 10)}</Text>
        </View>
        {/* Image placeholder — will add real image in later phase */}
        <View style={styles.menuItemImage}>
          <Text style={{ fontSize: 28 }}>🍴</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  if (error || !restaurant) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'Restaurant not found'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  const sections = menu.map((cat) => ({
    title: cat.name,
    data: cat.items,
  }));

  const todayHours = restaurant.hours.find((h) => h.dayOfWeek === new Date().getDay());

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Cover placeholder */}
      <View style={styles.cover}>
        <Text style={styles.coverEmoji}>🍔</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderMenuItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <View style={styles.info}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.restaurantCuisine}>{restaurant.cuisineType}</Text>
            {restaurant.description ? (
              <Text style={styles.restaurantDesc}>{restaurant.description}</Text>
            ) : null}
            <Text style={styles.restaurantCity}>
              📍 {restaurant.addressLine}, {restaurant.city}
            </Text>
            {todayHours && !todayHours.isClosed && (
              <Text style={styles.restaurantHours}>
                🕐 Today: {todayHours.openTime} – {todayHours.closeTime}
              </Text>
            )}
            <View style={styles.divider} />
            <Text style={styles.menuHeading}>Menu</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyMenu}>
            <Text style={styles.emptyMenuText}>No menu items available</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: '#1F2937',
  },
  cover: {
    height: 180,
    backgroundColor: '#FFF3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 64,
  },
  info: {
    padding: 16,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  restaurantCuisine: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  restaurantDesc: {
    fontSize: 14,
    color: '#687280',
    marginTop: 6,
    lineHeight: 20,
  },
  restaurantCity: {
    fontSize: 13,
    color: '#687280',
    marginTop: 8,
  },
  restaurantHours: {
    fontSize: 13,
    color: '#4CAF2A',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  menuHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuItemDesc: {
    fontSize: 13,
    color: '#687280',
    marginTop: 2,
    lineHeight: 18,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 6,
  },
  menuItemImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#FFF3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  backLink: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyMenu: {
    padding: 24,
    alignItems: 'center',
  },
  emptyMenuText: {
    fontSize: 14,
    color: '#687280',
  },
});
