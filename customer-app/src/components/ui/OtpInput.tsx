import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

function OtpBox({
  digit,
  focused,
  index,
  inputRef,
  onKeyPress,
  onChangeText,
  disabled,
}: {
  digit: string;
  focused: boolean;
  index: number;
  inputRef: React.RefObject<TextInput | null>;
  onKeyPress: (key: string, index: number) => void;
  onChangeText: (text: string, index: number) => void;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleChangeText = (text: string) => {
    if (text) {
      scale.value = withSequence(withSpring(1.05), withSpring(1));
    }
    onChangeText(text, index);
  };

  const borderColor = focused ? '#F58220' : digit ? 'rgba(245,130,32,0.7)' : '#E5E7EB';

  const bgColor = focused ? '#FFF8F3' : '#FFFFFF';

  return (
    <AnimatedView style={[styles.box, { borderColor, backgroundColor: bgColor }, animatedStyle]}>
      <TextInput
        ref={inputRef}
        style={styles.boxText}
        value={digit}
        onChangeText={(t) => handleChangeText(t)}
        onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key, index)}
        keyboardType="number-pad"
        maxLength={1}
        textContentType="oneTimeCode"
        selectTextOnFocus
        editable={!disabled}
      />
    </AnimatedView>
  );
}

export function OtpInput({ length = 6, value, onChange, disabled }: OtpInputProps) {
  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const refs = useRef<Array<React.RefObject<TextInput | null>>>(
    Array.from({ length }, () => React.createRef<TextInput>()),
  );

  const handleChangeText = (text: string, index: number) => {
    if (!text) return;
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    if (!digit) return;
    const newDigits = [...digits];
    newDigits[index] = digit;
    const newValue = newDigits.join('').replace(/ /g, '');
    onChange(newValue.slice(0, length));
    if (index < length - 1) {
      refs.current[index + 1]?.current?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = '';
        onChange(newDigits.join('').replace(/ /g, '').slice(0, length));
      } else if (index > 0) {
        newDigits[index - 1] = '';
        onChange(newDigits.join('').replace(/ /g, '').slice(0, length));
        refs.current[index - 1]?.current?.focus();
        setFocusedIndex(index - 1);
      }
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => (
        <OtpBox
          key={i}
          index={i}
          digit={digits[i] ?? ''}
          focused={focusedIndex === i}
          inputRef={refs.current[i]!}
          onKeyPress={handleKeyPress}
          onChangeText={handleChangeText}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    width: 48,
    height: 58,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
    width: '100%',
    height: '100%',
    textAlignVertical: 'center',
  },
});
