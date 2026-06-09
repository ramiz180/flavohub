import React from 'react';
import type { ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  size = 'md',
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const containerStyle = [
    styles.base,
    styles[variant],
    size === 'sm' && styles.sm,
    size === 'lg' && styles.lg,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const isLight = variant === 'outline' || variant === 'ghost';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, containerStyle]}
    >
      {loading ? (
        <ActivityIndicator color={isLight ? '#F58220' : '#FFFFFF'} />
      ) : (
        <Text style={[styles.text, isLight && styles.textLight]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: '#F58220',
    elevation: 4,
    shadowColor: '#F58220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  secondary: {
    backgroundColor: '#4CAF2A',
    elevation: 4,
    shadowColor: '#4CAF2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#F58220',
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    height: 'auto' as unknown as number,
  },
  sm: { height: 40, borderRadius: 10 },
  lg: { height: 64, borderRadius: 16 },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  textLight: { color: '#F58220' },
});
