import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Dimensions, FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
const { width } = Dimensions.get('window');

const slides = [
  {
    gradient: ['#F58220', '#FEF0E6'] as const,
    emoji: '🍕',
    title: 'Discover Great Food',
    subtitle: 'Explore top restaurants and curated cuisines near you.',
  },
  {
    gradient: ['#4CAF2A', '#EAF6E6'] as const,
    emoji: '🛵',
    title: 'Track Every Order',
    subtitle: 'Real-time updates from kitchen to your doorstep.',
  },
  {
    gradient: ['#6366F1', '#EDE9FE'] as const,
    emoji: '⚡',
    title: 'Fast Delivery',
    subtitle: 'Lightning fast delivery at your convenience.',
  },
];

function FloatingEmoji({ emoji }: { emoji: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(withTiming(-8, { duration: 2000 }), withTiming(8, { duration: 2000 })),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={styles.emoji}>{emoji}</Text>
    </Animated.View>
  );
}

function Dot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 24 : 8);

  useEffect(() => {
    width.value = withSpring(active ? 24 : 8);
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <Animated.View
      style={[styles.dot, animatedStyle, { backgroundColor: active ? '#F58220' : '#E5E7EB' }]}
    />
  );
}

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    SecureStore.getItemAsync('fh_onboarding_done').then((val) => {
      if (val === 'true') router.replace('/(auth)/login');
    });
  }, []);

  const goToLogin = async () => {
    await SecureStore.setItemAsync('fh_onboarding_done', 'true');
    router.replace('/(auth)/login');
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      goToLogin();
    }
  };

  return (
    <FlatList
      ref={flatListRef}
      data={slides}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item }) => (
        <LinearGradient colors={item.gradient} style={styles.slide}>
          <View style={styles.emojiArea}>
            <FloatingEmoji emoji={item.emoji} />
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>

            <View style={styles.dots}>
              {slides.map((_, i) => (
                <Dot key={i} active={i === currentIndex} />
              ))}
            </View>

            <View style={styles.buttons}>
              <Button title="Skip" variant="ghost" onPress={goToLogin} style={styles.skipBtn} />
              <Button
                title={currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
                variant="primary"
                onPress={handleNext}
                style={styles.nextBtn}
              />
            </View>
          </View>
        </LinearGradient>
      )}
    />
  );
}

const styles = StyleSheet.create({
  slide: { width, flex: 1 },
  emojiArea: {
    flex: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 100, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#687280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 4 },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  skipBtn: { flex: 0 },
  nextBtn: { flex: 1, marginLeft: 16 },
});
