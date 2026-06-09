import { StyleSheet, Text, View } from 'react-native';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { useAuthStore } from '@/lib/store/auth.store';

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function HomeScreen() {
  const customer = useAuthStore((s) => s.customer);

  return (
    <SafeScreen>
      <View style={styles.header}>
        <Text style={styles.logoText}>FlavoHub 🍽️</Text>
      </View>
      <Text style={styles.greeting}>
        Good {getTimeOfDay()}, {customer?.name ?? 'Foodie'}!
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardEmoji}>🏪</Text>
        <Text style={styles.cardTitle}>Restaurants loading soon</Text>
        <Text style={styles.cardSub}>
          We're building the discovery experience. Check back in Phase 3.2!
        </Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  logoText: { fontSize: 24, fontWeight: '800', color: '#F58220' },
  greeting: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFF8F3',
    borderColor: '#F58220',
    borderWidth: 1,
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 48, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  cardSub: { fontSize: 14, color: '#687280', textAlign: 'center', lineHeight: 20 },
});
