import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft, MapPin, Navigation, Truck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/Colors';
import { type } from '../../constants/Typography';

// Note: In a real environment, you'd fetch the route points via Directions API and connect via Sockets.
// For demonstration, we'll use a mocked route and markers.
const mockRoute = [
  { latitude: 28.6139, longitude: 77.2090 }, // Restaurant
  { latitude: 28.6150, longitude: 77.2100 }, // Rider (midpoint)
  { latitude: 28.6200, longitude: 77.2150 }, // Customer
];

export default function TrackingScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [riderCoords, setRiderCoords] = useState(mockRoute[1]);

  useEffect(() => {
    // Simulated Socket Movement
    let interval = setInterval(() => {
      setRiderCoords((prev) => ({
        latitude: prev.latitude + 0.0001,
        longitude: prev.longitude + 0.0001,
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: mockRoute[1].latitude,
          longitude: mockRoute[1].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Polyline coordinates={mockRoute} strokeWidth={4} strokeColor={colors.primary} />
        
        {/* Restaurant Marker */}
        <Marker coordinate={mockRoute[0]} title="Restaurant">
          <View style={[styles.markerContainer, { backgroundColor: '#333' }]}>
            <MapPin color="#fff" size={16} />
          </View>
        </Marker>

        {/* Customer Marker */}
        <Marker coordinate={mockRoute[2]} title="Delivery Location">
          <View style={[styles.markerContainer, { backgroundColor: colors.success }]}>
            <MapPin color="#fff" size={16} />
          </View>
        </Marker>

        {/* Rider Marker */}
        <Marker coordinate={riderCoords} title="Rider">
          <View style={styles.riderMarker}>
            <Navigation color="#fff" size={16} />
          </View>
        </Marker>
      </MapView>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleCard}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSub}>Order #{String(orderId).slice(0, 6).toUpperCase()}</Text>
        </View>
      </View>

      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.etaText}>15 mins</Text>
            <Text style={styles.etaLabel}>Estimated Arrival</Text>
          </View>
          <View style={styles.distanceBadge}>
            <Truck color={colors.primary} size={16} />
            <Text style={styles.distanceText}>2.4 km</Text>
          </View>
        </View>

        <View style={styles.riderInfo}>
          <View style={styles.riderAvatar}>
            <Text style={styles.riderInitial}>R</Text>
          </View>
          <View style={styles.riderDetails}>
            <Text style={styles.riderName}>Rajesh Kumar</Text>
            <Text style={styles.riderRole}>Shadowfax Delivery Partner</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Text style={styles.callText}>Call</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
  callText: {
    ...type.button,
    color: colors.text,
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
