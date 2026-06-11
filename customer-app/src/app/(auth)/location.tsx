import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeScreen } from '@/components/ui/SafeScreen';

export default function LocationScreen() {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const handleUseLocation = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)');
    }, 800);
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <Text style={styles.heading}>{'Where should we\ndeliver?'}</Text>
        <Text style={styles.sub}>Set your delivery location to see nearby restaurants</Text>

        <Button
          title="📍  Use Current Location"
          variant="outline"
          onPress={handleUseLocation}
          loading={loading}
          style={styles.locationBtn}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Input
          placeholder="Search area, street name..."
          value={search}
          onChangeText={setSearch}
          leftElement={<Ionicons name="search" size={18} color="#687280" />}
        />

        <Button
          title="Skip for now"
          variant="ghost"
          onPress={() => router.replace('/(tabs)')}
          style={styles.skipBtn}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  heading: { fontSize: 32, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  sub: { fontSize: 15, color: '#687280', lineHeight: 22, marginBottom: 40 },
  locationBtn: { width: '100%' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  skipBtn: { marginTop: 8, alignSelf: 'center' },
});
