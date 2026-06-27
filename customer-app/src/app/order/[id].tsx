import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { getOrderDetails } from '../../lib/api';
import { useSocketStore } from '../../lib/store/socket.store';
import { colors, cardShadow } from '../../constants/Colors';
import { space, radius } from '../../constants/Spacing';
import { type } from '../../constants/Typography';
import { ArrowLeft, Phone, MapPin, MessageCircle, Clock } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const { width } = Dimensions.get('window');

const TIMELINE_STEPS = [
  { status: 'PLACED', label: 'Order Placed' },
  { status: 'ACCEPTED', label: 'Restaurant Accepted' },
  { status: 'PREPARING', label: 'Preparing Food' },
  { status: 'READY', label: 'Food Ready' },
  { status: 'RIDER_ASSIGNED', label: 'Rider Assigned' },
  { status: 'PICKED_UP', label: 'Picked Up' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out For Delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket, connect } = useSocketStore();
  const mapRef = useRef<MapView>(null);

  const [riderLocation, setRiderLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    connect();
    loadOrder();
  }, [id]);

  useEffect(() => {
    if (!socket || !order) return;

    const handleStatusUpdate = (data: any) => {
      if (data.orderId === order.id) {
        setOrder((prev: any) => ({ ...prev, status: data.status }));
      }
    };

    const handleLocationUpdate = (data: any) => {
      if (order.deliveries && order.deliveries.length > 0 && data.deliveryId === order.deliveries[0].id) {
        const newLoc = { latitude: data.latitude, longitude: data.longitude };
        setRiderLocation(newLoc);
        
        // Center map to show both restaurant and rider
        if (mapRef.current && order.restaurant.latitude && order.restaurant.longitude) {
          mapRef.current.fitToCoordinates([
            { latitude: order.restaurant.latitude, longitude: order.restaurant.longitude },
            newLoc
          ], { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
        }
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('delivery:location_updated', handleLocationUpdate);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('delivery:location_updated', handleLocationUpdate);
    };
  }, [socket, order]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await getOrderDetails(id as string);
      setOrder(data);
      if (data.deliveries && data.deliveries.length > 0 && data.deliveries[0].trackingUpdates?.length > 0) {
        const lastUpdate = data.deliveries[0].trackingUpdates[0];
        setRiderLocation({ latitude: lastUpdate.latitude, longitude: lastUpdate.longitude });
      }
    } catch (e) {
      console.error('Failed to load order', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <SafeScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeScreen>
    );
  }

  const currentStepIndex = TIMELINE_STEPS.findIndex((s) => s.status === order.status);
  const delivery = order.deliveries?.[0];

  return (
    <SafeScreen edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.ink} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id.slice(-6).toUpperCase()}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Map View */}
        {delivery && order.restaurant.latitude && order.restaurant.longitude && (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: order.restaurant.latitude,
                longitude: order.restaurant.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {/* Restaurant Marker */}
              <Marker
                coordinate={{ latitude: order.restaurant.latitude, longitude: order.restaurant.longitude }}
                title={order.restaurant.name}
              >
                <View style={styles.markerRest}>
                  <Text style={{ fontSize: 18 }}>🍽️</Text>
                </View>
              </Marker>

              {/* Rider Marker */}
              {riderLocation && (
                <Marker coordinate={riderLocation} title="Delivery Rider">
                  <View style={styles.markerRider}>
                    <Text style={{ fontSize: 18 }}>🛵</Text>
                  </View>
                </Marker>
              )}

              {/* Path */}
              {riderLocation && (
                <Polyline
                  coordinates={[
                    { latitude: order.restaurant.latitude, longitude: order.restaurant.longitude },
                    riderLocation,
                  ]}
                  strokeColor={colors.primary}
                  strokeWidth={4}
                  lineDashPattern={[10, 10]}
                />
              )}
            </MapView>
            
            <View style={styles.mapOverlay}>
              <View style={styles.etaBadge}>
                <Clock color="#fff" size={16} />
                <Text style={styles.etaText}>
                  {delivery.eta ? new Date(delivery.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Calculating ETA...'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, index) => {
              // Highlight up to the current step. 
              // If order is cancelled, we might just color it red, but let's keep it simple.
              const isCompleted = order.status !== 'CANCELLED' && index <= currentStepIndex;
              const isCurrent = order.status !== 'CANCELLED' && index === currentStepIndex;
              const isCancelled = order.status === 'CANCELLED';

              return (
                <View key={step.status} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotActive,
                        isCurrent && styles.timelineDotCurrent,
                        isCancelled && { backgroundColor: colors.danger, borderColor: colors.danger }
                      ]}
                    />
                    {index !== TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, isCompleted && styles.timelineLineActive]} />
                    )}
                  </View>
                  <View style={styles.timelineRight}>
                    <Text
                      style={[
                        styles.timelineText,
                        isCompleted && styles.timelineTextActive,
                        isCurrent && styles.timelineTextCurrent,
                        isCancelled && { color: colors.danger }
                      ]}
                    >
                      {isCancelled ? 'Order Cancelled' : step.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Rider Details */}
        {delivery?.riderName && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Delivery Partner</Text>
            <View style={styles.riderRow}>
              <View style={styles.riderAvatar}>
                <Text style={{ fontSize: 24 }}>🛵</Text>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{delivery.riderName}</Text>
                <Text style={styles.riderVehicle}>{delivery.riderVehicle || 'Shadowfax Rider'}</Text>
              </View>
              {delivery.riderPhone && (
                <TouchableOpacity style={styles.actionBtn}>
                  <Phone color={colors.primary} size={20} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Restaurant Details */}
        <View style={styles.card}>
          <View style={styles.restaurantRow}>
            {order.restaurant.logoUrl ? (
              <Image source={{ uri: order.restaurant.logoUrl }} style={styles.restaurantLogo} />
            ) : (
              <View style={styles.restaurantLogoFallback}>
                <Text style={{ fontSize: 24 }}>🏪</Text>
              </View>
            )}
            <View style={styles.restaurantInfo}>
              <Text style={styles.restaurantName}>{order.restaurant.name}</Text>
              <Text style={styles.restaurantAddress}>{order.restaurant.addressLine}</Text>
            </View>
            {order.restaurant.phone && (
              <TouchableOpacity style={styles.actionBtn}>
                <Phone color={colors.primary} size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={styles.billRow}>
              <Text style={styles.billItem}>
                {item.quantity} x {item.name}
              </Text>
              <Text style={styles.billPrice}>₹{parseFloat(item.price) * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{parseFloat(order.totalAmount) - parseFloat(order.deliveryCharges) - parseFloat(order.taxAmount)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>₹{parseFloat(order.deliveryCharges)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Fees</Text>
            <Text style={styles.billValue}>₹{parseFloat(order.taxAmount)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { fontWeight: 'bold', color: colors.ink }]}>Grand Total</Text>
            <Text style={[styles.billValue, { fontWeight: 'bold', color: colors.ink }]}>₹{parseFloat(order.totalAmount)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Payment Method</Text>
            <Text style={[styles.billValue, { color: colors.primary, fontWeight: 'bold' }]}>{order.paymentMethod}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.supportBtn}>
          <MessageCircle color={colors.primary} size={20} style={{ marginRight: 8 }} />
          <Text style={styles.supportBtnText}>Need Help with your order?</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    ...type.h3,
    color: colors.ink,
  },
  content: {
    padding: space.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    ...cardShadow,
  },
  sectionTitle: {
    ...type.h3,
    fontSize: 16,
    marginBottom: space.md,
    color: colors.ink,
  },
  mapContainer: {
    height: 250,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: space.md,
    backgroundColor: '#e5e5ea',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  etaBadge: {
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    ...cardShadow,
  },
  etaText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  markerRest: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  markerRider: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 40,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.border,
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: '#fff',
    borderColor: colors.primary,
    borderWidth: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
    zIndex: 1,
  },
  timelineLineActive: {
    backgroundColor: colors.primary,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 24,
  },
  timelineText: {
    ...type.body,
    color: colors.muted,
  },
  timelineTextActive: {
    color: colors.ink,
  },
  timelineTextCurrent: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderInfo: {
    flex: 1,
    marginLeft: space.md,
  },
  riderName: {
    ...type.bodyMedium,
    color: colors.ink,
    fontSize: 16,
  },
  riderVehicle: {
    ...type.caption,
    color: colors.muted,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantLogo: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
  },
  restaurantLogoFallback: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: space.md,
  },
  restaurantName: {
    ...type.bodyMedium,
    color: colors.ink,
    fontSize: 16,
  },
  restaurantAddress: {
    ...type.caption,
    color: colors.muted,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  billItem: {
    ...type.body,
    color: colors.ink,
    flex: 1,
  },
  billPrice: {
    ...type.body,
    color: colors.ink,
  },
  billLabel: {
    ...type.body,
    color: colors.muted,
  },
  billValue: {
    ...type.body,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: space.sm,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryTint,
    marginBottom: 40,
  },
  supportBtnText: {
    ...type.bodyMedium,
    color: colors.primary,
  },
});
