import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { SafeScreen } from '@/components/ui/SafeScreen';
import { useAuthStore } from '@/lib/store/auth.store';

export default function OtpScreen() {
  const phone = useAuthStore((s) => s.pendingPhone);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(120);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, []);

  useEffect(() => {
    if (otpValue.length === 6) handleVerify(otpValue);
  }, [otpValue]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearTimer();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleResend = async () => {
    setError('');
    setOtpValue('');
    await requestOtp(phone);
    setSeconds(120);
    clearTimer();
    startTimer();
  };

  const handleVerify = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      await verifyOtp(phone, code);
      router.replace('/(auth)/location');
    } catch {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
      setError('Invalid OTP. Please try again.');
      setOtpValue('');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </Pressable>

          <View style={styles.content}>
            <Text style={styles.heading}>Verify your number</Text>
            <Text style={styles.sub}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={styles.phone}>+91 {phone}</Text>
            </Text>

            <Animated.View style={[styles.otpWrapper, shakeStyle]}>
              <OtpInput value={otpValue} onChange={setOtpValue} disabled={loading} />
            </Animated.View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.timerRow}>
              {seconds > 0 ? (
                <Text style={styles.timerText}>Resend code in {formatTime(seconds)}</Text>
              ) : (
                <Pressable onPress={handleResend}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </Pressable>
              )}
            </View>

            <Button
              title="Verify OTP"
              onPress={() => handleVerify(otpValue)}
              loading={loading}
              disabled={otpValue.length < 6}
              style={styles.verifyBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  backBtn: { padding: 20 },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  sub: { fontSize: 15, color: '#687280', lineHeight: 24, marginBottom: 40 },
  phone: { fontWeight: '700', color: '#1F2937' },
  otpWrapper: { marginBottom: 16 },
  errorText: { fontSize: 13, color: '#EF4444', marginBottom: 8 },
  timerRow: { alignItems: 'center', marginBottom: 32 },
  timerText: { fontSize: 14, color: '#687280' },
  resendText: { fontSize: 14, fontWeight: '600', color: '#F58220' },
  verifyBtn: {},
});
