/**
 * Design System V2: "The Ambient Interface"
 * Philosophy: Transparency, depth, and industrial minimalism.
 * Materials: BlurView, variable border opacity, haptic feedback.
 */

export const colors = {
  // Base
  background: '#FBFBF9', // Soft industrial neutral
  backgroundDark: '#1C1C1E',

  // Surface (Solid)
  surface: '#FFFFFF',

  // Glass (Translucent)
  glass: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(28, 28, 30, 0.7)',

  // Text
  text: '#1A1A1A',
  textSecondary: '#636366',
  textTertiary: '#8E8E93',
  textInverse: '#FFFFFF',

  // Borders
  border: 'rgba(0, 0, 0, 0.05)',
  borderMedium: 'rgba(0, 0, 0, 0.1)',
  borderStrong: '#1A1A1A',

  // Accents
  primary: '#0F4C3A', // Emerald
  action: '#FF3B30',  // International Orange
  accent: '#5856D6',  // Indigo for AI highlights

  // Status
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 64,
};

export const typography = {
  sizes: {
    xs: 12,
    s: 14,
    m: 16,
    l: 20,
    xl: 32,
    xxl: 48,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  }
};

export const layout = {
  radius: 12, // Softer but still architectural
  borderWidth: 1,
  blurIntensity: 30,
};
