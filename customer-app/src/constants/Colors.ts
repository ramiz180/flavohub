export const colors = {
  primary: '#FF6B00',
  secondary: '#121826',
  accent: '#00C47A',
  ink: '#121826',
  muted: '#64748B',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC', // Background
  primaryTint: '#FFF0E5',
  secondaryTint: '#F1F5F9',
  accentTint: '#E6F9F2',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  success: '#00C47A',
  danger: '#EF4444',
  discount: '#FF6B00',
  // Text aliases
  text: '#121826',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  disabled: '#CBD5E1',
};

export const cardShadow = {
  shadowColor: '#121826',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
};

// Backward-compat default export for screens using Colors.primary etc.
const Colors = {
  ...colors,
};

export default Colors;
