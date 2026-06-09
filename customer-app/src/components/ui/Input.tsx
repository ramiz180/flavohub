import React, { useState } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: TextInputProps['keyboardType'];
  secureTextEntry?: boolean;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  maxLength?: number;
  autoFocus?: boolean;
  editable?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  error,
  leftElement,
  rightElement,
  maxLength,
  autoFocus,
  editable = true,
}: InputProps) {
  const [, setFocused] = useState(false);
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    setFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
  };

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? '#EF4444'
      : interpolateColor(focusProgress.value, [0, 1], ['#E5E7EB', '#F58220']),
  }));

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <AnimatedView style={[styles.container, animatedBorderStyle]}>
        {leftElement && <View style={styles.side}>{leftElement}</View>}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoFocus={autoFocus}
          editable={editable}
        />
        {rightElement && <View style={styles.side}>{rightElement}</View>}
      </AnimatedView>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 0 },
  label: { fontSize: 14, color: '#687280', marginBottom: 6 },
  container: {
    borderWidth: 1.5,
    borderRadius: 12,
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 16, color: '#1F2937', paddingVertical: 0 },
  side: { marginHorizontal: 4 },
  error: { fontSize: 12, color: '#EF4444', marginTop: 4 },
});
