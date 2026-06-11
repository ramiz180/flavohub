import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SectionList,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '../../components/ui/SafeScreen';
import type { Restaurant, MenuCategory, MenuItem } from '../../lib/api';
import { getRestaurantById, getRestaurantMenu, addToCart } from '../../lib/api';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

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

  const handleAddToCart = async (item: MenuItem) => {
    setAddingItem(item.id);
    try {
      const updatedCart = await addToCart(item.id, 1);
      setCartCount(updatedCart.items.reduce((s, i) => s + i.quantity, 0));
      Alert.alert('✓ Added to cart', `${item.name} added successfully`, [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'View Cart',
          onPress: () => router.push('/(tabs)/cart'),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add item to cart';
      if (msg.includes('one restaurant')) {
        Alert.alert(
          'Different restaurant',
          'Your cart has items from another restaurant. Clear your cart first?',
          [
            { text: 'Keep', style: 'cancel' },
            {
              text: 'Clear & Add',
              style: 'destructive',
              onPress: async () => {
                const { clearCart } = await import('../../lib/api');
                await clearCart();
                await addToCart(item.id, 1);
                setCartCount(1);
                Alert.alert('✓ Added', `${item.name} added to cart`);
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', 'Could not add item. Please try again.');
      }
    } finally {
      setAddingItem(null);
    }
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const price = parseInt(item.price, 10);
    const isAdding = addingItem === item.id;

    return (
      <View style={styles.menuItem}>
        {/* Left: info */}
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.menuItemDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.menuItemPrice}>₹{price}</Text>
        </View>

        {/* Right: image + Add button */}
        <View style={styles.menuItemRight}>
          <View style={styles.menuItemImage}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.menuItemImageInner} />
            ) : (
              <Text style={{ fontSize: 28 }}>🍽️</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.addBtn, isAdding && { opacity: 0.7 }]}
            onPress={() => handleAddToCart(item)}
            disabled={isAdding || !item.isAvailable}
            activeOpacity={0.8}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={styles.addBtnText}>{item.isAvailable ? 'Add +' : 'N/A'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
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

  const todayHours = restaurant.hours?.find((h) => h.dayOfWeek === new Date().getDay());

  const isOpenNow = todayHours && !todayHours.isClosed;

  return (
    <SafeScreen>
      {/* Back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        {/* Cart indicator */}
        {cartCount > 0 && (
          <TouchableOpacity
            style={styles.cartIndicator}
            onPress={() => router.push('/(tabs)/cart')}
          >
            <Text style={styles.cartIndicatorText}>
              🛒 {cartCount} item{cartCount !== 1 ? 's' : ''} in cart
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cover */}
      <View style={styles.cover}>
        <Text style={styles.coverEmoji}>🍽️</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderMenuItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <View style={styles.infoSheet}>
            {/* Restaurant name */}
            <Text style={styles.restaurantName}>{restaurant.name}</Text>

            {/* Cuisine */}
            <Text style={styles.restaurantCuisine}>{restaurant.cuisineType}</Text>

            {/* Description */}
            {restaurant.description ? (
              <Text style={styles.restaurantDesc}>{restaurant.description}</Text>
            ) : null}

            {/* Meta row */}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                📍 {restaurant.addressLine}, {restaurant.city}
              </Text>
            </View>

            {/* Hours */}
            {todayHours && (
              <View style={styles.hoursRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: isOpenNow ? colors.secondary : colors.danger,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.hoursText,
                    {
                      color: isOpenNow ? colors.secondary : colors.danger,
                    },
                  ]}
                >
                  {isOpenNow ? 'Open' : 'Closed'}
                </Text>
                {isOpenNow && (
                  <Text style={styles.hoursDetail}> · Closes {todayHours.closeTime}</Text>
                )}
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  backBtnText: {
    fontSize: 18,
    color: colors.ink,
  },
  cartIndicator: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  cartIndicatorText: {
    ...type.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  cover: {
    height: 180,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 72,
  },
  infoSheet: {
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  restaurantName: {
    ...type.h2,
    color: colors.ink,
  },
  restaurantCuisine: {
    ...type.bodyMedium,
    color: colors.primary,
    marginTop: space.xs,
  },
  restaurantDesc: {
    ...type.body,
    color: colors.muted,
    marginTop: space.sm,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: space.sm,
  },
  metaText: {
    ...type.caption,
    color: colors.muted,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: space.xs,
  },
  hoursText: {
    ...type.caption,
    fontWeight: '600',
  },
  hoursDetail: {
    ...type.caption,
    color: colors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: space.lg,
  },
  menuHeading: {
    ...type.h3,
    color: colors.ink,
  },
  sectionHeader: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionTitle: {
    ...type.title,
    color: colors.ink,
  },
  menuItem: {
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: space.md,
  },
  menuItemName: {
    ...type.title,
    color: colors.ink,
  },
  menuItemDesc: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.xs,
    lineHeight: 18,
  },
  menuItemPrice: {
    ...type.price,
    color: colors.ink,
    marginTop: space.sm,
  },
  menuItemRight: {
    alignItems: 'center',
    width: 80,
  },
  menuItemImage: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  menuItemImageInner: {
    width: 72,
    height: 72,
  },
  addBtn: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
    width: 72,
  },
  addBtnText: {
    ...type.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 32,
    backgroundColor: colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  errorText: {
    ...type.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: space.md,
  },
  backLink: {
    ...type.body,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyMenu: {
    padding: space.xxl,
    alignItems: 'center',
  },
  emptyMenuText: {
    ...type.body,
    color: colors.muted,
  },
});
