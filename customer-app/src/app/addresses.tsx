import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeScreen } from '../components/ui/SafeScreen';
import { ArrowLeft, MapPin, Plus } from 'lucide-react-native';
import { colors } from '../constants/Colors';
import { customerApi } from '../lib/api';
import { useAuthStore } from '../lib/store/auth.store';
import { type } from '../constants/Typography';

export default function AddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      loadAddresses();
    }
  }, [accessToken]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const res = await customerApi.addresses.list();
      setAddresses(res.data?.data ?? []);
    } catch (e) {
      console.log('Failed to fetch addresses', e);
    } finally {
      setLoading(false);
    }
  };

  const renderAddress = ({ item }: { item: any }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <MapPin color={colors.primary} size={20} />
        <Text style={styles.addressType}>{item.addressType || 'Home'}</Text>
      </View>
      <Text style={styles.addressLine}>{item.addressLine}</Text>
      <Text style={styles.addressCity}>{item.city}, {item.state} - {item.pincode}</Text>
    </View>
  );

  return (
    <SafeScreen edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          renderItem={renderAddress}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MapPin color={colors.textLight} size={48} />
              <Text style={styles.emptyTitle}>No saved addresses</Text>
              <Text style={styles.emptySub}>Add a delivery location to get started</Text>
            </View>
          }
        />
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-address')}>
          <Plus color="#fff" size={24} />
          <Text style={styles.addBtnText}>Add New Address</Text>
        </TouchableOpacity>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...type.h3,
    color: colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  addressCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressType: {
    ...type.bodyMedium,
    color: colors.text,
    marginLeft: 8,
  },
  addressLine: {
    ...type.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addressCity: {
    ...type.caption,
    color: colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    ...type.h3,
    color: colors.text,
    marginTop: 16,
  },
  emptySub: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  addBtnText: {
    ...type.button,
    color: '#fff',
  },
});
