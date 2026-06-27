import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, MapPin, Navigation, Truck, Phone } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/Colors';
import { type } from '../../constants/Typography';
import { getOrderDetails, apiClient } from '../../lib/api';
import {
  subscribeToDeliveryLocation,
  subscribeToDeliveryStatus,
} from '../../lib/socket';

/** Decode a Google Maps encoded polyline into lat/lng coordinate array */
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const coords: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
  }
  return coords;
}

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [restaurantCoords, setRestaurantCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [riderCoords, setRiderCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [riderName, setRiderName] = useState<string>('');
  const [riderPhone, setRiderPhone] = useState<string>('');
  const [deliveryPartner, setDeliveryPartner] = useState<string>('');
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<string | null>(null);

  const fetchRoute = useCallback(async (
    oLat: number, oLng: number,
    dLat: number, dLng: number,
  ) => {
    try {
      const [routeRes, distRes] = await Promise.all([
        apiClient.get<string>('/location/route', {
          params: { originLat: oLat, originLng: oLng, destLat: dLat, destLng: dLng },
        }),
        apiClient.get<{ distanceMeters: number; durationSeconds: number }>('/location/distance', {
          params: { originLat: oLat, originLng: oLng, destLat: dLat, destLng: dLng },
        }),
      ]);

      if (routeRes.data) {
        setRouteCoords(decodePolyline(routeRes.data));
      }
      if (distRes.data) {
        const km = (distRes.data.distanceMeters / 1000).toFixed(1);
        const mins = Math.round(distRes.data.durationSeconds / 60);
        setDistanceKm(`${km} km`);
        setEta(`${mins} mins`);
      }
    } catch {
      // Silent fallback
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;

    async function loadOrder() {
      try {
        const order = await getOrderDetails(orderId as string);

        let resLat: number | null = null;
        let resLng: number | null = null;
        let cusLat: number | null = null;
        let cusLng: number | null = null;

        if (order.restaurant?.latitude && order.restaurant?.longitude) {
          resLat = order.restaurant.latitude;
          resLng = order.restaurant.longitude;
          setRestaurantCoords({ latitude: resLat, longitude: resLng });
        }
        if (order.deliveryAddress?.lat && order.deliveryAddress?.lng) {
          cusLat = order.deliveryAddress.lat;
          cusLng = order.deliveryAddress.lng;
          setCustomerCoords({ latitude: cusLat, longitude: cusLng });
        }

        if (order.deliveries && order.deliveries.length > 0) {
          const d = order.deliveries[0];
          setDeliveryId(d.id);
          setRiderName(d.riderName || '');
          setRiderPhone(d.riderPhone || '');
          setDeliveryPartner(d.partner || '');
          if (d.eta) setEta(new Date(d.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          if (d.tracking?.latitude && d.tracking?.longitude) {
            setRiderCoords({ latitude: d.tracking.latitude, longitude: d.tracking.longitude });
          }
        }

        if (resLat && resLng && cusLat && cusLng) {
          void fetchRoute(resLat, resLng, cusLat, cusLng);
        }
      } catch (e) {
        console.warn('TrackingScreen: failed to load order', e);
      }
    }

    void loadOrder();
  }, [orderId, fetchRoute]);

  // Real-time rider location via socket
  useEffect(() => {
    if (!deliveryId) return;
    const unsub = subscribeToDeliveryLocation((update) => {
      if (update.deliveryId === deliveryId) {
        const coords = { latitude: update.latitude, longitude: update.longitude };
        setRiderCoords(coords);
        // Re-fetch route & ETA as rider moves (throttled by socket rate)
        if (customerCoords) {
          void fetchRoute(update.latitude, update.longitude, customerCoords.latitude, customerCoords.longitude);
        }
      }
    });
    return unsub;
  }, [deliveryId, customerCoords, fetchRoute]);

  // Real-time delivery status updates
  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeToDeliveryStatus((update) => {
      if (update.orderId === orderId) {
        setRiderName(update.riderName || riderName);
        setRiderPhone(update.riderPhone || riderPhone);
        if (update.eta) {
          setEta(new Date(update.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    });
    return unsub;
  }, [orderId, riderName, riderPhone]);

  const mapCenter = riderCoords ?? restaurantCoords ?? customerCoords ?? {
    latitude: 28.6139,
    longitude: 77.209,
  };

  const handleCall = () => {
    if (riderPhone) {
      void Linking.openURL(`tel:${riderPhone}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full-screen Google Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: mapCenter.latitude,
          longitude: mapCenter.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Real decoded polyline route */}
        {routeCoords.length > 1 ? (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor={colors.primary} />
        ) : riderCoords && customerCoords ? (
          <Polyline
            coordinates={[riderCoords, customerCoords]}
            strokeWidth={4}
            strokeColor={colors.primary}
            lineDashPattern={[10, 10]}
          />
        ) : null}

        {/* Restaurant Marker */}
        {restaurantCoords && (
          <Marker coordinate={restaurantCoords} title="Restaurant">
            <View style={[styles.markerContainer, { backgroundColor: '#333' }]}>
              <MapPin color="#fff" size={16} />
            </View>
          </Marker>
        )}

        {/* Customer Delivery Marker */}
        {customerCoords && (
          <Marker coordinate={customerCoords} title="Delivery Location">
            <View style={[styles.markerContainer, { backgroundColor: colors.success }]}>
              <MapPin color="#fff" size={16} />
            </View>
          </Marker>
        )}

        {/* Live Rider Marker */}
        {riderCoords && (
          <Marker coordinate={riderCoords} title={riderName || 'Rider'}>
            <View style={styles.riderMarker}>
              <Navigation color="#fff" size={16} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleCard}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSub}>Order #{String(orderId).slice(0, 6).toUpperCase()}</Text>
        </View>
      </View>

      {/* Bottom info sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.etaText}>{eta ?? 'Calculating...'}</Text>
            <Text style={styles.etaLabel}>Estimated Arrival</Text>
          </View>
          {distanceKm && (
            <View style={styles.distanceBadge}>
              <Truck color={colors.primary} size={16} />
              <Text style={styles.distanceText}>{distanceKm}</Text>
            </View>
          )}
        </View>

        {(riderName || deliveryPartner) && (
          <View style={styles.riderInfo}>
            <View style={styles.riderAvatar}>
              <Text style={styles.riderInitial}>
                {riderName ? riderName[0]?.toUpperCase() : 'R'}
              </Text>
            </View>
            <View style={styles.riderDetails}>
              <Text style={styles.riderName}>{riderName || 'Assigning partner...'}</Text>
              <Text style={styles.riderRole}>
                {deliveryPartner ? `${deliveryPartner} Delivery Partner` : 'Delivery Partner'}
              </Text>
            </View>
            {riderPhone ? (
              <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                <Phone color={colors.primary} size={18} />
                <Text style={styles.callText}>Call</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitleCard: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    ...type.title,
    color: colors.text,
  },
  headerSub: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
    marginBottom: 16,
  },
  etaText: {
    ...type.h2,
    color: colors.text,
  },
  etaLabel: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  distanceText: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderInitial: {
    ...type.h3,
    color: colors.text,
  },
  riderDetails: {
    flex: 1,
    marginLeft: 12,
  },
  riderName: {
    ...type.bodyMedium,
    color: colors.text,
  },
  riderRole: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
  },
  callText: {
    ...type.button,
    color: colors.primary,
    fontSize: 14,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  riderMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
