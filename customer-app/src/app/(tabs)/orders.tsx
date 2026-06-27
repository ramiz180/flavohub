import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../../components/ui/SafeScreen';
import type { OrderSummary } from '../../lib/api';
import { getOrders } from '../../lib/api';
import { colors, cardShadow } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { space, radius } from '../../constants/Spacing';
import { useSocketStore } from '../../lib/store/socket.store';

const STATUS_COLORS: Record<string, string> = {
  PLACED: colors.primary,
  ACCEPTED: colors.primary,
  PREPARING: colors.primary,
  READY: colors.primary,
  OUT_FOR_DELIVERY: colors.primary,
  DELIVERED: colors.secondary,
  CANCELLED: colors.danger,
};

const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Ongoing' | 'Delivered' | 'Cancelled'>('All');
  const { connect, disconnect, socket } = useSocketStore();

  useFocusEffect(
    useCallback(() => {
      connect();
      return () => {
        // Disconnect can be handled globally, or left connected
      };
    }, [connect])
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getOrders()
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
    }, []),
  );

  const filtered = orders.filter((o) => {
    if (filter === 'All') return true;
    if (filter === 'Ongoing') return !['DELIVERED', 'CANCELLED'].includes(o.status);
    if (filter === 'Delivered') return o.status === 'DELIVERED';
    if (filter === 'Cancelled') return o.status === 'CANCELLED';
    return true;
  });

  const renderOrder = ({ item }: { item: OrderSummary }) => {
    const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const statusColor = STATUS_COLORS[item.status] ?? colors.muted;
    const statusLabel = STATUS_LABELS[item.status] ?? item.status;

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        activeOpacity={0.8}
        onPress={() => router.push(`/order/${item.id}`)}
      >
        {/* Restaurant emoji + info */}
        <View style={styles.orderRow}>
          <View style={styles.orderIcon}>
            <Text style={{ fontSize: 24 }}>🍽️</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.restaurantName}>{item.restaurant.name}</Text>
            <Text style={styles.orderDate}>{date}</Text>
            <Text style={[styles.orderStatus, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <Text style={styles.orderAmount}>₹{parseInt(item.totalAmount, 10)}</Text>
        </View>

        {/* Items summary */}
        <Text style={styles.itemsSummary} numberOfLines={1}>
          {item.items.map((i) => i.name).join(', ')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeScreen>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>My Orders</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {(['All', 'Ongoing', 'Delivered', 'Cancelled'] as const).map((f) => (
          <TouchableOpacity key={f} style={styles.tab} onPress={() => setFilter(f)}>
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>{f}</Text>
            {filter === f && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
          <Text style={styles.emptyText}>No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  navBar: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  navTitle: {
    ...type.title,
    color: colors.ink,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tab: {
    marginRight: space.xl,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  tabText: {
    ...type.body,
    color: colors.muted,
  },
  tabTextActive: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  list: {
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.surfaceAlt,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...cardShadow,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flex: 1,
    marginLeft: space.md,
  },
  restaurantName: {
    ...type.title,
    color: colors.ink,
  },
  orderDate: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  orderStatus: {
    ...type.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  orderAmount: {
    ...type.price,
    color: colors.ink,
  },
  itemsSummary: {
    ...type.caption,
    color: colors.muted,
    marginTop: space.sm,
    marginLeft: 64,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...type.body,
    color: colors.muted,
  },
});
