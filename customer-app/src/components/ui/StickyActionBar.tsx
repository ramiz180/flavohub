/**
 * StickyActionBar
 * ─────────────────────────────────────────────────────────────
 * A premium, safe-area-aware sticky footer for action buttons.
 * Respects home indicator / navigation bar on all devices:
 *   iPhone SE, iPhone 15 Pro Max, Android gesture-nav, 3-button nav,
 *   Samsung, Xiaomi, Oppo, Realme, Vivo, Foldables.
 *
 * Usage (single button):
 *   <StickyActionBar>
 *     <ActionButton label="Place Order" onPress={…} />
 *   </StickyActionBar>
 *
 * Usage (two buttons):
 *   <StickyActionBar>
 *     <ActionButton label="Add to Cart" onPress={…} />
 *     <ActionButton label="Buy Now" onPress={…} primary />
 *   </StickyActionBar>
 *
 * Buttons will be side-by-side on normal screens, stacked on narrow (<320px).
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, cardShadow } from '../../constants/Colors';
import { type as typography } from '../../constants/Typography';
import { radius } from '../../constants/Spacing';

const SCREEN_WIDTH = Dimensions.get('window').width;
const NARROW_THRESHOLD = 320; // stack vertically below this width

// ─── StickyActionBar (wrapper) ───────────────────────────────

interface StickyActionBarProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function StickyActionBar({ children, style }: StickyActionBarProps) {
  const insets = useSafeAreaInsets();
  const isNarrow = SCREEN_WIDTH < NARROW_THRESHOLD;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8) + 12,
          flexDirection: isNarrow ? 'column' : 'row',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── ActionButton (individual button) ────────────────────────

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Primary = orange fill. Secondary = bordered outline. Default = primary. */
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ActionButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: ActionButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFF' : colors.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isPrimary ? styles.buttonTextPrimary : styles.buttonTextSecondary,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Quantity Selector ────────────────────────────────────────

interface QuantitySelectorProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function QuantitySelector({ value, onDecrement, onIncrement }: QuantitySelectorProps) {
  return (
    <View style={styles.qty}>
      <TouchableOpacity style={styles.qtyBtn} onPress={onDecrement} activeOpacity={0.7}>
        <Text style={styles.qtyGlyph}>−</Text>
      </TouchableOpacity>
      <Text style={styles.qtyValue}>{value}</Text>
      <TouchableOpacity style={styles.qtyBtn} onPress={onIncrement} activeOpacity={0.7}>
        <Text style={styles.qtyGlyph}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    // Subtle top shadow so bar floats above content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 100,
  },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    ...cardShadow,
    shadowColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonTextPrimary: {
    color: '#FFF',
  },
  buttonTextSecondary: {
    color: colors.primary,
  },

  // Quantity selector
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    width: 116,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyGlyph: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 26,
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    width: 24,
    textAlign: 'center',
  },
});
