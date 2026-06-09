import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { useAuthStore } from '@/lib/store/auth.store';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestOtp = useAuthStore((s) => s.requestOtp);

  const handleContinue = async () => {
    setError('');
    setLoading(true);
    try {
      await requestOtp(phone);
      router.push('/(auth)/otp');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>F</Text>
            </View>
            <Text style={styles.appName}>FlavoHub</Text>
            <Text style={styles.tagline}>Fresh Food Delivered Fast</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.heading}>Welcome! 👋</Text>
            <Text style={styles.sub}>Enter your mobile to continue</Text>

            <View style={styles.phoneRow}>
              <View style={styles.countryBox}>
                <Text style={styles.countryText}>🇮🇳 +91</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="Mobile number"
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v.replace(/[^0-9]/g, ''));
                    setError('');
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title="Continue"
              onPress={handleContinue}
              loading={loading}
              disabled={phone.length !== 10}
              style={styles.continueBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  logoArea: { alignItems: 'center', paddingTop: 60 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  appName: { fontSize: 28, fontWeight: '800', color: '#F58220', marginTop: 12 },
  tagline: { fontSize: 13, color: '#687280', marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  sub: { fontSize: 15, color: '#687280', marginBottom: 32 },
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  countryBox: {
    width: 72,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryText: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  errorText: { fontSize: 13, color: '#EF4444', marginTop: 8 },
  continueBtn: { marginTop: 24 },
});
