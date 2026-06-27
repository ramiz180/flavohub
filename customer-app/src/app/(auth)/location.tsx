import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { ArrowLeft, Navigation, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/Colors';
import { type } from '@/constants/Typography';
import { useLocationStore } from '@/lib/store/location.store';
import { customerApi, getNearbyRestaurants } from '@/lib/api';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Default center: India
const DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

export default function PremiumLocationScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { setLocation } = useLocationStore();

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [addressLine, setAddressLine] = useState('Locating...');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');

  const [isResolving, setIsResolving] = useState(false);
  const [restaurantsCount, setRestaurantsCount] = useState<number | null>(null);
  const [isServiceable, setIsServiceable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  useEffect(() => {
    requestAutoLocation();
  }, []);

  const requestAutoLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow FlavoHub to access your location to find nearby restaurants.');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setHasMoved(true);
      resolveLocation(newRegion.latitude, newRegion.longitude);
    } catch (e) {
      console.log('Failed to get location', e);
    }
  };

  const resolveLocation = async (lat: number, lng: number) => {
    setIsResolving(true);
    try {
      // 1. Reverse Geocode via Google API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        setAddressLine(result.formatted_address);

        let parsedCity = '';
        let parsedState = '';
        let parsedDistrict = '';
        let parsedPin = '';

        result.address_components.forEach((c: any) => {
          if (c.types.includes('locality')) parsedCity = c.long_name;
          if (c.types.includes('administrative_area_level_2')) parsedDistrict = c.long_name;
          if (c.types.includes('administrative_area_level_1')) parsedState = c.long_name;
          if (c.types.includes('postal_code')) parsedPin = c.long_name;
        });

        setCity(parsedCity);
        setDistrict(parsedDistrict);
        setStateName(parsedState);
        setPincode(parsedPin);

        // 2. Check Serviceability (GET /restaurants/nearby)
        const nearby = await getNearbyRestaurants(lat, lng, 10); // 10km search radius
        setRestaurantsCount(nearby.length);
        setIsServiceable(nearby.length > 0);
      }
    } catch (e) {
      console.log('Reverse geocoding failed', e);
      setAddressLine('Unknown Location');
    } finally {
      setIsResolving(false);
    }
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    if (hasMoved) {
      resolveLocation(newRegion.latitude, newRegion.longitude);
    }
  };

  const handleConfirmLocation = async () => {
    if (!isServiceable) {
      Alert.alert('Not Serviceable', 'We currently do not have active restaurants in this area.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save to Global Store
      setLocation({
        latitude: region.latitude,
        longitude: region.longitude,
        address: addressLine,
        city: city || district,
        pincode,
      });

      // Navigate to Home
      router.replace('/(tabs)');
    } catch (e) {
      console.log('Failed to save address', e);
      // Fallback: still navigate if backend save fails
      router.replace('/(tabs)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={() => {
          if (!hasMoved) setHasMoved(true);
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        customMapStyle={mapStyle}
      />

      {/* Fixed Center Pin */}
      <View style={styles.centerPinContainer} pointerEvents="none">
        <Animated.View style={styles.centerPin}>
          <View style={styles.pinDot} />
        </Animated.View>
        <View style={styles.pinShadow} />
      </View>

      {/* Floating Top Elements */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color="#1F2937" size={24} />
          </TouchableOpacity>
          <View style={styles.searchWrapper}>
            <GooglePlacesAutocomplete
              placeholder="Search area, street, landmark..."
              fetchDetails={true}
              onPress={(data, details = null) => {
                if (details?.geometry?.location) {
                  const { lat, lng } = details.geometry.location;
                  const newRegion = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  };
                  setHasMoved(true);
                  mapRef.current?.animateToRegion(newRegion, 800);
                }
              }}
              query={{
                key: GOOGLE_API_KEY,
                language: 'en',
                components: 'country:in',
              }}
              styles={{
                container: { flex: 1 },
                textInput: styles.searchInput,
                listView: styles.searchList,
              }}
            />
          </View>
        </View>
      </View>

      {/* Current Location Button */}
      <TouchableOpacity style={[styles.myLocationBtn, { bottom: insets.bottom + 220 }]} onPress={requestAutoLocation}>
        <Navigation color={colors.primary} size={24} fill={colors.primary} />
      </TouchableOpacity>

      {/* Bottom Location Card */}
      {hasMoved && (
        <Animated.View 
          entering={FadeInDown.duration(400).springify()} 
          exiting={FadeOutDown}
          style={[styles.bottomCard, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={styles.cardHeader}>
            <MapPin color={colors.primary} size={24} />
            <Text style={styles.cardTitle}>Delivery Location</Text>
          </View>

          <View style={styles.addressWrapper}>
            {isResolving ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <>
                <Text style={styles.addressMain} numberOfLines={1}>{addressLine.split(',')[0]}</Text>
                <Text style={styles.addressSub} numberOfLines={2}>{addressLine}</Text>
              </>
            )}
          </View>

          {!isResolving && restaurantsCount !== null && (
            <View style={[styles.serviceBadge, !isServiceable && styles.serviceBadgeError]}>
              <Text style={[styles.serviceText, !isServiceable && styles.serviceTextError]}>
                {isServiceable ? `${restaurantsCount} restaurants delivering here` : 'Not serviceable in this area'}
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.confirmBtn, (!isServiceable || isResolving) && styles.confirmBtnDisabled]}
            disabled={!isServiceable || isResolving || isSaving}
            onPress={handleConfirmLocation}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm Location</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { ...StyleSheet.absoluteFillObject },
  
  // Center Pin Styles
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerPin: {
    width: 32,
    height: 32,
    backgroundColor: '#121826',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  pinDot: { width: 10, height: 10, backgroundColor: '#fff', borderRadius: 5 },
  pinShadow: {
    width: 12,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 6,
    marginTop: 4,
  },

  // Overlay Styles
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchWrapper: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInput: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    backgroundColor: '#fff',
    borderWidth: 0,
  },
  searchList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
  },

  // Floating Action
  myLocationBtn: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },

  // Bottom Card
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 24,
    zIndex: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { ...type.h3, color: colors.text },
  addressWrapper: { minHeight: 48, marginBottom: 16 },
  addressMain: { ...type.h2, color: colors.text, marginBottom: 4 },
  addressSub: { ...type.body, color: colors.textSecondary },
  serviceBadge: {
    backgroundColor: colors.accentTint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  serviceBadgeError: { backgroundColor: '#FEE2E2' },
  serviceText: { ...type.bodyMedium, color: colors.accent },
  serviceTextError: { color: colors.danger },
  
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnDisabled: { backgroundColor: colors.disabled, shadowOpacity: 0, elevation: 0 },
  confirmBtnText: { ...type.button, color: '#fff', fontSize: 16 },
});

// Minimalist map style without cluttered POIs
const mapStyle = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] }
];
