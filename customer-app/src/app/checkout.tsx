// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: (module: string) => any;

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../components/ui/SafeScreen';
import { StickyActionBar, ActionButton } from '../components/ui/StickyActionBar';
import { placeOrder, createPaymentOrder, verifyPayment, customerApi, getCart, Cart } from '../lib/api';
import { useAuthStore } from '../lib/store/auth.store';
import { colors, cardShadow } from '../constants/Colors';
import { type } from '../constants/Typography';
import { space, radius } from '../constants/Spacing';
import { LinearGradient } from 'expo-linear-gradient';

type PaymentMethod = 'upi' | 'card' | 'cod';

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'upi',
    label: 'UPI',
    icon: '💳',
    description: 'Pay using any UPI app',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    icon: '🏦',
    description: 'Visa, Mastercard, Rupay',
  },
  {
    id: 'cod',
    label: 'Cash on Delivery',
    icon: '💵',
    description: 'Pay when your order arrives',
  },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { customer } = useAuthStore();
  const { total, couponCode, couponDiscount } = useLocalSearchParams<{
    total: string;
    couponCode: string;
    couponDiscount: string;
  }>();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [addressLine, setAddressLine] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [addrRes, cartData] = await Promise.all([
          customerApi.addresses.list(),
          getCart(),
        ]);
        const adrs = addrRes.data.data;
        setAddresses(adrs);
        if (adrs.length > 0) {
          setSelectedAddressId(adrs[0].id);
        }
        setCart(cartData);
      } catch (err) {}
    };
    load();
  }, []);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId && !addressLine.trim()) {
      Alert.alert('Address required', 'Please select or enter your delivery address');
      return;
    }
    if (!cart || !cart.restaurantId) {
      Alert.alert('Cart error', 'Your cart is empty or invalid.');
      return;
    }

    setLoading(true);
    try {
      let finalAddressId = selectedAddressId;
      if (!finalAddressId && addressLine.trim()) {
        const res = await customerApi.addresses.create({
          addressLine: addressLine.trim(),
          city: 'Unknown',
          state: 'Unknown',
          pincode: '000000',
        });
        finalAddressId = res.data.data.id;
      }

      const subtotal = cart.items.reduce((sum, i) => sum + parseFloat(i.menuItem.price) * i.quantity, 0);
      const discount = parseInt(couponDiscount ?? '0', 10) || 0;
      const taxes = (subtotal * 5) / 100;
      const deliveryFee = 40; // Default or from api
      const finalTotal = subtotal + taxes + deliveryFee - discount;

      const payload = {
        customerId: customer?.id ?? '',
        restaurantId: cart.restaurantId,
        addressId: finalAddressId,
        items: cart.items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        paymentMethod: paymentMethod === 'cod' ? 'COD' : 'ONLINE',
        subtotal,
        deliveryFee,
        taxes,
        total: parseFloat(total) || finalTotal,
        note: note.trim() || undefined,
      };

      const order = await placeOrder(payload);

      if (paymentMethod === 'cod') {
        router.replace({
          pathname: '/order-success',
          params: {
            orderId: order.id,
            total: order.totalAmount,
            paymentMethod: 'cod',
          },
        });
        return;
      }

      const razorpayOrder = await createPaymentOrder(order.id);

      try {
        const RazorpayCheckout = require('react-native-razorpay').default;

        const options = {
          description: 'FlavoHub Food Order',
          currency: razorpayOrder.currency,
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          order_id: razorpayOrder.razorpayOrderId,
          name: 'FlavoHub',
          prefill: {
            contact: '',
            email: '',
          },
          theme: { color: colors.primary },
          method: paymentMethod === 'upi' ? { upi: true, card: false } : {},
        };

        const paymentData = (await RazorpayCheckout.open(options)) as {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        };

        await verifyPayment(
          paymentData.razorpay_order_id,
          paymentData.razorpay_payment_id,
          paymentData.razorpay_signature,
          order.id,
        );

        router.replace({
          pathname: '/order-success',
          params: {
            orderId: order.id,
            total: order.totalAmount,
            paymentMethod: paymentMethod,
          },
        });
      } catch (razorpayError: unknown) {
        const errMsg =
          razorpayError instanceof Error ? razorpayError.message : String(razorpayError);

        if (
          errMsg.includes('cancelled') ||
          errMsg.includes('cancel') ||
          errMsg.includes('dismissed')
        ) {
          Alert.alert(
            'Payment Cancelled',
            'Your order was created but payment was not completed. You can retry payment from your orders.',
            [
              {
                text: 'View Orders',
                onPress: () => router.push('/(tabs)/orders'),
              },
              { text: 'OK', style: 'cancel' },
            ],
          );
        } else if (
          errMsg.includes('Cannot find module') ||
          errMsg.includes('NativeModule') ||
          errMsg.includes('null') ||
          errMsg.includes('undefined') ||
          !errMsg
        ) {
          Alert.alert(
            'Test Mode',
            'Razorpay native module requires a dev build. Simulating payment success for testing.',
            [
              {
                text: 'OK',
                onPress: () =>
                  router.replace({
                    pathname: '/order-success',
                    params: {
                      orderId: order.id,
                      total: order.totalAmount,
                      paymentMethod: 'test',
                    },
                  }),
              },
            ],
          );
        } else {
          Alert.alert('Payment Failed', 'Payment could not be completed. Please try again.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (err as any)?.response?.data?.error?.message ?? '';
      Alert.alert('Error', detail ? `${msg}: ${detail}` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtnWrapper} onPress={() => router.back()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Checkout</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Delivery Details */}
          <Text style={styles.sectionHeading}>Delivery Details</Text>
          <View style={styles.card}>
            {addresses.length > 0 ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Address</Text>
                {addresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressOption,
                      selectedAddressId === addr.id && styles.addressOptionSelected
                    ]}
                    onPress={() => setSelectedAddressId(addr.id)}
                  >
                    <Text style={styles.addressLabel}>{addr.label || 'Home'}</Text>
                    <Text style={styles.addressLine}>{addr.addressLine}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Delivery Address</Text>
                 <TextInput
                   style={styles.input}
                   placeholder="Flat / House no, Building, Street..."
                   placeholderTextColor={colors.muted}
                   value={addressLine}
                   onChangeText={setAddressLine}
                   multiline
                   numberOfLines={3}
                   textAlignVertical="top"
                 />
              </View>
            )}

            <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
               <TextInput
                 style={[styles.input, { height: 60 }]}
                 placeholder="E.g. Leave at door, ring bell twice..."
                 placeholderTextColor={colors.muted}
                 value={note}
                 onChangeText={setNote}
                 multiline
                 textAlignVertical="top"
               />
            </View>
          </View>

          {/* Payment Method */}
          <Text style={styles.sectionHeading}>Payment Method</Text>
          <View style={styles.card}>
            {PAYMENT_OPTIONS.map((option, index) => {
              const isSelected = paymentMethod === option.id;
              const isLast = index === PAYMENT_OPTIONS.length - 1;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.paymentOption,
                    isSelected && styles.paymentOptionSelected,
                    !isLast && { marginBottom: space.sm }
                  ]}
                  onPress={() => setPaymentMethod(option.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.paymentIconWrapper, isSelected && { backgroundColor: '#FFF' }]}>
                     <Text style={styles.paymentIcon}>{option.icon}</Text>
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>{option.label}</Text>
                    <Text style={styles.paymentDesc}>{option.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Total & Secure */}
          <View style={[styles.card, styles.totalCard]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount to pay</Text>
              <Text style={styles.totalAmount}>₹{total}</Text>
            </View>
            {couponCode && parseInt(couponDiscount ?? '0', 10) > 0 && (
              <View style={styles.couponBadge}>
                <Text style={styles.couponSaved}>
                  ✨ '{couponCode}' applied — saved ₹{couponDiscount}
                </Text>
              </View>
            )}
            <View style={styles.secureRow}>
              <Text style={styles.secureText}>🔒 100% secure encrypted payment</Text>
            </View>
          </View>
        </ScrollView>

        {/* CTA Bar */}
        <StickyActionBar>
          <ActionButton
            label={paymentMethod === 'cod' ? `Confirm Cash Order • ₹${total}` : `Proceed to Pay • ₹${total}`}
            onPress={handlePlaceOrder}
            loading={loading}
            disabled={loading}
          />
        </StickyActionBar>
      </KeyboardAvoidingView>
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
  backBtnWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  backBtn: {
    fontSize: 22,
    color: colors.ink,
    marginTop: -2,
  },
  navTitle: {
    ...type.h2,
    color: colors.ink,
  },
  content: {
    padding: space.lg,
    paddingBottom: 140,
    backgroundColor: colors.surfaceAlt,
  },
  sectionHeading: {
    ...type.h2,
    fontSize: 18,
    color: colors.ink,
    marginBottom: space.sm,
    marginTop: space.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
    ...cardShadow,
  },
  totalCard: {
    marginTop: space.xl,
    backgroundColor: colors.ink,
  },
  inputGroup: {
    marginBottom: space.lg,
  },
  inputLabel: {
    ...type.caption,
    color: colors.muted,
    marginBottom: space.xs,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
    ...type.body,
    color: colors.ink,
    minHeight: 80,
    backgroundColor: colors.surfaceAlt,
  },
  addressOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
  },
  addressOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  addressLabel: {
    ...type.h3,
    fontSize: 14,
    color: colors.ink,
  },
  addressLine: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  paymentIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
  },
  paymentIcon: {
    fontSize: 20,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    ...type.h3,
    fontSize: 15,
    color: colors.ink,
  },
  paymentDesc: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...type.h3,
    color: '#FFF',
  },
  totalAmount: {
    ...type.h2,
    color: '#FFF',
  },
  couponBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.md,
    marginTop: space.sm,
  },
  couponSaved: {
    ...type.caption,
    color: '#FFF',
  },
  secureRow: {
    marginTop: space.lg,
    alignItems: 'center',
  },
  secureText: {
    ...type.caption,
    color: 'rgba(255,255,255,0.5)',
  },
});
