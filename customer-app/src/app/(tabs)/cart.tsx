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
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeScreen } from '../../components/ui/SafeScreen';
import type { Cart, CartItem } from '../../lib/api';
import {
  getCart,
  updateCartItem,
  clearCart,
  validateCoupon,
  type CouponResult,
} from '../../lib/api';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';

export default function CartScreen() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponCode, cart?.total ?? 0);
      setCouponResult(result);
      if (!result.valid) {
        Alert.alert('Invalid Coupon', result.reason ?? 'Coupon cannot be applied');
      }
    } catch {
      Alert.alert('Error', 'Could not validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponResult(null);
    setCouponCode('');
    setShowCouponInput(false);
  };

  const DELIVERY_FEE = 30;
  const TAXES = Math.round((cart?.total ?? 0) * 0.05);
  const couponDiscount = couponResult?.valid ? (couponResult.discount ?? 0) : 0;
  const grandTotal = (cart?.total ?? 0) + DELIVERY_FEE + TAXES - couponDiscount;

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
            {/* Apply Coupon */}
            <View style={styles.couponSection}>
              {!showCouponInput && !couponResult?.valid ? (
                <TouchableOpacity
                  style={styles.couponRow}
                  onPress={() => setShowCouponInput(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.couponRowLeft}>
                    <Text style={styles.couponIcon}>🏷️</Text>
                    <Text style={styles.couponRowLabel}>Apply Coupon</Text>
                  </View>
                  <Text style={styles.couponChevron}>›</Text>
                </TouchableOpacity>
              ) : couponResult?.valid ? (
                <View style={styles.couponApplied}>
                  <View style={styles.couponAppliedLeft}>
                    <Text style={styles.couponAppliedIcon}>✅</Text>
                    <View>
                      <Text style={styles.couponAppliedCode}>{couponResult.coupon?.code}</Text>
                      <Text style={styles.couponAppliedSaving}>
                        You save ₹{couponResult.discount}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleRemoveCoupon}>
                    <Text style={styles.couponRemove}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="Enter coupon code"
                    placeholderTextColor={colors.muted}
                    value={couponCode}
                    onChangeText={setCouponCode}
                    autoCapitalize="characters"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[
                      styles.couponApplyBtn,
                      (!couponCode.trim() || couponLoading) && { opacity: 0.5 },
                    ]}
                    onPress={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponLoading}
                    activeOpacity={0.8}
                  >
                    {couponLoading ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : (
                      <Text style={styles.couponApplyBtnText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

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

              {couponDiscount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.secondary }]}>
                    Coupon Discount
                  </Text>
                  <Text style={[styles.billValue, { color: colors.secondary }]}>
                    −₹{couponDiscount}
                  </Text>
                </View>
              )}

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
              params: {
                total: grandTotal,
                couponCode: couponResult?.valid ? (couponResult.coupon?.code ?? '') : '',
                couponDiscount: couponDiscount,
              },
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
  couponSection: {
    marginTop: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...cardShadow,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
  },
  couponRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponIcon: {
    fontSize: 18,
    marginRight: space.md,
  },
  couponRowLabel: {
    ...type.bodyMedium,
    color: colors.ink,
  },
  couponChevron: {
    fontSize: 20,
    color: colors.muted,
  },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    backgroundColor: colors.secondaryTint,
  },
  couponAppliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponAppliedIcon: {
    fontSize: 18,
    marginRight: space.md,
  },
  couponAppliedCode: {
    ...type.bodyMedium,
    color: colors.secondary,
  },
  couponAppliedSaving: {
    ...type.caption,
    color: colors.secondary,
    marginTop: 2,
  },
  couponRemove: {
    ...type.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    gap: space.sm,
  },
  couponInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    ...type.body,
    color: colors.ink,
  },
  couponApplyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 44,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyBtnText: {
    ...type.bodyMedium,
    color: colors.surface,
  },
});
