import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '../components/ui/SafeScreen';
import type { OrderStatusUpdate } from '../lib/socket';
import { subscribeToOrderUpdates } from '../lib/socket';
import { colors, cardShadow } from '../constants/Colors';
import { type } from '../constants/Typography';
import { space, radius } from '../constants/Spacing';

const STATUS_STEPS = [
  { key: 'PLACED', label: 'Order Placed', icon: '📋' },
  { key: 'ACCEPTED', label: 'Accepted', icon: '✅' },
  { key: 'PREPARING', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'READY', label: 'Ready', icon: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', icon: '🎉' },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { orderId, restaurantName, total } = useLocalSearchParams<{
    orderId: string;
    restaurantName: string;
    total: string;
  }>();

  const [currentStatus, setCurrentStatus] = useState('PLACED');
  const [updates, setUpdates] = useState<OrderStatusUpdate[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOrderUpdates((update) => {
      if (update.orderId === orderId) {
        setCurrentStatus(update.status);
        setUpdates((prev) => [update, ...prev]);
      }
    });

    const timer = setTimeout(() => setConnected(true), 1000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [orderId]);

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REJECTED';
  const isDelivered = currentStatus === 'DELIVERED';

  return (
    <SafeScreen>
      {/* Nav */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Track Order</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection indicator */}
        <View style={styles.connectionRow}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: connected ? colors.secondary : colors.muted },
            ]}
          />
          <Text style={styles.connectionText}>
            {connected ? 'Live tracking active' : 'Connecting...'}
          </Text>
          {!connected && (
            <ActivityIndicator size="small" color={colors.muted} style={{ marginLeft: space.xs }} />
          )}
        </View>

        {/* Order info */}
        <View style={styles.orderCard}>
          <Text style={styles.orderRestaurant}>{restaurantName ?? 'Your Order'}</Text>
          <Text style={styles.orderMeta}>Order #{orderId?.slice(-8).toUpperCase()}</Text>
          {total ? <Text style={styles.orderTotal}>₹{total}</Text> : null}
        </View>

        {/* Status timeline */}
        {isCancelled ? (
          <View style={styles.cancelledCard}>
            <Text style={styles.cancelledIcon}>❌</Text>
            <Text style={styles.cancelledTitle}>
              Order {currentStatus === 'REJECTED' ? 'Rejected' : 'Cancelled'}
            </Text>
            <Text style={styles.cancelledSub}>We're sorry for the inconvenience</Text>
          </View>
        ) : (
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>Order Status</Text>
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;
              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotActive,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      <Text style={styles.timelineDotIcon}>{isCompleted ? step.icon : '○'}</Text>
                    </View>
                    {index < STATUS_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          index < currentIndex && styles.timelineLineActive,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isCurrent && styles.timelineLabelActive,
                        isCompleted && !isCurrent && styles.timelineLabelDone,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isCurrent && <Text style={styles.timelineCurrent}>Current status</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Live updates log */}
        {updates.length > 0 && (
          <View style={styles.updatesCard}>
            <Text style={styles.updatesTitle}>Updates</Text>
            {updates.map((u, i) => (
              <View key={i} style={styles.updateRow}>
                <Text style={styles.updateStatus}>{u.status}</Text>
                <Text style={styles.updateTime}>
                  {new Date(u.updatedAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* CTA */}
        {isDelivered ? (
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/')}>
            <Text style={styles.doneBtnText}>Back to Home</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.ordersBtn} onPress={() => router.push('/(tabs)/orders')}>
            <Text style={styles.ordersBtnText}>View All Orders</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    paddingBottom: 40,
    backgroundColor: colors.surfaceAlt,
    gap: space.md,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    ...cardShadow,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: space.sm,
  },
  connectionText: {
    ...type.caption,
    color: colors.muted,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...cardShadow,
  },
  orderRestaurant: {
    ...type.h3,
    color: colors.ink,
  },
  orderMeta: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.xs,
  },
  orderTotal: {
    ...type.price,
    color: colors.primary,
    marginTop: space.sm,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...cardShadow,
  },
  timelineTitle: {
    ...type.title,
    color: colors.ink,
    marginBottom: space.md,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotActive: {
    backgroundColor: colors.secondaryTint,
  },
  timelineDotCurrent: {
    backgroundColor: colors.secondary,
  },
  timelineDotIcon: {
    fontSize: 16,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 2,
  },
  timelineLineActive: {
    backgroundColor: colors.secondary,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: space.md,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  timelineLabel: {
    ...type.body,
    color: colors.muted,
  },
  timelineLabelActive: {
    ...type.bodyMedium,
    color: colors.secondary,
  },
  timelineLabelDone: {
    color: colors.ink,
  },
  timelineCurrent: {
    ...type.caption,
    color: colors.secondary,
    marginTop: 2,
  },
  cancelledCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    alignItems: 'center',
    ...cardShadow,
  },
  cancelledIcon: {
    fontSize: 48,
    marginBottom: space.md,
  },
  cancelledTitle: {
    ...type.h3,
    color: colors.danger,
  },
  cancelledSub: {
    ...type.body,
    color: colors.muted,
    marginTop: space.sm,
  },
  updatesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    ...cardShadow,
  },
  updatesTitle: {
    ...type.title,
    color: colors.ink,
    marginBottom: space.md,
  },
  updateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  updateStatus: {
    ...type.bodyMedium,
    color: colors.ink,
  },
  updateTime: {
    ...type.caption,
    color: colors.muted,
  },
  doneBtn: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    ...type.button,
    color: colors.surface,
  },
  ordersBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersBtnText: {
    ...type.button,
    color: colors.primary,
  },
});
