import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeScreen } from '../../components/ui/SafeScreen';
import type { Cart, CartItem } from '../../lib/api';
import { getCart, updateCartItem, clearCart } from '../../lib/api';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchCart = async () => {
    try {
      const data = await getCart();
      setCart(data);
    } catch {
      setCart({ items: [], total: 0, restaurantId: null });
    } finally {
      setLoading(false);
    }
  };

  // Refresh cart every time this tab is focused
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCart();
    }, []),
  );

  const handleUpdateQuantity = async (menuItemId: string, newQty: number) => {
    setUpdating(menuItemId);
    try {
      const updated = await updateCartItem(menuItemId, newQty);
      setCart(updated);
    } catch {
      Alert.alert('Error', 'Could not update item');
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearCart();
          setCart({ items: [], total: 0, restaurantId: null });
        },
      },
    ]);
  };

  const DELIVERY_FEE = 30;
  const TAXES = Math.round((cart?.total ?? 0) * 0.05);
  const grandTotal = (cart?.total ?? 0) + DELIVERY_FEE + TAXES;

  const renderItem = ({ item }: { item: CartItem }) => {
    const price = parseInt(item.menuItem.price, 10);
    const isUpdating = updating === item.menuItemId;

    return (
      <View style={styles.itemRow}>
        {/* Food image */}
        <View style={styles.itemImage}>
          {item.menuItem.imageUrl ? (
            <Image source={{ uri: item.menuItem.imageUrl }} style={styles.itemImageInner} />
          ) : (
            <Text style={{ fontSize: 22 }}>🍽️</Text>
          )}
        </View>

        {/* Name + price */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.menuItem.name}
          </Text>
          <Text style={styles.itemPrice}>₹{price}</Text>
        </View>

        {/* Quantity stepper */}
        <View style={styles.stepper}>
          {isUpdating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleUpdateQuantity(item.menuItemId, item.quantity - 1)}
              >
                <Text style={styles.stepperGlyph}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleUpdateQuantity(item.menuItemId, item.quantity + 1)}
              >
                <Text style={styles.stepperGlyph}>+</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  if (isEmpty) {
    return (
      <SafeScreen>
        <View style={styles.navBar}>
          <Text style={styles.navTitle}>Cart</Text>
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items from a restaurant to get started</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/')}>
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Cart</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          <View>
            {/* Bill breakdown */}
            <View style={styles.billCard}>
              <Text style={styles.billTitle}>Bill Details</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Subtotal</Text>
                <Text style={styles.billValue}>₹{cart.total}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={styles.billValue}>₹{DELIVERY_FEE}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Taxes & Charges</Text>
                <Text style={styles.billValue}>₹{TAXES}</Text>
              </View>

              <View style={styles.billDivider} />

              <View style={styles.billRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{grandTotal}</Text>
              </View>
            </View>
          </View>
        }
      />

      {/* Checkout CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() =>
            router.push({
              pathname: '/checkout',
              params: { total: grandTotal },
            })
          }
          activeOpacity={0.9}
        >
          <Text style={styles.checkoutBtnText}>Checkout · ₹{grandTotal}</Text>
        </TouchableOpacity>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  navTitle: {
    ...type.title,
    color: colors.ink,
  },
  clearText: {
    ...type.body,
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: 120,
    backgroundColor: colors.surfaceAlt,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...cardShadow,
  },
  separator: {
    height: space.md,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImageInner: {
    width: 56,
    height: 56,
  },
  itemInfo: {
    flex: 1,
    marginHorizontal: space.md,
  },
  itemName: {
    ...type.bodyMedium,
    color: colors.ink,
  },
  itemPrice: {
    ...type.price,
    color: colors.primary,
    marginTop: space.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.xs,
    height: 36,
    minWidth: 90,
    justifyContent: 'space-between',
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperGlyph: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  stepperValue: {
    ...type.bodyMedium,
    color: colors.ink,
    minWidth: 20,
    textAlign: 'center',
  },
  billCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.md,
    ...cardShadow,
  },
  billTitle: {
    ...type.h3,
    color: colors.ink,
    marginBottom: space.md,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  billLabel: {
    ...type.body,
    color: colors.muted,
  },
  billValue: {
    ...type.body,
    color: colors.ink,
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: space.sm,
  },
  totalLabel: {
    ...type.title,
    color: colors.ink,
  },
  totalValue: {
    ...type.title,
    color: colors.ink,
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    paddingBottom: space.xl,
    borderTopWidth: 1,
    borderColor: colors.borderSubtle,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    ...type.button,
    color: colors.surface,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  emptyTitle: {
    ...type.h2,
    color: colors.ink,
    marginBottom: space.sm,
  },
  emptySubtitle: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: space.xl,
  },
  browseBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.xxl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseBtnText: {
    ...type.button,
    color: colors.surface,
  },
});
