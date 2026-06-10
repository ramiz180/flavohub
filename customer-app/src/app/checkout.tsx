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
import { placeOrder } from '../lib/api';
import { colors, cardShadow } from '../constants/Colors';
import { type } from '../constants/Typography';
import { space, radius } from '../constants/Spacing';

export default function CheckoutScreen() {
  const router = useRouter();
  const { total } = useLocalSearchParams<{ total: string }>();
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      Alert.alert('Address required', 'Please enter your delivery address');
      return;
    }
    setLoading(true);
    try {
      const order = await placeOrder(address.trim(), note.trim() || undefined);
      router.replace({
        pathname: '/order-success',
        params: { orderId: order.id, total: order.totalAmount },
      });
    } catch {
      Alert.alert('Error', 'Could not place order. Please try again.');
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

          {/* Order total */}
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total to pay</Text>
              <Text style={styles.totalAmount}>₹{total}</Text>
            </View>
            <Text style={styles.paymentNote}>
              💵 Cash on Delivery — pay when your order arrives
            </Text>
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
              <Text style={styles.placeBtnText}>Place Order · ₹{total}</Text>
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
  paymentNote: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.sm,
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
