// IronPlate Theme - Dark theme for athletes

export const COLORS = {
  // Primary
  primary: '#FF6B35',      // Energetic orange
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F66',

  // Secondary
  secondary: '#2D3436',    // Dark charcoal
  secondaryLight: '#636E72',

  // Accent
  accent: '#00B894',       // Success green
  accentDark: '#00A381',

  // Background
  background: '#1A1A2E',   // Deep navy
  surface: '#16213E',      // Card background
  surfaceLight: '#1F3460', // Elevated surface

  // Text
  text: '#FFFFFF',
  textSecondary: '#B2BEC3',
  textMuted: '#636E72',

  // Macros
  protein: '#E17055',      // Red-ish for protein
  carbs: '#FDCB6E',        // Yellow for carbs
  fat: '#A29BFE',          // Purple for fat
  calories: '#00CEC9',     // Cyan for calories

  // Status
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF6B6B',

  // Borders
  border: '#2D3436',
  borderLight: '#636E72',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
};
