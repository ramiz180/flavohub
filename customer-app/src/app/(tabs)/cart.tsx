import React, { useState, useCallback, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { StickyActionBar, ActionButton } from '../../components/ui/StickyActionBar';
import { LinearGradient } from 'expo-linear-gradient';
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
  const insets = useSafeAreaInsets();
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
  const PLATFORM_FEE = 5;
  const RAIN_SURGE = 15; // Dynamic fee
  const TAXES = Math.round((cart?.total ?? 0) * 0.05);
  const couponDiscount = couponResult?.valid ? (couponResult.discount ?? 0) : 0;
  const grandTotal = (cart?.total ?? 0) + DELIVERY_FEE + PLATFORM_FEE + RAIN_SURGE + TAXES - couponDiscount;

  const renderItem = ({ item }: { item: CartItem }) => {
    const price = parseInt(item.menuItem.price, 10);
    const isUpdating = updating === item.menuItemId;
    const itemTotal = price * item.quantity;
    const imageUrl = item.menuItem.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop';

    return (
      <View style={styles.itemRow}>
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{item.menuItem.name}</Text>
          <Text style={styles.itemPrice}>₹{itemTotal}</Text>
        </View>

        <View style={styles.stepperContainer}>
          {isUpdating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={styles.stepper}>
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
            </View>
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
          <Text style={styles.navTitle}>Your Cart</Text>
        </View>
        <View style={styles.centered}>
          <Image source={{ uri: 'https://cdn3d.iconscout.com/3d/premium/thumb/empty-cart-4861214-4045952.png' }} style={styles.emptyImage} />
          <Text style={styles.emptyTitle}>Good food is always cooking</Text>
          <Text style={styles.emptySubtitle}>Your cart is empty. Add something from the menu.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']}>
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
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View>
            <View style={styles.couponSection}>
              {!showCouponInput && !couponResult?.valid ? (
                <TouchableOpacity style={styles.couponRow} onPress={() => setShowCouponInput(true)} activeOpacity={0.7}>
                  <View style={styles.couponRowLeft}>
                    <Text style={styles.couponIcon}>🏷️</Text>
                    <Text style={styles.couponRowLabel}>View Offers & Promos</Text>
                  </View>
                  <Text style={styles.couponChevron}>›</Text>
                </TouchableOpacity>
              ) : couponResult?.valid ? (
                <View style={styles.couponApplied}>
                  <View style={styles.couponAppliedLeft}>
                    <Text style={styles.couponAppliedIcon}>✨</Text>
                    <View>
                      <Text style={styles.couponAppliedCode}>'{couponResult.coupon?.code}' applied</Text>
                      <Text style={styles.couponAppliedSaving}>You save ₹{couponResult.discount}</Text>
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
                    placeholder="Enter promo code"
                    placeholderTextColor={colors.muted}
                    value={couponCode}
                    onChangeText={setCouponCode}
                    autoCapitalize="characters"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.couponApplyBtn, (!couponCode.trim() || couponLoading) && { opacity: 0.5 }]}
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

            <View style={styles.billCard}>
              <Text style={styles.billTitle}>Bill Summary</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹{cart.total}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Partner Fee</Text>
                <Text style={styles.billValue}>₹{DELIVERY_FEE}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Platform Fee</Text>
                <Text style={styles.billValue}>₹{PLATFORM_FEE}</Text>
              </View>
              <View style={styles.billRow}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <Text style={styles.billLabel}>Rain Surge </Text>
                   <Text style={{fontSize: 12}}>☔</Text>
                </View>
                <Text style={styles.billValue}>₹{RAIN_SURGE}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Taxes</Text>
                <Text style={styles.billValue}>₹{TAXES}</Text>
              </View>

              {couponDiscount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: colors.accent }]}>Coupon Discount</Text>
                  <Text style={[styles.billValue, { color: colors.accent }]}>−₹{couponDiscount}</Text>
                </View>
              )}

              <View style={styles.billDivider} />

              <View style={styles.billRow}>
                <Text style={styles.totalLabel}>To Pay</Text>
                <Text style={styles.totalValue}>₹{grandTotal}</Text>
              </View>
            </View>
            
            <View style={styles.cancellationPolicy}>
               <Text style={styles.policyTitle}>Review your order and address details to avoid cancellations.</Text>
               <Text style={styles.policyBody}>If you choose to cancel, you can do it within 60 seconds after placing order. Post which you will be charged a 100% cancellation fee.</Text>
            </View>
          </View>
        }
      />

      <StickyActionBar>
         <View style={styles.payInfo}>
            <Text style={styles.payInfoTotal}>₹{grandTotal}</Text>
            <Text style={styles.payInfoLabel}>TOTAL</Text>
         </View>
         <ActionButton
           label="Place Order ➔"
           onPress={() => router.push({ pathname: '/checkout', params: { total: grandTotal, couponCode: couponResult?.valid ? (couponResult.coupon?.code ?? '') : '', couponDiscount: couponDiscount } })}
         />
      </StickyActionBar>
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
    backgroundColor: colors.surfaceAlt,
  },
  navTitle: {
    ...type.h2,
    color: colors.ink,
  },
  clearText: {
    ...type.bodyMedium,
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 140,
    backgroundColor: colors.surfaceAlt,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.md,
    marginBottom: space.md,
    ...cardShadow,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.borderSubtle,
  },
  itemInfo: {
    flex: 1,
    marginHorizontal: space.md,
  },
  itemName: {
    ...type.h3,
    fontSize: 16,
    color: colors.ink,
  },
  itemPrice: {
    ...type.price,
    color: colors.ink,
    marginTop: space.xs,
  },
  stepperContainer: {
    alignItems: 'flex-end',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: radius.lg,
    paddingHorizontal: 4,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.1)',
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
    fontWeight: '700',
  },
  stepperValue: {
    ...type.h3,
    color: colors.primary,
    minWidth: 24,
    textAlign: 'center',
  },
  billCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
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
    ...type.bodyMedium,
    color: colors.ink,
  },
  billDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: space.md,
    borderStyle: 'dashed',
  },
  totalLabel: {
    ...type.h3,
    color: colors.ink,
  },
  totalValue: {
    ...type.h2,
    color: colors.ink,
  },
  cancellationPolicy: {
    marginTop: space.lg,
    padding: space.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: radius.lg,
  },
  policyTitle: {
    ...type.bodyMedium,
    color: colors.ink,
    marginBottom: 4,
  },
  policyBody: {
    ...type.caption,
    color: colors.muted,
    lineHeight: 18,
  },
  payInfo: {
    flex: 1,
  },
  payInfoTotal: {
    ...type.h2,
    color: colors.ink,
  },
  payInfoLabel: {
    ...type.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: space.lg,
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
    borderRadius: radius.lg,
    paddingHorizontal: space.xxl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  browseBtnText: {
    ...type.button,
    color: colors.surface,
  },
  couponSection: {
    marginTop: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
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
    fontSize: 20,
    marginRight: space.md,
  },
  couponRowLabel: {
    ...type.h3,
    fontSize: 16,
    color: colors.ink,
  },
  couponChevron: {
    fontSize: 24,
    color: colors.muted,
    marginTop: -2,
  },
  couponApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    backgroundColor: colors.accentTint,
  },
  couponAppliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  couponAppliedIcon: {
    fontSize: 20,
    marginRight: space.md,
  },
  couponAppliedCode: {
    ...type.bodyMedium,
    color: colors.accent,
  },
  couponAppliedSaving: {
    ...type.caption,
    color: colors.accent,
    marginTop: 2,
  },
  couponRemove: {
    ...type.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    gap: space.sm,
  },
  couponInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    ...type.body,
    color: colors.ink,
  },
  couponApplyBtn: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    height: 48,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyBtnText: {
    ...type.button,
    color: colors.surface,
  },
});
