// Canonical theme token set. One theme drives BOTH the storefront and the admin
// panel — every colour in either app resolves from these tokens via CSS vars, so
// nothing is hard-coded. Values are hex; the apps convert to their own var format.
export interface ThemeTokens {
  key: string;
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

export const THEME_FIELDS: (keyof ThemeTokens)[] = [
  'primary', 'primaryLight', 'primaryDark',
  'secondary', 'secondaryLight', 'secondaryDark',
  'bg', 'surface', 'text', 'muted', 'border',
];

// Built-in themes. Admin can edit these or add more; the active one is applied
// across both apps.
export const PRESET_THEMES: ThemeTokens[] = [
  {
    key: 'indigo', name: 'Indigo (Default)',
    primary: '#4F46E5', primaryLight: '#818CF8', primaryDark: '#3730A3',
    secondary: '#EC4899', secondaryLight: '#F9A8D4', secondaryDark: '#BE185D',
    bg: '#F1F5F9', surface: '#FFFFFF', text: '#1E293B', muted: '#64748B', border: '#E2E8F0',
  },
  {
    key: 'rose-gold', name: 'Rose Gold',
    primary: '#C8A97E', primaryLight: '#D9BFA0', primaryDark: '#A8864A',
    secondary: '#D8A7B1', secondaryLight: '#E8C4CB', secondaryDark: '#B87D8A',
    bg: '#FFF9F5', surface: '#F5EFE8', text: '#1C1C1C', muted: '#6B6B6B', border: '#E8DDD4',
  },
  {
    key: 'emerald', name: 'Emerald',
    primary: '#059669', primaryLight: '#34D399', primaryDark: '#065F46',
    secondary: '#0EA5E9', secondaryLight: '#7DD3FC', secondaryDark: '#0369A1',
    bg: '#F0FDF4', surface: '#FFFFFF', text: '#14342B', muted: '#5B7C6F', border: '#D1FAE5',
  },
  {
    key: 'rose', name: 'Rose',
    primary: '#E11D48', primaryLight: '#FB7185', primaryDark: '#9F1239',
    secondary: '#F59E0B', secondaryLight: '#FCD34D', secondaryDark: '#B45309',
    bg: '#FFF1F2', surface: '#FFFFFF', text: '#3F1D2B', muted: '#8B5F6B', border: '#FFE4E6',
  },
  {
    key: 'amber', name: 'Amber',
    primary: '#D97706', primaryLight: '#FBBF24', primaryDark: '#92400E',
    secondary: '#65A30D', secondaryLight: '#A3E635', secondaryDark: '#3F6212',
    bg: '#FFFBEB', surface: '#FFFFFF', text: '#3B2F1A', muted: '#7C6A4D', border: '#FEF3C7',
  },
  {
    key: 'slate', name: 'Slate',
    primary: '#475569', primaryLight: '#94A3B8', primaryDark: '#1E293B',
    secondary: '#0EA5E9', secondaryLight: '#7DD3FC', secondaryDark: '#0369A1',
    bg: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A', muted: '#64748B', border: '#E2E8F0',
  },
  {
    key: 'ocean', name: 'Ocean Blue',
    primary: '#2563EB', primaryLight: '#60A5FA', primaryDark: '#1E40AF',
    secondary: '#06B6D4', secondaryLight: '#67E8F9', secondaryDark: '#0E7490',
    bg: '#F0F6FF', surface: '#FFFFFF', text: '#0F1E3D', muted: '#5B6B8C', border: '#DBE5F5',
  },
  {
    key: 'violet', name: 'Royal Violet',
    primary: '#7C3AED', primaryLight: '#A78BFA', primaryDark: '#5B21B6',
    secondary: '#DB2777', secondaryLight: '#F472B6', secondaryDark: '#9D174D',
    bg: '#F7F4FF', surface: '#FFFFFF', text: '#241A3D', muted: '#6B6285', border: '#E9E2F7',
  },
  {
    key: 'teal', name: 'Teal Mint',
    primary: '#0D9488', primaryLight: '#5EEAD4', primaryDark: '#115E59',
    secondary: '#F59E0B', secondaryLight: '#FCD34D', secondaryDark: '#B45309',
    bg: '#F0FDFA', surface: '#FFFFFF', text: '#0F2E2A', muted: '#5B7A75', border: '#CCFBF1',
  },
  {
    key: 'crimson', name: 'Crimson',
    primary: '#DC2626', primaryLight: '#F87171', primaryDark: '#991B1B',
    secondary: '#7C3AED', secondaryLight: '#A78BFA', secondaryDark: '#5B21B6',
    bg: '#FFF5F5', surface: '#FFFFFF', text: '#3B1717', muted: '#8B5B5B', border: '#FEE2E2',
  },
  {
    key: 'sunset', name: 'Sunset',
    primary: '#EA580C', primaryLight: '#FB923C', primaryDark: '#9A3412',
    secondary: '#E11D48', secondaryLight: '#FB7185', secondaryDark: '#9F1239',
    bg: '#FFF7ED', surface: '#FFFFFF', text: '#3B2414', muted: '#8A6A50', border: '#FFEAD5',
  },
  {
    key: 'forest', name: 'Forest',
    primary: '#16A34A', primaryLight: '#4ADE80', primaryDark: '#166534',
    secondary: '#CA8A04', secondaryLight: '#FACC15', secondaryDark: '#854D0E',
    bg: '#F3FBF4', surface: '#FFFFFF', text: '#14281A', muted: '#5B7A62', border: '#D4EEDA',
  },
  {
    key: 'midnight', name: 'Midnight',
    primary: '#6366F1', primaryLight: '#A5B4FC', primaryDark: '#4338CA',
    secondary: '#22D3EE', secondaryLight: '#67E8F9', secondaryDark: '#0891B2',
    bg: '#0F172A', surface: '#1E293B', text: '#E2E8F0', muted: '#94A3B8', border: '#334155',
  },
  {
    key: 'coral', name: 'Coral Pink',
    primary: '#F43F5E', primaryLight: '#FDA4AF', primaryDark: '#BE123C',
    secondary: '#8B5CF6', secondaryLight: '#C4B5FD', secondaryDark: '#6D28D9',
    bg: '#FFF1F3', surface: '#FFFFFF', text: '#3F1D28', muted: '#8B5F6A', border: '#FFE0E6',
  },
  {
    key: 'graphite', name: 'Graphite Mono',
    primary: '#18181B', primaryLight: '#52525B', primaryDark: '#000000',
    secondary: '#F59E0B', secondaryLight: '#FCD34D', secondaryDark: '#B45309',
    bg: '#FAFAFA', surface: '#FFFFFF', text: '#18181B', muted: '#71717A', border: '#E4E4E7',
  },
];
