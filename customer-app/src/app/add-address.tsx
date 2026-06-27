import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../constants/Colors';
import { type } from '../constants/Typography';
import { customerApi, apiClient } from '../lib/api';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function AddAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>({
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [addressType, setAddressType] = useState('Home');
  const [saving, setSaving] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Call the backend reverse-geocode endpoint when the user stops dragging the map
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      setReverseGeocoding(true);
      const res = await apiClient.get<string>('/location/reverse-geocode', {
        params: { lat, lng },
      });
      const address = res.data;
      if (address) {
        setAddressLine(address);
        // Parse city from a comma-separated formatted address (e.g. "Street, Area, City, State, Country")
        const parts = address.split(',');
        const cityGuess = parts[parts.length - 3]?.trim() ?? parts[parts.length - 2]?.trim() ?? '';
        if (cityGuess) setCity(cityGuess);
      }
    } catch {
      // Silent — user can type manually
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  const handleSave = async () => {
    const addressStr = addressLine.trim();
    const cityStr = city.trim();
    if (!addressStr || !cityStr || addressStr.toLowerCase() === 'locating...') {
      return; // Do not save invalid addresses
    }
    
    try {
      setSaving(true);
      await customerApi.addresses.create({
        address: addressStr,
        city: cityStr,
        state: 'Unknown',
        pincode: '000000',
        label: addressType,
        latitude: region.latitude,
        longitude: region.longitude,
      });
      router.back();
    } catch (e) {
      console.log('Error saving address', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full-screen Google Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onRegionChangeComplete={(newRegion) => {
          setRegion(newRegion);
          void reverseGeocode(newRegion.latitude, newRegion.longitude);
        }}
      >
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
      </MapView>

      {/* Top Search Bar */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color="#1f2937" size={24} />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <GooglePlacesAutocomplete
            placeholder="Search for your location"
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
                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 500);
                setAddressLine(details.formatted_address || data.description);

                // Extract city from Google's address_components
                const cityComponent = details.address_components?.find((c) =>
                  c.types.includes('locality'),
                );
                if (cityComponent) setCity(cityComponent.long_name);
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

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.sheetTitle}>Delivery Details</Text>

        {/* Address field with reverse-geocoding loader */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Complete Address"
            value={addressLine}
            onChangeText={setAddressLine}
          />
          {reverseGeocoding && (
            <ActivityIndicator style={styles.inputLoader} size="small" color={colors.primary} />
          )}
        </View>

        <TextInput
          style={styles.input}
          placeholder="City"
          value={city}
          onChangeText={setCity}
        />

        <View style={styles.typeRow}>
          {['Home', 'Office', 'Other'].map((typeLabel) => (
            <TouchableOpacity
              key={typeLabel}
              style={[styles.typeBtn, addressType === typeLabel && styles.typeBtnActive]}
              onPress={() => setAddressType(typeLabel)}
            >
              <Text style={[styles.typeText, addressType === typeLabel && styles.typeTextActive]}>
                {typeLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, (!addressLine || !city) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!addressLine || !city || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Address</Text>
          )}
        </TouchableOpacity>
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
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flex: 1,
  },
  searchInput: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    elevation: 4,
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
  sheetTitle: {
    ...type.h3,
    color: colors.text,
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    ...type.body,
  },
  inputLoader: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primary,
  },
  typeText: {
    ...type.bodyMedium,
    color: colors.textSecondary,
  },
  typeTextActive: {
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: colors.disabled,
  },
  saveBtnText: {
    ...type.button,
    color: '#fff',
  },
});
