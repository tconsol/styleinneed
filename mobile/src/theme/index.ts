export const colors = {
  primary: '#C8A97E',
  primaryDark: '#A8864A',
  primaryLight: '#EDD9BA',
  secondary: '#D8A7B1',
  bg: '#FFFFFF',
  surface: '#F4F4F5',
  surfaceWarm: '#FFF9F5',
  text: '#1C1C1E',
  textSecondary: '#282C3F',
  muted: '#8E8E93',
  mutedDark: '#696B79',
  border: '#E5E5EA',
  borderLight: '#F0F0F0',
  white: '#FFFFFF',
  danger: '#E50019',
  success: '#219653',
  successLight: '#EAF7EE',
  warning: '#F59E0B',
  gold: '#C8A97E',
  overlay: 'rgba(0,0,0,0.45)',
} as const;

export const fonts = {
  heading: 'PlayfairDisplay_600SemiBold',
  headingBold: 'PlayfairDisplay_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
} as const;

export const radii = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 999,
} as const;

export const gradients: [string, string][] = [
  ['#E9D8C4', '#D8A7B1'],
  ['#D8C3A5', '#C8A97E'],
  ['#EADCD0', '#C9A99B'],
  ['#D9C2B0', '#B89B86'],
  ['#E8D5C8', '#CBA98E'],
  ['#DCC9BC', '#B7967E'],
  ['#E6D2C0', '#D1A98D'],
  ['#D5BBA6', '#A8864A'],
];

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bottom: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
} as const;

export const theme = { colors, fonts, spacing, radii, gradients, shadow };
export type Theme = typeof theme;
