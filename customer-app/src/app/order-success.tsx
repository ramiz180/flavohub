import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeScreen } from '../components/ui/SafeScreen';
import { colors, cardShadow } from '../constants/Colors';
import { type } from '../constants/Typography';
import { space, radius } from '../constants/Spacing';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { orderId, total } = useLocalSearchParams<{
    orderId: string;
    total: string;
  }>();

  // Shorten order ID for display
  const shortId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : '#—';

  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* Success circle */}
        <View style={styles.successCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>Yay! Your order has been placed successfully.</Text>

        {/* Order info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>{shortId}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Paid</Text>
            <Text style={styles.infoValue}>₹{total}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimated Delivery</Text>
            <Text style={styles.infoValue}>30–40 min</Text>
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(tabs)/orders')}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>Track Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Rider illustration placeholder */}
        <Text style={styles.riderEmoji}>🛵</Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xxl,
    shadowColor: colors.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  checkmark: {
    fontSize: 40,
    color: colors.surface,
    fontWeight: '700',
  },
  title: {
    ...type.h1,
    color: colors.ink,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: space.xxl,
  },
  infoCard: {
    width: '100%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.xxl,
    ...cardShadow,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  infoLabel: {
    ...type.caption,
    color: colors.muted,
  },
  infoValue: {
    ...type.bodyMedium,
    color: colors.ink,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  ctas: {
    width: '100%',
    gap: space.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...type.button,
    color: colors.surface,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...type.button,
    color: colors.primary,
  },
  riderEmoji: {
    fontSize: 64,
    marginTop: space.xxl,
  },
});
