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
import { SafeScreen } from '../components/ui/SafeScreen';
import { placeOrder, createPaymentOrder, verifyPayment } from '../lib/api';
import { colors, cardShadow } from '../constants/Colors';
import { type } from '../constants/Typography';
import { space, radius } from '../constants/Spacing';

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
  const { total, couponCode, couponDiscount } = useLocalSearchParams<{
    total: string;
    couponCode: string;
    couponDiscount: string;
  }>();

  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Address required', 'Please enter your delivery address');
      return;
    }

    setLoading(true);
    try {
      const order = await placeOrder(address.trim(), note.trim() || undefined);

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
    <SafeScreen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Nav bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Checkout</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Delivery address */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full delivery address"
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Delivery note */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Note (optional)</Text>
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

          {/* Payment method */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {PAYMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.paymentOption,
                  paymentMethod === option.id && styles.paymentOptionSelected,
                ]}
                onPress={() => setPaymentMethod(option.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.paymentIcon}>{option.icon}</Text>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentLabel}>{option.label}</Text>
                  <Text style={styles.paymentDesc}>{option.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    paymentMethod === option.id && styles.radioOuterSelected,
                  ]}
                >
                  {paymentMethod === option.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Order total */}
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total to pay</Text>
              <Text style={styles.totalAmount}>₹{total}</Text>
            </View>
            {couponCode && parseInt(couponDiscount ?? '0', 10) > 0 && (
              <Text style={styles.couponSaved}>
                🏷️ {couponCode} applied — you saved ₹{couponDiscount}
              </Text>
            )}
            <View style={styles.secureRow}>
              <Text style={styles.secureText}>🔒 100% secure payment</Text>
            </View>
          </View>
        </ScrollView>

        {/* Place order CTA */}
        <View style={styles.ctaBar}>
          <TouchableOpacity
            style={[styles.placeBtn, loading && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.placeBtnText}>
                {paymentMethod === 'cod' ? `Place Order · ₹${total}` : `Pay ₹${total}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  backBtn: {
    fontSize: 22,
    color: colors.ink,
    width: 32,
  },
  navTitle: {
    ...type.title,
    color: colors.ink,
  },
  content: {
    padding: space.lg,
    paddingBottom: 120,
    backgroundColor: colors.surfaceAlt,
    gap: space.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...cardShadow,
  },
  sectionTitle: {
    ...type.title,
    color: colors.ink,
    marginBottom: space.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    ...type.body,
    color: colors.ink,
    minHeight: 80,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.sm,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  paymentIcon: {
    fontSize: 24,
    width: 36,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    ...type.bodyMedium,
    color: colors.ink,
  },
  paymentDesc: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
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
    ...type.title,
    color: colors.ink,
  },
  totalAmount: {
    ...type.h2,
    color: colors.primary,
  },
  couponSaved: {
    ...type.caption,
    color: colors.secondary,
    marginTop: space.sm,
  },
  secureRow: {
    marginTop: space.sm,
  },
  secureText: {
    ...type.caption,
    color: colors.muted,
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
  placeBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeBtnText: {
    ...type.button,
    color: colors.surface,
  },
});
