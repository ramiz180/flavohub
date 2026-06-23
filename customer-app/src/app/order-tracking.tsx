import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SafeScreen } from '../components/ui/SafeScreen';
import type { OrderStatusUpdate, DeliveryStatusUpdate } from '../lib/socket';
import { subscribeToOrderUpdates, subscribeToDeliveryStatus, subscribeToDeliveryLocation, subscribeToPaymentStatus } from '../lib/socket';
import { getOrderDetails } from '../lib/api';
import { colors, cardShadow } from '../constants/Colors';
import { type } from '../constants/Typography';
import { space, radius } from '../constants/Spacing';

const { height } = Dimensions.get('window');

const STATUS_STEPS = [
  { key: 'PLACED', label: 'Order Placed', icon: '📋' },
  { key: 'ACCEPTED', label: 'Accepted', icon: '✅' },
  { key: 'PREPARING', label: 'Preparing', icon: '👨‍🍳' },
  { key: 'READY', label: 'Ready', icon: '📦' },
  { key: 'RIDER_ASSIGNED', label: 'Rider Assigned', icon: '🛵' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: '🥡' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🗺️' },
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
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryStatusUpdate | null>(null);
  const [riderLocation, setRiderLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [restaurantLocation, setRestaurantLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '85%'], []);

  useEffect(() => {
    async function loadInitialData() {
      if (!orderId) return;
      try {
        const order = await getOrderDetails(orderId as string);
        setCurrentStatus(order.status);
        if (order.paymentStatus) setPaymentStatus(order.paymentStatus);
        
        if (order.restaurant?.latitude && order.restaurant?.longitude) {
          setRestaurantLocation({ latitude: order.restaurant.latitude, longitude: order.restaurant.longitude });
        }
        if (order.deliveryAddress?.lat && order.deliveryAddress?.lng) {
          setCustomerLocation({ latitude: order.deliveryAddress.lat, longitude: order.deliveryAddress.lng });
        }
        
        if (order.deliveries && order.deliveries.length > 0) {
          const d = order.deliveries[0];
          setDeliveryInfo({
            id: d.id,
            orderId: d.orderId,
            partner: d.partner,
            status: d.status,
            riderName: d.riderName,
            riderPhone: d.riderPhone,
            eta: d.eta,
          });
          if (d.tracking?.latitude && d.tracking?.longitude) {
            setRiderLocation({ latitude: d.tracking.latitude, longitude: d.tracking.longitude });
          }
        }
      } catch (e) {
        console.warn('Failed to fetch initial order details', e);
      }
    }
    void loadInitialData();
  }, [orderId]);

  useEffect(() => {
    const unsubOrder = subscribeToOrderUpdates((update) => {
      if (update.orderId === orderId) {
        setCurrentStatus(update.status);
        setUpdates((prev) => [update, ...prev]);
      }
    });

    const unsubDelivery = subscribeToDeliveryStatus((update) => {
      if (update.orderId === orderId) {
        setDeliveryInfo(update);
      }
    });

    const unsubLocation = subscribeToDeliveryLocation((update) => {
      if (deliveryInfo && update.deliveryId === deliveryInfo.id) {
        setRiderLocation({ latitude: update.latitude, longitude: update.longitude });
      }
    });

    const unsubPayment = subscribeToPaymentStatus((update) => {
      if (update.orderId === orderId) {
        setPaymentStatus(update.paymentStatus);
      }
    });

    const timer = setTimeout(() => setConnected(true), 1000);

    return () => {
      unsubOrder();
      unsubDelivery();
      unsubLocation();
      unsubPayment();
      clearTimeout(timer);
    };
  }, [orderId, deliveryInfo]);

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REJECTED';
  const isDelivered = currentStatus === 'DELIVERED';

  const mapCenter = riderLocation || restaurantLocation || customerLocation || { latitude: 28.70406, longitude: 77.10249 };

  return (
    <SafeScreen edges={['top']}>
      {/* ── Header Overlay ────────────────────────────── */}
      <View style={styles.headerAbsolute}>
        <TouchableOpacity style={styles.backBtnWrapper} onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.connectionBadge}>
          <View style={[styles.connectionDot, { backgroundColor: connected ? colors.success : colors.danger }]} />
          <Text style={styles.connectionText}>{connected ? 'Live' : 'Connecting'}</Text>
        </View>
      </View>

      {/* ── Background Map ───────────────────────────── */}
      <View style={styles.mapContainer}>
         <MapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            region={{
              latitude: mapCenter.latitude,
              longitude: mapCenter.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {riderLocation && (
              <Marker coordinate={riderLocation} title="Rider" description="Current location">
                <View style={styles.markerCircle}><Text style={{ fontSize: 24 }}>🛵</Text></View>
              </Marker>
            )}
            
            {restaurantLocation && (
              <Marker coordinate={restaurantLocation} title="Restaurant" description={restaurantName}>
                <View style={[styles.markerCircle, { backgroundColor: colors.surfaceAlt }]}><Text style={{ fontSize: 24 }}>🍽️</Text></View>
              </Marker>
            )}
            
            {customerLocation && (
              <Marker coordinate={customerLocation} title="You" description="Delivery Address">
                <View style={[styles.markerCircle, { backgroundColor: colors.primaryTint }]}><Text style={{ fontSize: 24 }}>📍</Text></View>
              </Marker>
            )}
            
            {riderLocation && customerLocation && (
              <Polyline 
                coordinates={[riderLocation, customerLocation]}
                strokeColor={colors.primary}
                strokeWidth={4}
                lineDashPattern={[10, 10]}
              />
            )}
          </MapView>
      </View>

      {/* ── Interactive Bottom Sheet ──────────────────── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        handleIndicatorStyle={{ backgroundColor: colors.borderSubtle, width: 40 }}
        backgroundStyle={{ borderRadius: 24, backgroundColor: colors.surface }}
        style={styles.sheetShadow}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.sheetHeader}>
             <View>
                <Text style={styles.orderEtaTitle}>Estimated Delivery</Text>
                <Text style={styles.orderEtaTime}>
                  {deliveryInfo?.eta ? new Date(deliveryInfo.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Calculating...'}
                </Text>
             </View>
             {total && (
                <View style={{alignItems: 'flex-end'}}>
                   <Text style={styles.orderTotalTitle}>Order Total</Text>
                   <Text style={styles.orderTotalVal}>₹{total}</Text>
                </View>
             )}
          </View>

          {/* Delivery Partner Info */}
          {deliveryInfo && !isCancelled && (
            <View style={styles.riderCard}>
               <View style={styles.riderAvatar}>
                  <Text style={{fontSize: 32}}>👨‍🚀</Text>
               </View>
               <View style={styles.riderInfo}>
                 <Text style={styles.riderName}>{deliveryInfo.riderName || 'Assigning partner...'}</Text>
                 <Text style={styles.riderRole}>Delivery Partner • {deliveryInfo.partner}</Text>
               </View>
               <TouchableOpacity style={styles.callBtn}>
                 <Text style={styles.callIcon}>📞</Text>
               </TouchableOpacity>
            </View>
          )}

          {/* Timeline Status */}
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
                      {isCurrent && <Text style={styles.timelineCurrent}>Currently processing...</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {isDelivered || isCancelled ? (
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.doneBtnText}>Back to Home</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.ordersBtn} onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.ordersBtnText}>View All Orders</Text>
              </TouchableOpacity>
            )}
          </View>
          
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerAbsolute: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    right: space.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
    alignItems: 'center',
  },
  backBtnWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  backBtn: { fontSize: 24, color: colors.ink, marginTop: -2 },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    ...cardShadow,
  },
  connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  connectionText: { ...type.caption, fontWeight: '700' },
  mapContainer: {
    height: height * 0.6,
    width: '100%',
  },
  markerCircle: {
    backgroundColor: '#FFF',
    padding: 4,
    borderRadius: 24,
    ...cardShadow,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
  },
  sheetShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetContent: {
    padding: space.lg,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  orderEtaTitle: {
    ...type.bodyMedium,
    color: colors.muted,
  },
  orderEtaTime: {
    ...type.display,
    fontSize: 28,
    color: colors.ink,
    marginTop: 2,
  },
  orderTotalTitle: {
    ...type.bodyMedium,
    color: colors.muted,
  },
  orderTotalVal: {
    ...type.h2,
    color: colors.ink,
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    padding: space.md,
    borderRadius: radius.xl,
    marginBottom: space.lg,
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  riderInfo: {
    flex: 1,
    marginLeft: space.md,
  },
  riderName: {
    ...type.h3,
    color: colors.ink,
  },
  riderRole: {
    ...type.caption,
    color: colors.muted,
    marginTop: 2,
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  callIcon: {
    fontSize: 20,
  },
  timelineCard: { 
    backgroundColor: colors.surface, 
    borderRadius: radius.xl, 
    padding: space.lg,
    paddingTop: space.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 64 },
  timelineLeft: { alignItems: 'center', width: 40 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { backgroundColor: colors.primaryTint },
  timelineDotCurrent: { backgroundColor: colors.primary, ...cardShadow, shadowColor: colors.primary },
  timelineDotIcon: { fontSize: 16 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.surfaceAlt, marginVertical: 4 },
  timelineLineActive: { backgroundColor: colors.primary },
  timelineContent: { flex: 1, paddingLeft: space.md, paddingTop: 4, paddingBottom: space.md },
  timelineLabel: { ...type.body, color: colors.muted },
  timelineLabelActive: { ...type.h3, color: colors.primary, fontSize: 16 },
  timelineLabelDone: { ...type.h3, color: colors.ink, fontSize: 16 },
  timelineCurrent: { ...type.caption, color: colors.primary, marginTop: 4, fontWeight: '600' },
  cancelledCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: space.xl, alignItems: 'center' },
  cancelledIcon: { fontSize: 48, marginBottom: space.md },
  cancelledTitle: { ...type.h3, color: colors.danger },
  cancelledSub: { ...type.body, color: colors.muted, marginTop: space.sm },
  actionRow: {
    marginTop: space.xl,
  },
  doneBtn: { backgroundColor: colors.primary, borderRadius: radius.xl, height: 56, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { ...type.button, color: colors.surface },
  ordersBtn: { backgroundColor: colors.surfaceAlt, borderRadius: radius.xl, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  ordersBtnText: { ...type.button, color: colors.ink },
});
