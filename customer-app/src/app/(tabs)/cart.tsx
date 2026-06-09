import { StyleSheet, Text, View } from 'react-native';
import { SafeScreen } from '@/components/ui/SafeScreen';

export default function CartScreen() {
  return (
    <SafeScreen>
      <View style={styles.center}>
        <Text style={styles.emoji}>🛒</Text>
        <Text style={styles.title}>Cart Coming Soon</Text>
        <Text style={styles.sub}>Add items from a restaurant to see them here</Text>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  sub: { fontSize: 14, color: '#687280', textAlign: 'center' },
});
