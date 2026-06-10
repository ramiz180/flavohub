export const colors = {
  primary: '#F58220',
  secondary: '#4CAF2A',
  ink: '#1F2937',
  muted: '#6B7280',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  primaryTint: '#FEF0E6',
  secondaryTint: '#EAF6E6',
  border: '#E5E7EB',
  borderSubtle: '#F3F4F6',
  success: '#4CAF2A',
  danger: '#EF4444',
  discount: '#F58220',
};

export const cardShadow = {
  shadowColor: '#111827',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

// Keep backward compat — existing screens import Colors.primary
const Colors = {
  primary: colors.primary,
  secondary: colors.secondary,
  ...colors,
};

export default Colors;
