export const darkColors = {
  // Backgrounds
  bg: '#0A0E14',           // near-black, easier on OLED than #000
  surface: '#151A21',      // cards, sheets
  surfaceElevated: '#1C232C', // modals, dropdowns
  border: '#1F2630',
  borderSubtle: '#2A323D',

  // Text
  textPrimary: '#F5F7FA',
  textSecondary: '#A0AAB8',
  textTertiary: '#6B7280',
  textInverse: '#0A0E14',

  // Accents
  primary: '#3B82F6',      // blue (kept from existing)
  primarySubtle: 'rgba(59, 130, 246, 0.15)',

  // Match score colors
  scoreHigh: '#10B981',    // green: 80-100
  scoreMid: '#F59E0B',     // amber: 50-79
  scoreLow: '#EF4444',     // red: 0-49

  // Cultural authenticity highlight
  cultural: '#F472B6',     // pink, used for "specialty store" badges
  culturalSubtle: 'rgba(244, 114, 182, 0.12)',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Camera/scan overlay
  scanOverlay: 'rgba(10, 14, 20, 0.6)',
  scanFrame: '#3B82F6',
};

export const lightColors = {
  // Stub for future toggle — inverse of dark
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceElevated: '#FFFFFF',
  border: '#E5E7EB',
  borderSubtle: '#F3F4F6',
  textPrimary: '#0A0E14',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  primary: '#3B82F6',
  primarySubtle: 'rgba(59, 130, 246, 0.08)',
  scoreHigh: '#059669',
  scoreMid: '#D97706',
  scoreLow: '#DC2626',
  cultural: '#DB2777',
  culturalSubtle: 'rgba(219, 39, 119, 0.08)',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  scanOverlay: 'rgba(255, 255, 255, 0.6)',
  scanFrame: '#3B82F6',
};

export type ThemeColors = typeof darkColors;
